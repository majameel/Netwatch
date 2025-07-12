# Netwatch - A Network Monitoring Tool 🌐

A comprehensive, enterprise-grade network monitoring solution designed to detect packet loss, high latency, and connectivity issues with your ISP or any IP. Perfect for providing professional evidence to ISP support teams and maintaining 24/7 network visibility.

![Python](https://img.shields.io/badge/python-v3.7+-blue.svg)
![Platform](https://img.shields.io/badge/platform-linux%20%7C%20windows-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎯 Features

### Core Monitoring
- **Real-time packet loss detection** with 2-second intervals
- **High latency monitoring** with configurable thresholds
- **Automatic recovery detection** and notifications
- **Multiple email recipients** support
- **Professional evidence logging** in standard ping format

### Visual Analytics
- **Real-time graphs** showing latency trends and packet loss events
- **Interactive dashboards** with connection status timeline
- **Automated graph snapshots** for historical records
- **Statistical analysis** with success rates and averages

### Enterprise Features
- **24/7 cloud monitoring** with auto-restart capabilities
- **Automatic log rotation** to prevent disk space issues
- **Weekly summary reports** via email
- **Professional email alerts** perfect for ISP escalations
- **Multi-platform support** (Windows, Linux, cloud VMs)

## 🚀 Quick Start

### Prerequisites
```bash
# Python 3.7+ required
python3 --version

# Install required packages
pip3 install ping3 matplotlib pandas
```

### Basic Setup
```bash
# Clone repository
git clone https://github.com/yourusername/isp-network-monitor.git
cd isp-network-monitor

# Run with default configuration
python3 isp_monitor.py
```

### Cloud VM Setup (Recommended)
```bash
# Ubuntu/Debian setup
sudo apt update && sudo apt upgrade -y
sudo apt install python3 python3-pip -y
pip3 install ping3 matplotlib pandas

# Run as service
sudo systemctl enable isp-monitor.service
sudo systemctl start isp-monitor.service
```

## ⚙️ Configuration

### Basic Configuration (`isp_config.json`)
```json
{
  "target_ip": "139.167.129.22",
  "latency_threshold": 150,
  "check_interval": 2,
  "email": {
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587,
    "from_email": "your-email@domain.com",
    "to_email": "recipient1@domain.com,recipient2@domain.com",
    "username": "your-email@domain.com",
    "password": "your-app-password",
    "send_every_failure": true,
    "cooldown_seconds": 30
  },
  "graphs": {
    "enable_realtime": false,
    "save_graphs": true,
    "graph_window_hours": 2
  }
}
```

### Email Configuration
- **Gmail Setup**: Use App Passwords instead of regular passwords
- **Multiple Recipients**: Separate emails with commas
- **Cooldown**: Prevents email spam during extended outages

### Monitoring Targets
- **Primary ISP Gateway**: Your ISP's gateway IP
- **Public DNS**: 8.8.8.8, 1.1.1.1 for internet connectivity
- **Custom Servers**: Any IP address you want to monitor

## 📊 Usage Examples

### Monitor Your ISP Connection
```bash
# Basic ISP monitoring
python3 isp_monitor.py

# With custom target
python3 isp_monitor.py --target 192.168.1.1
```

### Generate Weekly Reports
```bash
# Manual weekly summary
./weekly_summary.sh

# Automated via cron
0 9 * * 0 /path/to/weekly_summary.sh
```

### Cloud Deployment
```bash
# Deploy on DigitalOcean/AWS/Azure
git clone https://github.com/yourusername/isp-network-monitor.git
cd isp-network-monitor
sudo ./setup.sh
```

## 📁 File Structure

```
isp-network-monitor/
├── isp_monitor.py              # Main monitoring script
├── isp_config.json             # Configuration file
├── setup.sh                    # Automated setup script
├── weekly_summary.sh           # Weekly report generator
├── check_isp_status.sh         # Status checker script
├── logs/
│   ├── packet_loss_log.csv     # Standard evidence logs
│   ├── detailed_monitor_log.csv # Detailed analytics data
│   └── isp_monitor.log         # Debug and status logs
├── graphs/
│   └── isp_monitor_graph_*.png # Automated graph snapshots
├── systemd/
│   └── isp-monitor.service     # Linux service configuration
└── docs/
    ├── SETUP.md               # Detailed setup guide
    ├── TROUBLESHOOTING.md     # Common issues and solutions
    └── CLOUD_DEPLOYMENT.md   # Cloud provider guides
```

## 🛠️ Installation Guide

### Windows Setup
```powershell
# Download and install Python 3.7+
# Download repository
git clone https://github.com/yourusername/isp-network-monitor.git
cd isp-network-monitor

# Install dependencies
pip install ping3 matplotlib pandas

# Run setup
.\setup.bat

# Start monitoring
python isp_monitor.py
```

### Linux Setup
```bash
# Clone repository
git clone https://github.com/yourusername/isp-network-monitor.git
cd isp-network-monitor

# Run automated setup
chmod +x setup.sh
sudo ./setup.sh

# Start as service
sudo systemctl start isp-monitor.service
sudo systemctl enable isp-monitor.service
```

### Docker Setup
```bash
# Build image
docker build -t isp-monitor .

# Run container
docker run -d --name isp-monitor \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/logs:/app/logs \
  isp-monitor
```

## 📈 Cloud Deployment

### Recommended Cloud Providers

| Provider | Plan | Cost/Month | Setup Time |
|----------|------|------------|------------|
| **DigitalOcean** | Basic Droplet | $4 | 5 minutes |
| **AWS EC2** | t2.micro | $8 (Free tier available) | 10 minutes |
| **Google Cloud** | e2-micro | $6 | 8 minutes |
| **Azure** | B1s | $7 | 12 minutes |

### One-Click Deployment
[![Deploy to DigitalOcean](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/yourusername/isp-network-monitor)

### Manual Cloud Setup
```bash
# Create VM with Ubuntu 20.04+
# SSH into VM
ssh user@your-vm-ip

# Run deployment script
curl -sSL https://raw.githubusercontent.com/yourusername/isp-network-monitor/main/deploy.sh | bash
```

## 📧 Email Alert Examples

### Packet Loss Alert
```
Subject: URGENT: Packet Loss at 139.167.129.22 - Failure #3

PACKET DROPS DETECTED AT 139.167.129.22

Detection Time: 2025-07-09 14:30:15
Consecutive Failures: 3 (Duration: 1.2 minutes)
Total Checks: 1,247

CURRENT STATUS:
Request to 139.167.129.22 timed out

LAST 5 RESULTS:
2025-07-09 14:29:45,Reply from 139.167.129.22: bytes=32 time=18ms TTL=119
2025-07-09 14:29:47,Reply from 139.167.129.22: bytes=32 time=22ms TTL=119
2025-07-09 14:29:49,Request to 139.167.129.22 timed out
2025-07-09 14:29:51,Request to 139.167.129.22 timed out
2025-07-09 14:29:53,Request to 139.167.129.22 timed out

---
Automated ISP Monitor Alert
Please investigate packet loss issues with your ISP
```

### Weekly Summary Report
```
Subject: ISP Monitor Weekly Summary

NETWORK PERFORMANCE SUMMARY (Week of July 1-7, 2025)

Overall Statistics:
✅ Uptime: 99.2%
📊 Total Checks: 302,400
⚠️ Packet Loss Events: 15
🐌 High Latency Events: 8
📈 Average Latency: 22.3ms

Daily Breakdown:
Monday: 99.8% uptime, 3 issues
Tuesday: 99.9% uptime, 1 issue
Wednesday: 97.2% uptime, 12 issues ⚠️
Thursday: 99.6% uptime, 2 issues
Friday: 99.9% uptime, 1 issue
Weekend: 100% uptime, 0 issues

Recommendations:
- Wednesday had significant issues (contact ISP)
- Overall performance is good
- Weekend connectivity excellent
```

## 🔧 Advanced Configuration

### Custom Monitoring Intervals
```json
{
  "check_interval": 1,        // Check every second (intensive)
  "check_interval": 5,        // Check every 5 seconds (balanced)
  "check_interval": 30        // Check every 30 seconds (light)
}
```

### Multiple Target Monitoring
```json
{
  "targets": [
    {"ip": "8.8.8.8", "name": "Google DNS"},
    {"ip": "1.1.1.1", "name": "Cloudflare DNS"},
    {"ip": "192.168.1.1", "name": "Local Gateway"}
  ]
}
```

### Custom Thresholds
```json
{
  "latency_threshold": 100,     // Alert if latency > 100ms
  "packet_loss_threshold": 5,   // Alert if >5% packet loss
  "consecutive_failures": 3     // Alert after 3 consecutive failures
}
```

## 📊 Monitoring Dashboard

### Real-time Graphs
- **Latency Timeline**: Shows latency trends over time
- **Packet Loss Events**: Red dots marking exact failure times
- **Connection Status**: Color-coded status timeline
- **Statistics Panel**: Live success rates and averages

### Historical Analysis
- **Daily Reports**: Automated daily performance summaries
- **Weekly Trends**: Identify patterns and recurring issues
- **Monthly Analytics**: Long-term performance tracking

## 🎯 Use Cases

### Home/Office Monitoring
- Monitor ISP performance and reliability
- Document connectivity issues for support tickets
- Track internet quality for remote work

### Business Applications
- SLA monitoring and enforcement
- Multi-location network monitoring
- Automated failover triggers
- Performance reporting for stakeholders

### ISP Support Evidence
- Professional ping logs in standard format
- Timestamped evidence of outages
- Historical performance data
- Automated incident documentation

## 🔒 Security Considerations

### Email Security
- Use app-specific passwords instead of account passwords
- Enable 2FA on email accounts
- Consider using dedicated monitoring email accounts

### Network Security
- Monitor from external cloud VMs for unbiased results
- Use HTTPS for web interfaces
- Implement IP allowlisting for sensitive deployments

### Data Privacy
- Logs contain only network performance data
- No personal information collected
- Local storage with optional cloud backup

## 🐛 Troubleshooting

### Common Issues

#### "Permission denied" on ping
```bash
# Fix ping permissions on Linux
sudo setcap cap_net_raw+ep $(which python3)
```

#### Email authentication fails
```bash
# Use app passwords instead of account passwords
# Enable "Less secure app access" or use OAuth2
```

#### High CPU usage
```bash
# Increase check intervals
"check_interval": 10  // Instead of 2 seconds
```

#### Disk space issues
```bash
# Enable log rotation
sudo logrotate -f /etc/logrotate.d/isp-monitor
```

### Debug Mode
```bash
# Run with debug logging
python3 isp_monitor.py --debug

# Check service logs
sudo journalctl -u isp-monitor.service -f

# Verify configuration
python3 -c "import json; print(json.load(open('isp_config.json')))"
```

## 📈 Performance Optimization

### Resource Usage
- **Memory**: ~50MB typical usage
- **CPU**: <1% on modern systems
- **Disk**: ~5MB per month (with rotation)
- **Network**: Minimal (ping packets only)

### Optimization Tips
```bash
# Reduce graph updates for lower CPU usage
"graph_update_interval": 30

# Limit data retention
"max_data_points": 100

# Disable graphs on headless servers
"enable_realtime": false
```

## 🤝 Contributing

### Development Setup
```bash
# Fork repository
git clone https://github.com/yourusername/isp-network-monitor.git
cd isp-network-monitor

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install development dependencies
pip install -r requirements-dev.txt

# Run tests
python -m pytest tests/
```

### Contribution Guidelines
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Coding Standards
- Follow PEP 8 style guidelines
- Add docstrings to all functions
- Include unit tests for new features
- Update documentation for changes

## 📋 Roadmap

### Version 2.0 (Planned)
- [ ] Web-based dashboard
- [ ] Mobile app notifications
- [ ] Multi-target monitoring
- [ ] Database storage options
- [ ] REST API for integrations
- [ ] Slack/Teams integration
- [ ] SMS alert support

### Version 2.1 (Future)
- [ ] Machine learning anomaly detection
- [ ] Predictive analysis
- [ ] Custom alerting rules
- [ ] Integration with monitoring platforms
- [ ] Advanced reporting features

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ping3 library** for reliable ICMP ping functionality
- **matplotlib** for excellent graphing capabilities
- **Community contributors** for testing and feedback
- **ISP support teams** for professional evidence format requirements

## 📞 Support

### Getting Help
- 📖 **Documentation**: Check the [docs/](docs/) directory
- 🐛 **Bug Reports**: Open an issue on GitHub
- 💬 **Discussions**: Use GitHub Discussions for questions
- 📧 **Contact**: [your-email@domain.com](mailto:your-email@domain.com)

### Professional Support
For enterprise deployments and custom implementations:
- 🏢 **Enterprise Support**: Available for large deployments
- 🔧 **Custom Development**: Tailored solutions available
- 📊 **Consulting**: Network monitoring strategy and implementation

---

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/isp-network-monitor&type=Date)](https://star-history.com/#yourusername/isp-network-monitor&Date)

---

**Made with ❤️ for reliable network monitoring**

*If this tool helped you resolve ISP issues or improve your network monitoring, please consider giving it a ⭐ star!*
