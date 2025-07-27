#!/usr/bin/env python3
"""
NetPulse - Multi-Target Network Monitor with Real ICMP Ping
Enhanced version of ISP Monitor for Docker containerization
Features: Multiple targets, real-time dashboard API, smart reporting, incident tracking
"""

import ping3
import time
import smtplib
import csv
import os
import json
import threading
import logging
import sys
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from collections import deque, defaultdict
from typing import Dict, List, Optional, Any
import sqlite3
import asyncio
import websockets
import signal
from pathlib import Path

class NetPulseMonitor:
    def __init__(self, config_file='/app/config/netpulse_config.json'):
        self.config_file = config_file
        self.load_config()
        self.setup_logging()
        self.setup_database()
        
        # Multi-target monitoring state
        self.targets: Dict[str, Dict] = {}
        self.monitoring_threads: Dict[str, threading.Thread] = {}
        self.is_running = False
        self.websocket_clients = set()
        
        # Initialize monitoring data for each target
        self.initialize_targets()
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
    def load_config(self):
        """Load configuration with multi-target support"""
        default_config = {
            "targets": [
                {
                    "name": "Primary ISP",
                    "ip": "139.167.129.22",
                    "description": "Main ISP connection",
                    "enabled": True
                },
                {
                    "name": "Google DNS",
                    "ip": "8.8.8.8", 
                    "description": "Google Public DNS",
                    "enabled": True
                },
                {
                    "name": "Cloudflare DNS",
                    "ip": "1.1.1.1",
                    "description": "Cloudflare Public DNS", 
                    "enabled": True
                }
            ],
            "monitoring": {
                "latency_threshold": 150,
                "check_interval": 2,
                "ping_timeout": 5,
                "max_data_points": 1000,
                "report_generation_interval": 3600  # 1 hour
            },
            "email": {
                "smtp_server": "smtp.gmail.com",
                "smtp_port": 587,
                "from_email": "mohammed.abdul@techolution.com",
                "to_email": "mohammed.abdul@techolution.com",
                "username": "mohammed.abdul@techolution.com", 
                "password": "vlzz kqqr mhfp wvui",
                "cooldown_seconds": 300,  # 5 minutes
                "send_alerts": True
            },
            "database": {
                "path": "/app/data/netpulse.db",
                "retention_days": 30
            },
            "api": {
                "websocket_port": 8765,
                "data_broadcast_interval": 1
            },
            "reports": {
                "daily_summary_time": "09:00",
                "incident_threshold_minutes": 5
            }
        }
        
        # Create config directory if it doesn't exist
        config_dir = os.path.dirname(self.config_file)
        if config_dir:
            os.makedirs(config_dir, exist_ok=True)
            
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    user_config = json.load(f)
                    self.merge_dicts(default_config, user_config)
            except Exception as e:
                print(f"Error loading config: {e}. Using defaults.")
        else:
            with open(self.config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
            print(f"Created default config file: {self.config_file}")
            
        self.config = default_config
        
    def merge_dicts(self, dict1, dict2):
        """Recursively merge dictionaries"""
        for key, value in dict2.items():
            if key in dict1 and isinstance(dict1[key], dict) and isinstance(value, dict):
                self.merge_dicts(dict1[key], value)
            else:
                dict1[key] = value
                
    def setup_logging(self):
        """Setup comprehensive logging"""
        log_dir = '/app/logs'
        os.makedirs(log_dir, exist_ok=True)
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] [%(name)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # Setup file handler
        file_handler = logging.FileHandler(
            f'{log_dir}/netpulse.log', 
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        
        # Setup console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        
        # Configure logger
        self.logger = logging.getLogger('NetPulse')
        self.logger.setLevel(logging.INFO)
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
        
    def setup_database(self):
        """Setup SQLite database for persistent storage"""
        db_dir = os.path.dirname(self.config['database']['path'])
        os.makedirs(db_dir, exist_ok=True)
        
        self.db_path = self.config['database']['path']
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS ping_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    target_name TEXT NOT NULL,
                    target_ip TEXT NOT NULL,
                    timestamp DATETIME NOT NULL,
                    latency REAL,
                    status TEXT NOT NULL,
                    packet_loss INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS incidents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    target_name TEXT NOT NULL,
                    target_ip TEXT NOT NULL,
                    start_time DATETIME NOT NULL,
                    end_time DATETIME,
                    duration_minutes REAL,
                    incident_type TEXT NOT NULL,
                    max_latency REAL,
                    packet_loss_count INTEGER DEFAULT 0,
                    resolved BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS daily_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    target_name TEXT NOT NULL,
                    report_date DATE NOT NULL,
                    total_checks INTEGER DEFAULT 0,
                    successful_checks INTEGER DEFAULT 0,
                    packet_loss_count INTEGER DEFAULT 0,
                    avg_latency REAL DEFAULT 0,
                    max_latency REAL DEFAULT 0,
                    min_latency REAL DEFAULT 0,
                    uptime_percentage REAL DEFAULT 0,
                    incidents_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(target_name, report_date)
                )
            ''')
            
            # Create indexes for better performance
            conn.execute('CREATE INDEX IF NOT EXISTS idx_ping_results_target_time ON ping_results(target_name, timestamp)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_incidents_target_time ON incidents(target_name, start_time)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_daily_reports_target_date ON daily_reports(target_name, report_date)')
            
            conn.commit()
            
    def initialize_targets(self):
        """Initialize monitoring data structures for each target"""
        for target_config in self.config['targets']:
            if not target_config.get('enabled', True):
                continue
                
            target_name = target_config['name']
            self.targets[target_name] = {
                'config': target_config,
                'consecutive_failures': 0,
                'total_checks': 0,
                'last_email_sent': {},
                'first_failure_time': None,
                'current_incident_id': None,
                'recent_data': deque(maxlen=self.config['monitoring']['max_data_points']),
                'status': 'unknown',
                'last_check': None,
                'avg_latency': 0,
                'packet_loss_rate': 0
            }
            
    def ping_target(self, target_ip: str, timeout: int = 5) -> Optional[float]:
        """Perform ICMP ping and return latency in ms"""
        try:
            latency = ping3.ping(target_ip, timeout=timeout)
            return latency * 1000 if latency else None
        except Exception as e:
            self.logger.error(f"Ping error for {target_ip}: {e}")
            return None
            
    def store_ping_result(self, target_name: str, target_ip: str, latency: Optional[float], status: str):
        """Store ping result in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                packet_loss = 1 if latency is None else 0
                conn.execute('''
                    INSERT INTO ping_results 
                    (target_name, target_ip, timestamp, latency, status, packet_loss)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (target_name, target_ip, datetime.now(), latency, status, packet_loss))
                conn.commit()
        except Exception as e:
            self.logger.error(f"Database error storing ping result: {e}")
            
    def start_incident(self, target_name: str, target_ip: str, incident_type: str) -> int:
        """Start tracking a new incident"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute('''
                    INSERT INTO incidents 
                    (target_name, target_ip, start_time, incident_type)
                    VALUES (?, ?, ?, ?)
                ''', (target_name, target_ip, datetime.now(), incident_type))
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            self.logger.error(f"Database error starting incident: {e}")
            return None
            
    def end_incident(self, incident_id: int, max_latency: float = None, packet_loss_count: int = 0):
        """End an incident and calculate duration"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                end_time = datetime.now()
                cursor = conn.execute('SELECT start_time FROM incidents WHERE id = ?', (incident_id,))
                row = cursor.fetchone()
                
                if row:
                    start_time = datetime.fromisoformat(row[0])
                    duration_minutes = (end_time - start_time).total_seconds() / 60
                    
                    conn.execute('''
                        UPDATE incidents 
                        SET end_time = ?, duration_minutes = ?, max_latency = ?, 
                            packet_loss_count = ?, resolved = 1
                        WHERE id = ?
                    ''', (end_time, duration_minutes, max_latency, packet_loss_count, incident_id))
                    conn.commit()
        except Exception as e:
            self.logger.error(f"Database error ending incident: {e}")
            
    def send_email_alert(self, target_name: str, subject: str, body: str):
        """Send email alert with cooldown"""
        if not self.config['email']['send_alerts']:
            return
            
        target_data = self.targets[target_name]
        email_key = f"{target_name}_{subject.split(':')[0]}"
        
        # Check cooldown
        last_sent = target_data['last_email_sent'].get(email_key)
        if last_sent:
            time_diff = (datetime.now() - last_sent).total_seconds()
            if time_diff < self.config['email']['cooldown_seconds']:
                return
                
        try:
            to_emails = [email.strip() for email in self.config['email']['to_email'].split(',')]
            
            msg = MIMEMultipart()
            msg['From'] = self.config['email']['from_email']
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = f"[NetPulse] {subject}"
            
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(self.config['email']['smtp_server'], self.config['email']['smtp_port'])
            server.starttls()
            server.login(self.config['email']['username'], self.config['email']['password'])
            server.sendmail(self.config['email']['from_email'], to_emails, msg.as_string())
            server.quit()
            
            target_data['last_email_sent'][email_key] = datetime.now()
            self.logger.info(f"Email alert sent for {target_name}: {subject}")
            
        except Exception as e:
            self.logger.error(f"Failed to send email alert: {e}")
            
    def monitor_target(self, target_name: str):
        """Monitor a single target continuously"""
        target_data = self.targets[target_name]
        target_config = target_data['config']
        
        self.logger.info(f"Started monitoring {target_name} ({target_config['ip']})")
        
        while self.is_running:
            try:
                # Perform ping
                latency = self.ping_target(target_config['ip'], self.config['monitoring']['ping_timeout'])
                target_data['total_checks'] += 1
                target_data['last_check'] = datetime.now()
                
                # Determine status and handle incidents
                if latency is None:
                    # Packet loss
                    status = "PACKET_LOSS"
                    if target_data['consecutive_failures'] == 0:
                        target_data['first_failure_time'] = datetime.now()
                        target_data['current_incident_id'] = self.start_incident(
                            target_name, target_config['ip'], "PACKET_LOSS"
                        )
                        
                    target_data['consecutive_failures'] += 1
                    target_data['status'] = 'down'
                    
                    # Send alert
                    self.send_email_alert(
                        target_name,
                        f"PACKET LOSS: {target_name}",
                        f"Packet loss detected at {target_config['ip']}\n"
                        f"Consecutive failures: {target_data['consecutive_failures']}\n"
                        f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                    )
                    
                elif latency > self.config['monitoring']['latency_threshold']:
                    # High latency
                    status = f"HIGH_LATENCY_{latency:.0f}ms"
                    if target_data['consecutive_failures'] == 0:
                        target_data['first_failure_time'] = datetime.now()
                        target_data['current_incident_id'] = self.start_incident(
                            target_name, target_config['ip'], "HIGH_LATENCY"
                        )
                        
                    target_data['consecutive_failures'] += 1
                    target_data['status'] = 'degraded'
                    
                    # Send alert
                    self.send_email_alert(
                        target_name,
                        f"HIGH LATENCY: {target_name}",
                        f"High latency detected at {target_config['ip']}\n"
                        f"Current latency: {latency:.0f}ms (threshold: {self.config['monitoring']['latency_threshold']}ms)\n"
                        f"Consecutive issues: {target_data['consecutive_failures']}\n"
                        f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                    )
                    
                else:
                    # Normal operation
                    status = f"OK_{latency:.0f}ms"
                    
                    # Check for recovery
                    if target_data['consecutive_failures'] > 0:
                        # End current incident
                        if target_data['current_incident_id']:
                            self.end_incident(target_data['current_incident_id'])
                            
                        # Send recovery alert
                        self.send_email_alert(
                            target_name,
                            f"RECOVERED: {target_name}",
                            f"Network connectivity restored at {target_config['ip']}\n"
                            f"Current latency: {latency:.0f}ms\n"
                            f"Previous issues: {target_data['consecutive_failures']}\n"
                            f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                        )
                        
                        target_data['consecutive_failures'] = 0
                        target_data['first_failure_time'] = None
                        target_data['current_incident_id'] = None
                        
                    target_data['status'] = 'up'
                    
                # Store result
                self.store_ping_result(target_name, target_config['ip'], latency, status)
                
                # Update recent data for dashboard
                data_point = {
                    'timestamp': datetime.now().isoformat(),
                    'latency': latency,
                    'status': status,
                    'consecutive_failures': target_data['consecutive_failures']
                }
                target_data['recent_data'].append(data_point)
                
                # Update averages
                recent_latencies = [d['latency'] for d in target_data['recent_data'] if d['latency'] is not None]
                if recent_latencies:
                    target_data['avg_latency'] = sum(recent_latencies) / len(recent_latencies)
                    
                packet_losses = [1 for d in target_data['recent_data'] if d['latency'] is None]
                target_data['packet_loss_rate'] = len(packet_losses) / len(target_data['recent_data']) * 100
                
                # Log result
                self.logger.info(f"[{target_name}] {status} (Check #{target_data['total_checks']})")
                
            except Exception as e:
                self.logger.error(f"Error monitoring {target_name}: {e}")
                
            time.sleep(self.config['monitoring']['check_interval'])
            
    async def websocket_handler(self, websocket, path):
        """Handle WebSocket connections for real-time dashboard updates"""
        self.websocket_clients.add(websocket)
        self.logger.info(f"WebSocket client connected. Total clients: {len(self.websocket_clients)}")
        
        try:
            await websocket.wait_closed()
        finally:
            self.websocket_clients.remove(websocket)
            self.logger.info(f"WebSocket client disconnected. Total clients: {len(self.websocket_clients)}")
            
    async def broadcast_data(self):
        """Broadcast real-time data to WebSocket clients"""
        while self.is_running:
            if self.websocket_clients:
                # Prepare data for all targets
                dashboard_data = {
                    'timestamp': datetime.now().isoformat(),
                    'targets': {}
                }
                
                for target_name, target_data in self.targets.items():
                    dashboard_data['targets'][target_name] = {
                        'name': target_name,
                        'ip': target_data['config']['ip'],
                        'status': target_data['status'],
                        'consecutive_failures': target_data['consecutive_failures'],
                        'total_checks': target_data['total_checks'],
                        'avg_latency': round(target_data['avg_latency'], 2),
                        'packet_loss_rate': round(target_data['packet_loss_rate'], 2),
                        'last_check': target_data['last_check'].isoformat() if target_data['last_check'] else None,
                        'recent_data': list(target_data['recent_data'])[-50:]  # Last 50 data points
                    }
                
                # Broadcast to all clients
                if self.websocket_clients:
                    disconnected_clients = set()
                    for client in self.websocket_clients:
                        try:
                            await client.send(json.dumps(dashboard_data))
                        except websockets.exceptions.ConnectionClosed:
                            disconnected_clients.add(client)
                        except Exception as e:
                            self.logger.error(f"Error broadcasting to client: {e}")
                            disconnected_clients.add(client)
                    
                    # Remove disconnected clients
                    self.websocket_clients -= disconnected_clients
                    
            await asyncio.sleep(self.config['api']['data_broadcast_interval'])
            
    def generate_daily_reports(self):
        """Generate daily reports for all targets"""
        try:
            report_date = datetime.now().date()
            
            for target_name in self.targets.keys():
                with sqlite3.connect(self.db_path) as conn:
                    # Get stats for today
                    cursor = conn.execute('''
                        SELECT 
                            COUNT(*) as total_checks,
                            COUNT(CASE WHEN latency IS NOT NULL THEN 1 END) as successful_checks,
                            COUNT(CASE WHEN packet_loss = 1 THEN 1 END) as packet_loss_count,
                            AVG(CASE WHEN latency IS NOT NULL THEN latency END) as avg_latency,
                            MAX(latency) as max_latency,
                            MIN(CASE WHEN latency IS NOT NULL THEN latency END) as min_latency
                        FROM ping_results 
                        WHERE target_name = ? AND DATE(timestamp) = ?
                    ''', (target_name, report_date))
                    
                    stats = cursor.fetchone()
                    
                    if stats and stats[0] > 0:  # total_checks > 0
                        total_checks, successful_checks, packet_loss_count, avg_latency, max_latency, min_latency = stats
                        uptime_percentage = (successful_checks / total_checks) * 100 if total_checks > 0 else 0
                        
                        # Count incidents for today
                        cursor = conn.execute('''
                            SELECT COUNT(*) FROM incidents 
                            WHERE target_name = ? AND DATE(start_time) = ?
                        ''', (target_name, report_date))
                        incidents_count = cursor.fetchone()[0]
                        
                        # Insert or update daily report
                        conn.execute('''
                            INSERT OR REPLACE INTO daily_reports 
                            (target_name, report_date, total_checks, successful_checks, 
                             packet_loss_count, avg_latency, max_latency, min_latency, 
                             uptime_percentage, incidents_count)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (target_name, report_date, total_checks, successful_checks,
                              packet_loss_count, avg_latency or 0, max_latency or 0, 
                              min_latency or 0, uptime_percentage, incidents_count))
                        
                    conn.commit()
                    
        except Exception as e:
            self.logger.error(f"Error generating daily reports: {e}")
            
    def cleanup_old_data(self):
        """Cleanup old data based on retention policy"""
        try:
            retention_date = datetime.now() - timedelta(days=self.config['database']['retention_days'])
            
            with sqlite3.connect(self.db_path) as conn:
                # Cleanup old ping results
                cursor = conn.execute('DELETE FROM ping_results WHERE timestamp < ?', (retention_date,))
                deleted_pings = cursor.rowcount
                
                # Cleanup old incidents
                cursor = conn.execute('DELETE FROM incidents WHERE start_time < ?', (retention_date,))
                deleted_incidents = cursor.rowcount
                
                # Cleanup old daily reports
                cursor = conn.execute('DELETE FROM daily_reports WHERE report_date < ?', (retention_date.date(),))
                deleted_reports = cursor.rowcount
                
                conn.commit()
                
                if deleted_pings > 0 or deleted_incidents > 0 or deleted_reports > 0:
                    self.logger.info(f"Cleaned up old data: {deleted_pings} ping results, {deleted_incidents} incidents, {deleted_reports} reports")
                    
        except Exception as e:
            self.logger.error(f"Error cleaning up old data: {e}")
            
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.stop_monitoring()
        
    def start_monitoring(self):
        """Start monitoring all targets"""
        self.is_running = True
        self.logger.info("Starting NetPulse Monitor...")
        
        # Start monitoring threads for each target
        for target_name in self.targets.keys():
            thread = threading.Thread(target=self.monitor_target, args=(target_name,), daemon=True)
            self.monitoring_threads[target_name] = thread
            thread.start()
            
        # Start WebSocket server
        async def start_websocket_server():
            server = await websockets.serve(
                self.websocket_handler,
                "0.0.0.0",
                self.config['api']['websocket_port']
            )
            self.logger.info(f"WebSocket server started on port {self.config['api']['websocket_port']}")
            
            # Start data broadcasting
            broadcast_task = asyncio.create_task(self.broadcast_data())
            
            await server.wait_closed()
            broadcast_task.cancel()
            
        # Run WebSocket server in event loop
        try:
            asyncio.run(start_websocket_server())
        except KeyboardInterrupt:
            self.logger.info("Monitoring stopped by user")
        except Exception as e:
            self.logger.error(f"Critical error: {e}")
        finally:
            self.stop_monitoring()
            
    def stop_monitoring(self):
        """Stop all monitoring"""
        self.is_running = False
        
        # Wait for threads to finish
        for thread in self.monitoring_threads.values():
            if thread.is_alive():
                thread.join(timeout=5)
                
        # Generate final reports
        self.generate_daily_reports()
        self.cleanup_old_data()
        
        self.logger.info("NetPulse Monitor stopped")
        
if __name__ == "__main__":
    print("🚀 NetPulse Monitor - Multi-Target Network Monitor")
    print("Features: Real ICMP ping, Multi-target support, Smart reporting, Real-time dashboard")
    print()
    
    # Check for required packages
    try:
        import ping3
        import websockets
        print("✅ All required packages available")
    except ImportError as e:
        print(f"❌ Missing package: {e}")
        print("Run: pip install ping3 websockets")
        sys.exit(1)
        
    monitor = NetPulseMonitor()
    monitor.start_monitoring()
