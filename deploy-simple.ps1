# NetPulse Deployment Script for Windows PowerShell
# Automated deployment with health checks and validation

param(
    [switch]$Dev,
    [switch]$Clean,
    [switch]$Help
)

# Color output functions
function Write-Success { param($Text) Write-Host "[SUCCESS] $Text" -ForegroundColor Green }
function Write-Info { param($Text) Write-Host "[INFO] $Text" -ForegroundColor Cyan }
function Write-Warning { param($Text) Write-Host "[WARNING] $Text" -ForegroundColor Yellow }
function Write-Error { param($Text) Write-Host "[ERROR] $Text" -ForegroundColor Red }
function Write-Header { param($Text) Write-Host "`n[DEPLOY] $Text" -ForegroundColor Magenta }

if ($Help) {
    Write-Host @"
NetPulse - Real-Time Network Monitor Deployment

USAGE:
    .\deploy.ps1 [OPTIONS]

OPTIONS:
    -Dev     Deploy in development mode with source mounting
    -Clean   Clean deployment (remove existing containers and volumes)
    -Help    Show this help message

EXAMPLES:
    .\deploy.ps1                 # Standard production deployment
    .\deploy.ps1 -Dev           # Development mode
    .\deploy.ps1 -Clean         # Clean deployment
"@
    exit 0
}

Write-Header "NetPulse Deployment Starting"

# Check prerequisites
Write-Info "Checking prerequisites..."

# Check Docker
try {
    $dockerVersion = docker --version
    Write-Success "Docker found: $dockerVersion"
} catch {
    Write-Error "Docker not found. Please install Docker Desktop."
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker-compose --version
    Write-Success "Docker Compose found: $composeVersion"
} catch {
    Write-Error "Docker Compose not found. Please install Docker Compose."
    exit 1
}

# Check configuration file
if (!(Test-Path "config\netpulse_config.json")) {
    Write-Warning "Configuration file not found. Creating from template..."
    if (Test-Path "config\netpulse_config.json.example") {
        Copy-Item "config\netpulse_config.json.example" "config\netpulse_config.json"
        Write-Success "Configuration created from template"
    } else {
        Write-Error "No configuration template found. Please create config\netpulse_config.json"
        exit 1
    }
}

# Clean deployment if requested
if ($Clean) {
    Write-Info "Cleaning existing deployment..."
    docker-compose down -v --remove-orphans
    docker system prune -f
    Write-Success "Clean completed"
}

# Deploy based on mode
if ($Dev) {
    Write-Header "Development Deployment"
    Write-Info "Starting in development mode..."
    docker-compose up --build -d
} else {
    Write-Header "Production Deployment"
    Write-Info "Building containers..."
    docker-compose build
    
    Write-Info "Starting services..."
    docker-compose up -d
}

# Wait for services to start
Write-Info "Waiting for services to initialize..."
Start-Sleep -Seconds 10

# Health checks
Write-Header "Health Checks"

Write-Info "Checking container status..."
docker-compose ps

# Display final status
Write-Header "Deployment Complete"

Write-Success "Deployment finished!"
Write-Host @"

Access URLs:
   Dashboard:    http://localhost:3000
   API:          http://localhost:3001
   WebSocket:    ws://localhost:8765

Management Commands:
   View logs:    docker-compose logs -f
   Stop:         docker-compose down
   Restart:      docker-compose restart

"@ -ForegroundColor White

Write-Info "Check container status: docker-compose ps"
Write-Info "View logs: docker-compose logs"
