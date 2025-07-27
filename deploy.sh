#!/bin/bash

# NetPulse - Real-Time Network Monitor Setup Script
# Complete Docker containerized deployment

set -e

echo "🚀 NetPulse Network Monitor - Docker Deployment"
echo "=================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

print_status "Docker and Docker Compose are installed ✅"

# Create necessary directories
print_header "📁 Creating directory structure..."
mkdir -p data config logs
mkdir -p monitor api components src

print_status "Directory structure created"

# Check if configuration exists
if [ ! -f "config/netpulse_config.json" ]; then
    print_warning "Configuration file not found. Creating default configuration..."
    
    cat > config/netpulse_config.json << 'EOF'
{
  "targets": [
    {
      "name": "Google DNS",
      "ip": "8.8.8.8",
      "description": "Google Public DNS Primary",
      "enabled": true,
      "category": "DNS"
    },
    {
      "name": "Cloudflare DNS", 
      "ip": "1.1.1.1",
      "description": "Cloudflare Public DNS",
      "enabled": true,
      "category": "DNS"
    },
    {
      "name": "Local Gateway",
      "ip": "192.168.1.1",
      "description": "Local network gateway",
      "enabled": false,
      "category": "Local"
    }
  ],
  "monitoring": {
    "latency_threshold": 150,
    "check_interval": 2,
    "ping_timeout": 5,
    "max_data_points": 1000,
    "concurrent_monitoring": true
  },
  "email": {
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587,
    "from_email": "your-email@gmail.com",
    "to_email": "recipient@example.com",
    "username": "your-email@gmail.com",
    "password": "your-app-password",
    "cooldown_seconds": 300,
    "send_alerts": false
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
EOF
    
    print_warning "⚠️  Default configuration created at config/netpulse_config.json"
    print_warning "⚠️  Please edit this file to configure your targets and email settings"
    print_warning "⚠️  Set email.send_alerts to true and configure SMTP settings for alerts"
fi

# Check if we're in development or production mode
if [ "$1" = "--dev" ]; then
    print_header "🔧 Starting NetPulse in Development Mode..."
    COMPOSE_FILE="docker-compose.yml"
else
    print_header "🚀 Starting NetPulse in Production Mode..."
    COMPOSE_FILE="docker-compose.yml"
fi

# Stop any existing containers
print_status "Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Pull/build and start containers
print_header "🐳 Building and starting containers..."
print_status "This may take a few minutes on first run..."

# Build containers
docker-compose build --no-cache

# Start containers
docker-compose up -d

# Wait for containers to be healthy
print_status "Waiting for containers to start..."
sleep 10

# Check container status
print_header "📊 Container Status:"
docker-compose ps

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    print_status "Containers started successfully! ✅"
else
    print_error "Some containers failed to start ❌"
    print_error "Check logs with: docker-compose logs"
    exit 1
fi

# Display access information
print_header "🌐 Access Information:"
echo ""
echo "📊 React Dashboard:     http://localhost:3000"
echo "🔌 API Server:          http://localhost:3001"
echo "📡 WebSocket:           ws://localhost:8765"
echo "📋 API Health Check:    http://localhost:3001/health"
echo "🎯 Targets API:         http://localhost:3001/api/targets"
echo ""

# Display useful commands
print_header "📝 Useful Commands:"
echo ""
echo "View logs:              docker-compose logs -f"
echo "View monitor logs:      docker-compose logs -f netpulse-monitor"
echo "View API logs:          docker-compose logs -f netpulse-api"
echo "Stop containers:        docker-compose down"
echo "Restart containers:     docker-compose restart"
echo "Update containers:      docker-compose pull && docker-compose up -d"
echo ""

# Configuration reminder
if [ ! -s "config/netpulse_config.json" ] || grep -q "your-email@gmail.com" config/netpulse_config.json; then
    print_header "⚙️  Configuration Required:"
    echo ""
    print_warning "Please edit config/netpulse_config.json to:"
    echo "  1. Add your network targets (IP addresses to monitor)"
    echo "  2. Configure email settings for alerts"
    echo "  3. Adjust monitoring thresholds"
    echo ""
    echo "After configuration changes, restart with:"
    echo "  docker-compose restart"
    echo ""
fi

# Performance tips
print_header "💡 Performance Tips:"
echo ""
echo "• Monitor resource usage: docker stats"
echo "• Adjust check_interval in config for performance vs accuracy"
echo "• Use fewer targets for lower resource usage"
echo "• Check logs regularly: docker-compose logs -f"
echo ""

# Troubleshooting
print_header "🔧 Troubleshooting:"
echo ""
echo "If containers fail to start:"
echo "  1. Check Docker is running: docker version"
echo "  2. Check port conflicts: netstat -tlnp | grep -E ':(3000|3001|8765)'"
echo "  3. View detailed logs: docker-compose logs"
echo "  4. Restart Docker service"
echo ""
echo "For ICMP ping issues:"
echo "  • Ensure Docker has privileged access"
echo "  • Check firewall settings"
echo "  • Verify target IPs are reachable"
echo ""

print_status "🎉 NetPulse deployment completed!"
print_status "Visit http://localhost:3000 to access the dashboard"

# Optional: Open browser
if command -v xdg-open > /dev/null; then
    read -p "Open dashboard in browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open http://localhost:3000
    fi
elif command -v open > /dev/null; then
    read -p "Open dashboard in browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open http://localhost:3000
    fi
fi

print_status "Setup complete! 🚀"
