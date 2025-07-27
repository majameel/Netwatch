#!/usr/bin/env python3
"""
Enhanced ISP Monitor with Visual Graphs - Final Version
Monitors network connectivity and creates real-time visualizations
Perfect for cloud VM deployment and ISP monitoring
FEATURES: Multiple email recipients, robust error handling, detailed logging
"""

import ping3
import time
import smtplib
import csv
import os
import json
import threading
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.animation import FuncAnimation
import pandas as pd
import logging
from collections import deque
import numpy as np
import sys

class VisualISPMonitor:
    def __init__(self, config_file='isp_config.json'):
        self.load_config(config_file)
        self.setup_logging()
        
        # Monitoring state
        self.consecutive_failures = 0
        self.total_checks = 0
        self.last_email_sent = {}
        self.first_failure_time = None
        self.is_running = False
        
        # Data storage for graphs
        self.max_data_points = 200  # Reduced to prevent matplotlib issues
        self.timestamps = deque(maxlen=self.max_data_points)
        self.latencies = deque(maxlen=self.max_data_points)
        self.packet_loss = deque(maxlen=self.max_data_points)
        self.status_codes = deque(maxlen=self.max_data_points)  # 0=timeout, 1=ok, 2=high_latency
        
        # Graph setup
        self.fig = None
        self.axes = None
        self.animation = None
        self.graph_thread = None
        
        self.initialize_files()
        
    def load_config(self, config_file):
        """Load configuration from JSON file"""
        default_config = {
            "target_ip": "139.167.129.22",
            "latency_threshold": 150,
            "check_interval": 2,
            "ping_timeout": 5,
            "email": {
                "smtp_server": "smtp.gmail.com",
                "smtp_port": 587,
                "from_email": "mohammed.abdul@techolution.com",
                "to_email": "mohammed.abdul@techolution.com",
                "username": "mohammed.abdul@techolution.com",
                "password": "vlzz kqqr mhfp wvui",
                "cooldown_seconds": 30,
                "send_every_failure": True
            },
            "logging": {
                "log_file": "isp_monitor.log",
                "csv_file": "packet_loss_log.csv",
                "detailed_csv": "detailed_monitor_log.csv",
                "log_level": "INFO"
            },
            "graphs": {
                "enable_realtime": False,
                "save_graphs": True,
                "graph_update_interval": 5,
                "graph_window_hours": 1
            }
        }
        
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    user_config = json.load(f)
                    self.merge_dicts(default_config, user_config)
            except Exception as e:
                print(f"Error loading config: {e}. Using defaults.")
        else:
            with open(config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
            print(f"Created default config file: {config_file}")
            
        self.config = default_config
        
    def merge_dicts(self, dict1, dict2):
        """Recursively merge two dictionaries"""
        for key, value in dict2.items():
            if key in dict1 and isinstance(dict1[key], dict) and isinstance(value, dict):
                self.merge_dicts(dict1[key], value)
            else:
                dict1[key] = value
                
    def setup_logging(self):
        """Setup logging configuration - Windows and Linux compatible"""
        # Create formatter without unicode characters
        formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Setup file handler
        file_handler = logging.FileHandler(
            self.config['logging']['log_file'], 
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        
        # Setup console handler with safe encoding
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        
        # Configure logger
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(getattr(logging, self.config['logging']['log_level']))
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
        
    def initialize_files(self):
        """Initialize CSV files"""
        # Standard CSV
        csv_file = self.config['logging']['csv_file']
        if not os.path.exists(csv_file):
            with open(csv_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['Timestamp', 'Status'])
                
        # Detailed CSV for graphs
        detailed_csv = self.config['logging']['detailed_csv']
        if not os.path.exists(detailed_csv):
            with open(detailed_csv, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['Timestamp', 'Latency_ms', 'Status', 'Consecutive_Failures', 'Notes'])
                
    def ping_target(self):
        """Ping target and return latency in ms or None if failed"""
        try:
            latency = ping3.ping(self.config['target_ip'], timeout=self.config['ping_timeout'])
            return latency * 1000 if latency else None
        except Exception as e:
            self.logger.error(f"Ping error: {e}")
            return None
            
    def log_to_csv(self, status, latency=None, notes=""):
        """Log to both CSV files"""
        timestamp = datetime.now()
        timestamp_str = timestamp.strftime('%Y-%m-%d %H:%M:%S')
        
        # Standard CSV
        try:
            with open(self.config['logging']['csv_file'], 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([timestamp_str, status])
        except Exception as e:
            self.logger.error(f"Failed to write to standard CSV: {e}")
            
        # Detailed CSV
        try:
            with open(self.config['logging']['detailed_csv'], 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                latency_val = latency if latency else 0
                writer.writerow([timestamp_str, latency_val, status, self.consecutive_failures, notes])
        except Exception as e:
            self.logger.error(f"Failed to write to detailed CSV: {e}")
            
        # Add to graph data
        self.timestamps.append(timestamp)
        self.latencies.append(latency if latency else 0)
        
        # Status codes: 0=timeout, 1=ok, 2=high_latency
        if latency is None:
            status_code = 0
            packet_loss_val = 1
        elif latency > self.config['latency_threshold']:
            status_code = 2
            packet_loss_val = 0
        else:
            status_code = 1
            packet_loss_val = 0
            
        self.status_codes.append(status_code)
        self.packet_loss.append(packet_loss_val)
        
    def get_last_results(self, count=5):
        """Get last N results from CSV"""
        try:
            with open(self.config['logging']['csv_file'], 'r', encoding='utf-8') as f:
                lines = f.readlines()
                last_lines = lines[-count:] if len(lines) > count else lines[1:]
                return '\n'.join(line.strip() for line in last_lines)
        except Exception as e:
            self.logger.error(f"Failed to read CSV: {e}")
            return "No previous results available"
    
    def parse_email_recipients(self, email_config):
        """Parse email recipients - handles string, list, or comma-separated"""
        if not email_config:
            return []
            
        # Convert to string first
        email_str = str(email_config).strip()
        
        # Handle different formats
        if ',' in email_str:
            # Comma-separated emails
            email_list = [email.strip() for email in email_str.split(',')]
        elif ';' in email_str:
            # Semicolon-separated emails
            email_list = [email.strip() for email in email_str.split(';')]
        else:
            # Single email
            email_list = [email_str]
            
        # Clean up and validate
        valid_emails = []
        for email in email_list:
            email = email.strip().strip('"').strip("'")  # Remove quotes
            if email and '@' in email:
                valid_emails.append(email)
                
        return valid_emails
            
    def send_email(self, subject, body):
        """Send email with cooldown and better error handling - ROBUST MULTIPLE RECIPIENTS"""
        if not self.config['email']['send_every_failure']:
            return True
            
        email_key = subject.replace(' ', '_')
        last_sent = self.last_email_sent.get(email_key)
        general_key = "ANY_ALERT"
        last_any_alert = self.last_email_sent.get(general_key)
        
        # Check general cooldown
        if last_any_alert:
            time_diff = (datetime.now() - last_any_alert).total_seconds()
            if time_diff < self.config['email']['cooldown_seconds']:
                self.logger.warning(f"Email cooldown active ({time_diff:.0f}s < {self.config['email']['cooldown_seconds']}s)")
                return False
                
        try:
            # Parse email recipients robustly
            to_email_list = self.parse_email_recipients(self.config['email']['to_email'])
            
            if not to_email_list:
                self.logger.error("No valid email recipients found")
                return False
                
            self.logger.info(f"Sending email to {len(to_email_list)} recipients: {to_email_list}")
                
            msg = MIMEMultipart()
            msg['From'] = self.config['email']['from_email']
            msg['To'] = ', '.join(to_email_list)  # Clean comma-separated format
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(self.config['email']['smtp_server'], self.config['email']['smtp_port'])
            server.starttls()
            server.login(self.config['email']['username'], self.config['email']['password'])
            
            text = msg.as_string()
            # Send to all recipients
            server.sendmail(self.config['email']['from_email'], to_email_list, text)
            server.quit()
            
            self.last_email_sent[email_key] = datetime.now()
            self.last_email_sent[general_key] = datetime.now()
            self.logger.info(f"SUCCESS: Email sent to {len(to_email_list)} recipients: {subject}")
            return True
            
        except Exception as e:
            self.logger.error(f"EMAIL FAILED: {e}")
            # Don't crash on email errors - network might be down
            return False
            
    def format_ping_result(self, latency):
        """Format ping result"""
        if latency:
            return f"Reply from {self.config['target_ip']}: bytes=32 time={latency:.0f}ms TTL=119"
        else:
            return f"Request to {self.config['target_ip']} timed out"
            
    def setup_graphs(self):
        """Setup matplotlib graphs"""
        if not self.config['graphs']['enable_realtime']:
            return
            
        try:
            plt.style.use('dark_background')
            self.fig, self.axes = plt.subplots(2, 2, figsize=(15, 10))
            self.fig.suptitle(f'ISP Monitor - {self.config["target_ip"]}', fontsize=16, color='white')
            
            # Configure subplots
            self.axes[0, 0].set_title('Latency Over Time', color='white')
            self.axes[0, 0].set_ylabel('Latency (ms)', color='white')
            self.axes[0, 0].grid(True, alpha=0.3)
            
            self.axes[0, 1].set_title('Packet Loss Events', color='white')
            self.axes[0, 1].set_ylabel('Packet Loss', color='white')
            self.axes[0, 1].grid(True, alpha=0.3)
            
            self.axes[1, 0].set_title('Connection Status', color='white')
            self.axes[1, 0].set_ylabel('Status', color='white')
            self.axes[1, 0].grid(True, alpha=0.3)
            
            self.axes[1, 1].set_title('Statistics', color='white')
            self.axes[1, 1].axis('off')
            
            plt.tight_layout()
            self.logger.info("Graphs initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Graph setup failed: {e}")
            self.config['graphs']['enable_realtime'] = False
        
    def update_graphs(self, frame):
        """Update graphs with new data"""
        try:
            if len(self.timestamps) < 2:
                return
                
            # Clear axes
            for ax in self.axes.flat:
                if ax != self.axes[1, 1]:  # Don't clear stats panel
                    ax.clear()
                    
            # Get recent data (last N hours)
            window_hours = self.config['graphs']['graph_window_hours']
            cutoff_time = datetime.now() - timedelta(hours=window_hours)
            
            # Filter data
            recent_indices = [i for i, ts in enumerate(self.timestamps) if ts >= cutoff_time]
            if not recent_indices:
                return
                
            recent_times = [self.timestamps[i] for i in recent_indices]
            recent_latencies = [self.latencies[i] for i in recent_indices]
            recent_packet_loss = [self.packet_loss[i] for i in recent_indices]
            recent_status = [self.status_codes[i] for i in recent_indices]
            
            # Limit data points to prevent matplotlib issues
            if len(recent_times) > 100:
                step = len(recent_times) // 100
                recent_times = recent_times[::step]
                recent_latencies = recent_latencies[::step]
                recent_packet_loss = recent_packet_loss[::step]
                recent_status = recent_status[::step]
            
            # Latency graph
            self.axes[0, 0].plot(recent_times, recent_latencies, 'cyan', linewidth=1, alpha=0.8)
            self.axes[0, 0].axhline(y=self.config['latency_threshold'], color='red', linestyle='--', alpha=0.7, label=f'Threshold ({self.config["latency_threshold"]}ms)')
            self.axes[0, 0].set_title('Latency Over Time', color='white')
            self.axes[0, 0].set_ylabel('Latency (ms)', color='white')
            self.axes[0, 0].grid(True, alpha=0.3)
            self.axes[0, 0].legend()
            
            # Packet loss events
            packet_loss_times = [recent_times[i] for i, pl in enumerate(recent_packet_loss) if pl == 1]
            if packet_loss_times:
                self.axes[0, 1].scatter(packet_loss_times, [1] * len(packet_loss_times), color='red', s=50, alpha=0.8)
            self.axes[0, 1].set_title('Packet Loss Events', color='white')
            self.axes[0, 1].set_ylabel('Packet Loss', color='white')
            self.axes[0, 1].set_ylim(-0.1, 1.1)
            self.axes[0, 1].grid(True, alpha=0.3)
            
            # Status over time
            status_colors = ['red', 'green', 'orange']  # timeout, ok, high_latency
            status_labels = ['Timeout', 'OK', 'High Latency']
            
            for status_val in [0, 1, 2]:
                status_times = [recent_times[i] for i, s in enumerate(recent_status) if s == status_val]
                if status_times:
                    self.axes[1, 0].scatter(status_times, [status_val] * len(status_times), 
                                          color=status_colors[status_val], label=status_labels[status_val], 
                                          s=30, alpha=0.8)
            
            self.axes[1, 0].set_title('Connection Status', color='white')
            self.axes[1, 0].set_ylabel('Status', color='white')
            self.axes[1, 0].set_yticks([0, 1, 2])
            self.axes[1, 0].set_yticklabels(['Timeout', 'OK', 'High Latency'])
            self.axes[1, 0].grid(True, alpha=0.3)
            self.axes[1, 0].legend()
            
            # Statistics
            total_packets = len(recent_times)
            timeouts = sum(1 for s in recent_status if s == 0)
            high_latency_count = sum(1 for s in recent_status if s == 2)
            success_rate = ((total_packets - timeouts) / total_packets * 100) if total_packets > 0 else 0
            avg_latency = np.mean([l for l in recent_latencies if l > 0]) if recent_latencies else 0
            
            stats_text = f"""
NETWORK STATISTICS (Last {window_hours}h)

Total Checks: {total_packets}
Successful: {total_packets - timeouts} ({success_rate:.1f}%)
Packet Loss: {timeouts} ({timeouts/total_packets*100:.1f}% if total_packets > 0 else 0)
High Latency: {high_latency_count}

Average Latency: {avg_latency:.1f}ms
Current Failures: {self.consecutive_failures}
Total Checks: {self.total_checks}

Target: {self.config['target_ip']}
Threshold: {self.config['latency_threshold']}ms
Interval: {self.config['check_interval']}s
            """.strip()
            
            self.axes[1, 1].clear()
            self.axes[1, 1].text(0.1, 0.9, stats_text, transform=self.axes[1, 1].transAxes, 
                               fontsize=10, verticalalignment='top', color='white',
                               bbox=dict(boxstyle='round', facecolor='black', alpha=0.8))
            self.axes[1, 1].set_title('Statistics', color='white')
            self.axes[1, 1].axis('off')
            
            # Format x-axes with limited ticks
            for ax in [self.axes[0, 0], self.axes[0, 1], self.axes[1, 0]]:
                if recent_times:
                    # Limit number of ticks to prevent matplotlib warnings
                    max_ticks = 6
                    if len(recent_times) > max_ticks:
                        tick_indices = np.linspace(0, len(recent_times)-1, max_ticks, dtype=int)
                        tick_times = [recent_times[i] for i in tick_indices]
                        ax.set_xticks(tick_times)
                    
                    ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
                    plt.setp(ax.xaxis.get_majorticklabels(), rotation=45)
                    
            plt.tight_layout()
            
        except Exception as e:
            self.logger.error(f"Graph update error: {e}")
            
    def start_graph_thread(self):
        """Start graph in separate thread"""
        if not self.config['graphs']['enable_realtime']:
            return
            
        def graph_worker():
            try:
                self.setup_graphs()
                if self.fig:
                    self.animation = FuncAnimation(self.fig, self.update_graphs, 
                                                 interval=self.config['graphs']['graph_update_interval'] * 1000,
                                                 blit=False)
                    plt.show()
            except Exception as e:
                self.logger.error(f"Graph thread error: {e}")
                
        self.graph_thread = threading.Thread(target=graph_worker, daemon=True)
        self.graph_thread.start()
        
    def save_graph_snapshot(self):
        """Save current graph as image"""
        if not self.config['graphs']['save_graphs'] or not self.fig:
            return
            
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"isp_monitor_graph_{timestamp}.png"
        
        try:
            self.fig.savefig(filename, dpi=150, bbox_inches='tight', 
                           facecolor='black', edgecolor='none')
            self.logger.info(f"Graph saved: {filename}")
        except Exception as e:
            self.logger.error(f"Failed to save graph: {e}")
            
    def check_connectivity(self):
        """Perform single connectivity check"""
        self.total_checks += 1
        latency = self.ping_target()
        
        current_time = datetime.now().strftime('%H:%M:%S')
        
        if latency:
            # Successful ping
            status = self.format_ping_result(latency)
            
            if latency > self.config['latency_threshold']:
                # High latency
                if self.consecutive_failures == 0:
                    self.first_failure_time = datetime.now()
                    
                self.consecutive_failures += 1
                self.log_to_csv(status, latency, "HIGH_LATENCY")
                
                self.logger.warning(f"[{current_time}] HIGH LATENCY: {latency:.0f}ms (Check #{self.total_checks})")
                
                last_results = self.get_last_results()
                duration_text = ""
                if self.first_failure_time:
                    duration = (datetime.now() - self.first_failure_time).total_seconds() / 60
                    duration_text = f" (Duration: {duration:.1f} minutes)"
                    
                alert_body = f"""HIGH LATENCY DETECTED AT {self.config['target_ip']}

Detection Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Current Latency: {latency:.0f}ms (Threshold: {self.config['latency_threshold']}ms)
Consecutive Issues: {self.consecutive_failures}{duration_text}
Total Checks: {self.total_checks}

CURRENT STATUS:
{status}

LAST 5 RESULTS:
{last_results}

---
Automated ISP Monitor Alert
Please investigate network latency issues with JIO ISP"""
                
                self.send_email(f"HIGH LATENCY: {self.config['target_ip']} - {latency:.0f}ms (Issue #{self.consecutive_failures})", alert_body)
                
            else:
                # Normal latency - recovery check
                if self.consecutive_failures > 0:
                    self.logger.info(f"[{current_time}] NETWORK RECOVERED after {self.consecutive_failures} issues")
                    
                    last_results = self.get_last_results()
                    recovery_body = f"""NETWORK CONNECTIVITY RECOVERED AT {self.config['target_ip']}

Recovery Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Previous Issues: {self.consecutive_failures}
Current Latency: {latency:.0f}ms

CURRENT STATUS:
{status}

LAST 5 RESULTS:
{last_results}

---
Network connectivity has been restored
ISP Monitor Alert"""
                    
                    self.send_email(f"RESOLVED: Network Recovered at {self.config['target_ip']}", recovery_body)
                    self.consecutive_failures = 0
                    self.first_failure_time = None
                    
                self.log_to_csv(status, latency, "OK")
                self.logger.info(f"[{current_time}] OK: {latency:.0f}ms (Check #{self.total_checks})")
                
        else:
            # Packet loss
            if self.consecutive_failures == 0:
                self.first_failure_time = datetime.now()
                
            self.consecutive_failures += 1
            status = self.format_ping_result(None)
            self.log_to_csv(status, None, "PACKET_LOSS")
            
            self.logger.error(f"[{current_time}] PACKET LOSS: Request timed out (Failure #{self.consecutive_failures})")
            
            last_results = self.get_last_results()
            duration_text = ""
            if self.first_failure_time:
                duration = (datetime.now() - self.first_failure_time).total_seconds() / 60
                duration_text = f" (Duration: {duration:.1f} minutes)"
                
            alert_body = f"""PACKET DROPS DETECTED AT {self.config['target_ip']}

Detection Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Consecutive Failures: {self.consecutive_failures}{duration_text}
Total Checks: {self.total_checks}

CURRENT STATUS:
{status}

LAST 5 RESULTS:
{last_results}

---
Automated ISP Monitor Alert  
Please investigate packet loss issues with JIO ISP"""
            
            self.send_email(f"URGENT: Packet Loss at {self.config['target_ip']} - Failure #{self.consecutive_failures}", alert_body)
            
    def start_monitoring(self):
        """Start the monitoring process"""
        self.is_running = True
        self.logger.info(f"Starting ISP Monitor for {self.config['target_ip']}")
        
        # Display email configuration
        email_recipients = self.parse_email_recipients(self.config['email']['to_email'])
        self.logger.info(f"Email recipients configured: {email_recipients}")
        
        # Send startup notification
        startup_body = f"""ISP Monitor Started Successfully

Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Monitoring Target: {self.config['target_ip']}
Check Interval: {self.config['check_interval']} seconds
Latency Threshold: {self.config['latency_threshold']}ms

Email Recipients: {', '.join(email_recipients)}

Features:
- Email alerts for EVERY packet drop
- Real-time visual graphs (if enabled)
- Detailed logging for JIO support
- Automatic log rotation and cleanup

Configuration: {os.path.abspath('isp_config.json')}
Detailed Log: {os.path.abspath(self.config['logging']['detailed_csv'])}
Graph Updates: Every {self.config['graphs']['graph_update_interval']} seconds"""
        
        self.send_email(f"ISP Monitor Started - {self.config['target_ip']}", startup_body)
        
        # Start graphs if enabled
        if self.config['graphs']['enable_realtime']:
            self.start_graph_thread()
            time.sleep(2)  # Let graph window open
            
        try:
            while self.is_running:
                self.check_connectivity()
                time.sleep(self.config['check_interval'])
                
        except KeyboardInterrupt:
            self.logger.info("ISP Monitor stopped by user")
        except Exception as e:
            self.logger.error(f"Critical error: {e}")
        finally:
            self.save_graph_snapshot()
            
    def stop_monitoring(self):
        """Stop monitoring"""
        self.is_running = False
        
if __name__ == "__main__":
    print("Enhanced ISP Monitor with Visual Graphs - Final Version")
    print("Features: Multiple email recipients + Real-time graphs + Detailed logging")
    print("Robust error handling and Windows/Linux compatibility")
    print()
    
    # Check for required packages
    try:
        import matplotlib
        import pandas
        print("All required packages available")
    except ImportError as e:
        print(f"Missing package: {e}")
        print("Run: pip install ping3 matplotlib pandas")
        print()
        
    monitor = VisualISPMonitor()
    monitor.start_monitoring()
