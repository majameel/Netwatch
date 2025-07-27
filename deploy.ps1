# NetPulse Deployment Script for Windows PowerShell
# Automated deployment with health checks and validation

param(
    [switch]$Dev,
    [switch]$Clean,
    [switch]$Help
)

# Color output functions
function Write-Success { param($Text) Write-Host "✅ $Text" -ForegroundColor Green }
function Write-Info { param($Text) Write-Host "🔵 $Text" -ForegroundColor Cyan }
function Write-Warning { param($Text) Write-Host "⚠️  $Text" -ForegroundColor Yellow }
function Write-Error { param($Text) Write-Host "❌ $Text" -ForegroundColor Red }
function Write-Header { param($Text) Write-Host "`n🚀 $Text" -ForegroundColor Magenta -BackgroundColor Black }

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

# Validate configuration
Write-Info "Validating configuration..."
try {
    $config = Get-Content "config\netpulse_config.json" | ConvertFrom-Json
    if ($config.targets.Count -eq 0) {
        Write-Warning "No targets configured. Please add targets to config\netpulse_config.json"
    } else {
        Write-Success "Configuration validated: $($config.targets.Count) targets configured"
    }
} catch {
    Write-Error "Invalid JSON in configuration file"
    exit 1
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
    Write-Info "Starting in development mode with source mounting..."
    
    # Build and start services
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
    
} else {
    Write-Header "Production Deployment"
    Write-Info "Building containers..."
    
    # Build all services
    docker-compose build
    
    Write-Info "Starting services..."
    docker-compose up -d
}

# Wait for services to start
Write-Info "Waiting for services to initialize..."
Start-Sleep -Seconds 10

# Health checks
Write-Header "Health Checks"

$healthChecks = @(
    @{ Name = "Python Monitor"; Command = "docker-compose ps netpulse-monitor"; Port = $null },
    @{ Name = "Node.js API"; Command = "docker-compose ps netpulse-api"; Port = 3001 },
    @{ Name = "React Frontend"; Command = "docker-compose ps netpulse-frontend"; Port = 3000 }
)

$allHealthy = $true

foreach ($check in $healthChecks) {
    Write-Info "Checking $($check.Name)..."
    
    try {
        $result = Invoke-Expression $check.Command
        if ($result -match "Up") {
            Write-Success "$($check.Name) is running"
            
            if ($check.Port) {
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:$($check.Port)" -TimeoutSec 5 -UseBasicParsing
                    Write-Success "$($check.Name) responding on port $($check.Port)"
                } catch {
                    Write-Warning "$($check.Name) container running but port $($check.Port) not responsive"
                }
            }
        } else {
            Write-Error "$($check.Name) is not running"
            $allHealthy = $false
        }
    } catch {
        Write-Error "Failed to check $($check.Name)"
        $allHealthy = $false
    }
}

# Show logs if any service is unhealthy
if (-not $allHealthy) {
    Write-Warning "Some services are unhealthy. Showing recent logs:"
    docker-compose logs --tail=20
}

# Display final status
Write-Header "Deployment Complete"

if ($allHealthy) {
    Write-Success "All services are healthy!"
    Write-Host @"

🌐 Access URLs:
   Dashboard:    http://localhost:3000
   API:          http://localhost:3001
   WebSocket:    ws://localhost:8765

📊 Management Commands:
   View logs:    docker-compose logs -f
   Stop:         docker-compose down
   Restart:      docker-compose restart
   Update:       docker-compose pull && docker-compose up -d

📚 Documentation: README.md
"@ -ForegroundColor White
} else {
    Write-Error "Deployment completed with issues. Check the logs above."
    Write-Info "Troubleshooting: docker-compose logs"
}

Write-Info "Deployment script finished"
