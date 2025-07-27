# 🌐 NetPulse - Real-time Network Monitor

![NetPulse](https://img.shields.io/badge/NetPulse-Network%20Monitor-blue)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

> **A powerful, containerized network monitoring tool that provides real-time network analysis with AI-powered insights.**

NetPulse is a modern web-based network monitoring application that continuously monitors multiple IP addresses and domains, providing instant alerts when issues are detected. With integrated AI analysis powered by Google Gemini, it offers intelligent insights into network problems.

## ✨ Key Features

- **🎯 Real-time Network Monitoring** - Continuous ping monitoring with customizable intervals
- **🚨 Intelligent Alerts** - AI-powered analysis of network issues using Google Gemini
- **📊 Visual Dashboard** - Real-time charts and graphs showing network performance
- **🔔 Multi-channel Notifications** - Slack and email webhook integrations
- **📈 Historical Reporting** - Detailed performance history and trends
- **🐳 Docker Ready** - Fully containerized with production-ready deployment
- **🌙 Dark/Light Theme** - Modern, responsive UI with theme switching
- **📁 Data Export** - Export monitoring data to CSV format

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed on your system
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Download Project Files
Create a new directory and download all project files:

```bash
mkdir netpulse && cd netpulse
# Download all the files provided (see file list below)
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your Gemini API key
nano .env  # or use your preferred editor
```

Add your Gemini API key to the `.env` file:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Launch Application
```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f netpulse

# Check container status
docker-compose ps
```

### 4. Access NetPulse
Open your browser and navigate to: `http://localhost:8080`

## 📁 Required Files

Make sure you have all these files in your project directory:

**Docker & Configuration:**
- `Dockerfile` - Multi-stage Docker build configuration
- `docker-compose.yml` - Container orchestration
- `nginx.conf` - Web server configuration
- `entrypoint.sh` - Container startup script
- `.env.example` - Environment template
- `.gitignore` - Git ignore rules
- `.dockerignore` - Docker ignore rules

**Application Files** (from your existing project):
- `package.json` - Node.js dependencies
- `vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript configuration
- `index.html` - HTML entry point
- `index.tsx` - React entry point
- `App.tsx` - Main application component
- `types.ts` - TypeScript definitions
- All component files in `/components` directory
- All service files in `/services` directory

## 🔧 Alternative Installation Methods

### Manual Installation (Development)

```bash
# Clone or download project files
cd netpulse

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local

# Start development server
npm run dev
```

### Production Build (Without Docker)

```bash
# Build for production
npm run build

# Serve with a web server
npm install -g serve
serve -s dist -l 8080
```

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Your Google Gemini API key for AI analysis |
| `SLACK_WEBHOOK_URL` | No | Slack webhook for notifications |
| `EMAIL_WEBHOOK_URL` | No | Email webhook endpoint |
| `PORT` | No | Application port (default: 8080) |

### Application Settings

Once the application is running, you can configure:

- **Monitoring Thresholds** - Set latency and packet loss limits
- **Alert Intervals** - Customize ping intervals per target
- **Notification Preferences** - Configure sound alerts and themes
- **Webhook URLs** - Set up Slack and email notifications

## 📊 Using NetPulse

### Adding Monitoring Targets

1. Click "Add Target" in the dashboard
2. Enter target name and IP address/domain
3. Set custom thresholds (optional)
4. Click "Add Target" to start monitoring

### Setting Up Alerts

NetPulse supports multiple notification channels:

**Slack Notifications:**
1. Create a Slack app at [api.slack.com](https://api.slack.com/apps)
2. Enable "Incoming Webhooks"
3. Copy the webhook URL to NetPulse settings

**Email Notifications:**
- Requires a custom webhook service (see `HELP.md` for detailed setup)

### Viewing Reports

The Reports section provides:
- Historical performance charts
- Alert timeline
- Export capabilities for all data
- Network performance analytics

## 🐳 Docker Commands Reference

### Basic Operations
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f netpulse

# Restart services
docker-compose restart

# Update and rebuild
docker-compose build --no-cache
docker-compose up -d
```

### Maintenance
```bash
# Enter container shell
docker-compose exec netpulse sh

# View container stats
docker stats netpulse-monitor

# Backup application data
docker cp netpulse-monitor:/usr/share/nginx/html ./backup/
```

### Production Deployment
```bash
# Production with optimizations
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# With reverse proxy and SSL
docker-compose --profile proxy up -d
```

## 🔍 Troubleshooting

### Container Issues

**Container won't start:**
```bash
# Check if port 8080 is available
netstat -an | grep 8080

# Check Docker logs
docker-compose logs netpulse

# Verify environment variables
docker-compose exec netpulse env | grep GEMINI
```

**Gemini AI not working:**
- Verify API key is correct in `.env` file
- Check API quota in Google AI Studio
- Review browser console for errors

**Network monitoring issues:**
- Ensure targets are reachable from container
- Check Docker network configuration
- Verify DNS resolution

### Performance Optimization

- Limit concurrent targets (recommended: < 50)
- Adjust ping intervals based on requirements
- Monitor container resource usage
- Use production Docker compose for better performance

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Documentation:** Check `HELP.md` for detailed setup guides
- **Issues:** Report bugs and request features via GitHub Issues
- **Wiki:** Visit the project wiki for advanced configuration examples

---

**Made with ❤️ for network administrators and DevOps professionals.**