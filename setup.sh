#!/bin/bash

# NetPulse Setup Script
# This script helps you set up NetPulse quickly

set -e

echo "🌐 NetPulse Container Setup Script"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Check if .env file exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 Creating .env file from template..."
        cp .env.example .env
        echo "⚠️  Please edit .env file and add your GEMINI_API_KEY"
        echo "   Get your API key from: https://aistudio.google.com/app/apikey"
        
        # Try to open the file in the default editor
        if command -v nano &> /dev/null; then
            read -p "Would you like to edit the .env file now? (y/n): " edit_now
            if [ "$edit_now" = "y" ] || [ "$edit_now" = "Y" ]; then
                nano .env
            fi
        fi
    else
        echo "❌ .env.example file not found. Please ensure all files are downloaded."
        exit 1
    fi
fi

# Check if GEMINI_API_KEY is set
if grep -q "your_gemini_api_key_here" .env; then
    echo "⚠️  Warning: Please set your actual GEMINI_API_KEY in the .env file"
    echo "   The application will work without it, but AI features will be disabled"
fi

echo ""
echo "🚀 Starting NetPulse..."
echo ""

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Build and start the application
echo "🏗️  Building and starting NetPulse container..."
docker-compose up -d --build

# Wait for the container to be healthy
echo "⏳ Waiting for NetPulse to start..."
sleep 5

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ NetPulse is now running!"
    echo ""
    echo "📍 Access NetPulse at: http://localhost:8080"
    echo ""
    echo "🔧 Useful commands:"
    echo "   View logs:    docker-compose logs -f netpulse"
    echo "   Stop app:     docker-compose down"
    echo "   Restart:      docker-compose restart"
    echo "   Status:       docker-compose ps"
    echo ""
    echo "📚 For detailed documentation, see README-new.md"
    echo "📞 For webhook setup help, see HELP.md"
    
    # Try to open the application in the default browser
    if command -v xdg-open &> /dev/null; then
        echo ""
        read -p "Would you like to open NetPulse in your browser? (y/n): " open_browser
        if [ "$open_browser" = "y" ] || [ "$open_browser" = "Y" ]; then
            xdg-open http://localhost:8080
        fi
    elif command -v open &> /dev/null; then
        echo ""
        read -p "Would you like to open NetPulse in your browser? (y/n): " open_browser
        if [ "$open_browser" = "y" ] || [ "$open_browser" = "Y" ]; then
            open http://localhost:8080
        fi
    fi
else
    echo ""
    echo "❌ Failed to start NetPulse. Checking logs..."
    docker-compose logs netpulse
    echo ""
    echo "💡 Troubleshooting tips:"
    echo "   1. Make sure port 8080 is not already in use"
    echo "   2. Check Docker daemon is running"
    echo "   3. Verify all required files are present"
    echo "   4. Check the logs above for specific errors"
fi

echo ""
echo "🎉 Setup complete! Happy monitoring!"