# NetPulse - Real-time Network Monitor 📊

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://hub.docker.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)

**A modern, AI-powered network monitoring tool that tracks latency, packet loss, and provides intelligent alerts with detailed analysis.**

[Demo](https://netpulse-demo.example.com) • [Documentation](./docs/) • [Contributing](./CONTRIBUTING.md) • [Changelog](./CHANGELOG.md)

</div>

---

## ✨ Features

### 🎯 Core Monitoring
- **Real-time Ping Monitoring** - Continuously monitor multiple IP addresses and domains
- **Latency Tracking** - Measure and visualize network response times
- **Packet Loss Detection** - Monitor connection reliability and detect network issues
- **Multi-Target Support** - Monitor unlimited network targets simultaneously

### 🤖 AI-Powered Intelligence
- **Gemini AI Analysis** - Get intelligent insights into network issues
- **Automated Problem Detection** - AI identifies patterns and potential causes
- **Smart Recommendations** - Receive actionable suggestions for network optimization

### 📊 Advanced Dashboard
- **Interactive Charts** - Visualize network performance with real-time graphs
- **Historical Data** - Track network performance trends over time
- **Live Logs** - Monitor ping results in real-time
- **Custom Thresholds** - Set personalized alerts for latency and packet loss

### 🔔 Alert System
- **Multiple Notification Channels** - Slack, email, and webhook integrations
- **Sound Alerts** - Audio notifications for immediate issue awareness
- **Detailed Reports** - Comprehensive alert information with context

### 🎨 Modern Interface
- **Dark/Light Mode** - Choose your preferred theme
- **Responsive Design** - Works perfectly on desktop and mobile
- **Intuitive UX** - Easy-to-use interface for all skill levels

---

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/netpulse.git
   cd netpulse
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env file with your Gemini API key (optional)
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access NetPulse**
   Open your browser and navigate to `http://localhost:8080`

### Manual Installation

1. **Prerequisites**
   - Node.js 18+ and npm
   - Modern web browser

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Add your Gemini API key for AI features (optional)
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm run preview
   ```

---

## 📖 Usage Guide

### Adding Network Targets

1. Click the **"Add Target"** button
2. Enter target details:
   - **Name**: Friendly name for the target
   - **Address**: IP address or domain name
   - **Latency Threshold**: Alert threshold in milliseconds
   - **Packet Loss Threshold**: Alert threshold as percentage
   - **Ping Interval**: How often to check (seconds)

### Setting Up Alerts

#### Slack Integration
1. Create a Slack app and incoming webhook
2. Copy the webhook URL to NetPulse settings
3. Test the connection

#### Email Integration
1. Set up a webhook endpoint that sends emails
2. Configure the webhook URL in NetPulse settings
3. Test the integration

### Monitoring Dashboard

- **Status Cards**: Quick overview of all targets
- **Performance Charts**: Visual representation of network health
- **Live Logs**: Real-time ping results
- **Alert History**: Track all network events

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Gemini AI Configuration (Optional)
GEMINI_API_KEY=your_gemini_api_key_here

# Application Settings
NODE_ENV=production
PORT=8080

# Webhook URLs (Optional)
SLACK_WEBHOOK_URL=your_slack_webhook_url
EMAIL_WEBHOOK_URL=your_email_webhook_url
```

### Application Settings

Access settings through the UI to configure:

- **Default thresholds** for latency and packet loss
- **Notification preferences** and webhook URLs
- **Theme selection** (dark/light mode)
- **Sound alerts** enable/disable
- **Ping intervals** for all targets

---

## 🐳 Docker Deployment

### Production Deployment

```bash
# Build and run
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# With reverse proxy
docker-compose --profile proxy up -d
```

### Custom Configuration

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  netpulse:
    environment:
      - GEMINI_API_KEY=your_api_key
      - CUSTOM_SETTING=value
    ports:
      - "3000:80"  # Custom port mapping
```

### Health Checks

The application includes built-in health checks:
- HTTP endpoint: `GET /health`
- Docker health check configured
- Automatic restart on failure

---

## 🛠️ Development

### Project Structure

```
netpulse/
├── src/
│   ├── components/          # React components
│   ├── services/           # API and utility services  
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript definitions
│   └── utils/              # Helper functions
├── public/                 # Static assets
├── docs/                   # Documentation
├── docker/                 # Docker configuration
└── tests/                  # Test files
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking

# Docker
docker-compose up    # Start with Docker
docker build .       # Build Docker image
```

### Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📊 Screenshots

<div align="center">

### Dashboard Overview
![Dashboard](./docs/images/dashboard.png)

### Network Monitoring
![Monitoring](./docs/images/monitoring.png)

### Alert System
![Alerts](./docs/images/alerts.png)

</div>

---

## 🔧 Technical Details

### Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI Components**: Custom components with Tailwind CSS
- **Charts**: Recharts for data visualization
- **AI Integration**: Google Gemini API
- **Build Tool**: Vite with TypeScript
- **Containerization**: Docker with multi-stage builds

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │  Ping Service    │    │  Network Target │
│                 │────│                  │────│                 │
│ - Dashboard     │    │ - ICMP Ping      │    │ - IP/Domain     │
│ - Alert System  │    │ - Latency Track  │    │ - Response Time │
│ - Settings      │    │ - Packet Loss    │    │ - Availability  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Gemini AI     │    │  Local Storage   │    │   Webhooks      │
│                 │    │                  │    │                 │
│ - Analysis      │    │ - Settings       │    │ - Slack         │
│ - Insights      │    │ - History        │    │ - Email         │
│ - Suggestions   │    │ - Targets        │    │ - Custom        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 📚 API Reference

### Local Storage Schema

```typescript
interface Settings {
  defaultLatencyThreshold: number;
  defaultPacketLossThreshold: number;
  emailWebhookUrl: string;
  slackWebhookUrl: string;
  isGeminiEnabled: boolean;
  theme: 'light' | 'dark';
  isSoundEnabled: boolean;
  defaultPingInterval: number;
}

interface Target {
  id: string;
  name: string;
  address: string;
  status: {
    latency: number | null;
    packetLoss: number;
  };
  isMonitoring: boolean;
  history: PingResult[];
  totalChecks: number;
  consecutiveFailures: number;
  latencyThreshold?: number;
  packetLossThreshold?: number;
  pingInterval?: number;
}
```

---

## 🚨 Troubleshooting

### Common Issues

**Application won't start**
```bash
# Check Docker logs
docker-compose logs netpulse

# Verify port availability
netstat -an | grep 8080
```

**No AI analysis**
- Verify `GEMINI_API_KEY` is set correctly
- Check API key permissions
- Review browser console for errors

**Webhook notifications not working**
- Test webhook URLs manually
- Check network connectivity
- Verify webhook payload format

**Performance issues**
- Reduce ping intervals
- Limit number of monitored targets
- Check system resources

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Environment variable
DEBUG=netpulse:*

# Or in .env file
DEBUG_MODE=true
```

---

## 🤝 Contributing

We love contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) to get started.

### Ways to Contribute

- 🐛 **Bug Reports**: Found a bug? Let us know!
- 💡 **Feature Requests**: Have an idea? We'd love to hear it!
- 📖 **Documentation**: Help improve our docs
- 🔧 **Code**: Submit pull requests for bug fixes or new features
- 🎨 **Design**: Improve the user interface and experience

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Make your changes
5. Test your changes
6. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini** - AI-powered network analysis
- **Recharts** - Beautiful charting library
- **React Community** - Amazing ecosystem and tools
- **Docker** - Containerization made simple
- **Contributors** - Thank you for your contributions!

---

## 📞 Support

- 📧 **Email**: support@netpulse.dev
- 💬 **Discord**: [Join our community](https://discord.gg/netpulse)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/netpulse/issues)
- 📖 **Documentation**: [Full Documentation](./docs/)

---

<div align="center">

**⭐ If you find NetPulse useful, please consider giving it a star on GitHub! ⭐**

Made with ❤️ for the network monitoring community

</div>