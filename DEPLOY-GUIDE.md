# 🚀 NetPulse Deployment Guide

## Step-by-Step Setup Instructions

### Phase 1: Download and Organize Files

**1. Create Project Directory**
```bash
mkdir netpulse-app
cd netpulse-app
```

**2. Download All Required Files**

You need to download these files (all provided in the previous conversation):

**📁 Docker & Configuration Files** (newly created):
- `Dockerfile` - Container build configuration
- `docker-compose.yml` - Container orchestration
- `nginx.conf` - Web server configuration  
- `entrypoint.sh` - Container startup script
- `.env.example` - Environment template
- `.gitignore` - Git ignore rules
- `.dockerignore` - Docker ignore rules
- `README-new.md` - Comprehensive documentation
- `setup.sh` - Automated setup script

**📁 Application Files** (your existing code):
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript configuration
- `index.html` - HTML entry point
- `index.tsx` - React DOM entry point
- `App.tsx` - Main application component
- `types.ts` - TypeScript type definitions
- `metadata.json` - Project metadata
- `HELP.md` - Webhook setup guide

**3. Make Setup Script Executable**
```bash
chmod +x setup.sh
```

### Phase 2: Prerequisites Check

**1. Install Docker & Docker Compose**

*Ubuntu/Debian:*
```bash
# Update package database
sudo apt update

# Install Docker
sudo apt install docker.io docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (logout/login required)
sudo usermod -aG docker $USER
```

*macOS:*
```bash
# Install Docker Desktop
brew install --cask docker

# Or download from: https://docker.com/products/docker-desktop
```

*Windows:*
- Download Docker Desktop from https://docker.com/products/docker-desktop
- Follow installation wizard
- Restart computer if required

**2. Get Gemini API Key**
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the generated key (keep it safe!)

### Phase 3: Quick Setup (Automated)

**1. Run Setup Script**
```bash
./setup.sh
```

The script will:
- ✅ Check Docker installation
- ✅ Create .env file from template
- ✅ Prompt for API key configuration
- ✅ Build and start containers
- ✅ Verify deployment
- ✅ Open application in browser

### Phase 4: Manual Setup (Alternative)

If you prefer manual setup or the script fails:

**1. Configure Environment**
```bash
# Copy environment template
cp .env.example .env

# Edit with your preferred editor
nano .env  # or vim, code, etc.
```

**2. Add Your API Key to .env**
```env
GEMINI_API_KEY=your_actual_api_key_here
```

**3. Build and Deploy**
```bash
# Build containers
docker-compose build

# Start in background
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f netpulse
```

**4. Access Application**
Open browser to: `http://localhost:8080`

### Phase 5: Verification & Testing

**1. Check Container Health**
```bash
# Container status
docker-compose ps

# Should show "Up" and "healthy"
```

**2. Test Application Features**
- ✅ Dashboard loads successfully
- ✅ Add a test monitoring target (e.g., google.com)
- ✅ Verify real-time ping results appear
- ✅ Check that alerts trigger correctly
- ✅ Test theme switching (dark/light)

**3. Test API Integration**
- ✅ Add a target that will fail (e.g., 192.168.999.999)
- ✅ Verify alert appears with Gemini analysis
- ✅ If no analysis appears, check API key configuration

### Phase 6: Production Configuration

**1. Security Hardening**
```bash
# Use production compose file
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**2. Setup Reverse Proxy (Optional)**
```bash
# Enable SSL proxy profile
docker-compose --profile proxy up -d
```

**3. Configure Monitoring**
```bash
# View resource usage
docker stats netpulse-monitor

# Set up log rotation
docker-compose logs --tail=1000 netpulse > netpulse.log
```

### Phase 7: Webhook Configuration (Optional)

**For Slack Alerts:**
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create new app → "From scratch"
3. Enable "Incoming Webhooks"
4. Add webhook for your channel
5. Copy URL to NetPulse settings

**For Email Alerts:**
- See detailed setup in `HELP.md`
- Requires custom webhook service
- Use Gmail App Passwords for security

### Phase 8: Maintenance & Updates

**Daily Operations:**
```bash
# View logs
docker-compose logs -f netpulse

# Restart if needed
docker-compose restart netpulse

# Check health
curl http://localhost:8080/health
```

**Updates:**
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

**Backup:**
```bash
# Backup configuration
tar -czf netpulse-backup.tar.gz .env docker-compose.yml

# Backup application data
docker cp netpulse-monitor:/usr/share/nginx/html ./data-backup/
```

## 🔧 Troubleshooting Common Issues

### Issue: Container Won't Start
```bash
# Check port availability
netstat -an | grep 8080

# Check Docker service
sudo systemctl status docker

# View detailed logs
docker-compose logs netpulse
```

### Issue: Gemini AI Not Working
```bash
# Verify API key in container
docker-compose exec netpulse env | grep GEMINI

# Check API key validity at: https://aistudio.google.com/app/apikey
# Ensure billing is enabled if required
```

### Issue: Network Monitoring Not Working
```bash
# Test network from container
docker-compose exec netpulse ping google.com

# Check firewall settings
sudo ufw status

# Verify DNS resolution
docker-compose exec netpulse nslookup google.com
```

### Issue: Performance Problems
```bash
# Check resource usage
docker stats

# Reduce ping intervals in settings
# Limit number of concurrent targets (<50 recommended)

# Use production configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🎯 Next Steps

1. **✅ Complete Initial Setup** - Follow all phases above
2. **🔗 Setup Webhooks** - Configure Slack/email notifications
3. **📊 Add Monitoring Targets** - Start monitoring your infrastructure
4. **🚀 Deploy to Production** - Use production configuration
5. **📱 Setup Mobile Alerts** - Configure push notifications via webhooks
6. **📈 Monitor Performance** - Review reports and optimize settings

## 🆘 Getting Help

**Documentation:**
- `README-new.md` - Complete feature documentation
- `HELP.md` - Webhook setup guide

**Logs:**
```bash
# Application logs
docker-compose logs netpulse

# System logs
sudo journalctl -u docker

# Container inspection
docker inspect netpulse-monitor
```

**Support:**
- Check Docker status: `docker ps`
- Verify network: `docker network ls`
- Test connectivity: `curl -f http://localhost:8080/health`

---

🎉 **Congratulations!** You now have a fully containerized NetPulse monitoring system ready for production use!