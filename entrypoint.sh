#!/bin/sh

# NetPulse Full-Stack Application Entrypoint Script
# This script configures the application for both frontend and backend

set -e

echo "🚀 Starting NetPulse Full-Stack Application..."
echo "================================================"

# Configuration file path for frontend
CONFIG_JS_PATH="/app/dist/config.js"

# Check if GEMINI_API_KEY is set
if [ -n "${GEMINI_API_KEY}" ]; then
  echo "✅ Gemini API key found. Configuring AI features..."
  echo "window.process = { env: { API_KEY: '${GEMINI_API_KEY}', GEMINI_API_KEY: '${GEMINI_API_KEY}' } };" > ${CONFIG_JS_PATH}
else
  echo "⚠️ No Gemini API key provided. AI features will be disabled."
  echo "window.process = { env: { API_KEY: '', GEMINI_API_KEY: '' } };" > ${CONFIG_JS_PATH}
fi

# Set appropriate permissions
chmod 644 ${CONFIG_JS_PATH} 2>/dev/null || true

# Display configuration summary
echo ""
echo "📊 NetPulse Configuration:"
echo "   - Backend API: http://localhost:${PORT:-3001}"
echo "   - Frontend: served from /dist"
echo "   - AI Features: $([ -n "${GEMINI_API_KEY}" ] && echo "Enabled" || echo "Disabled")"
echo "   - Health Check: http://localhost:${PORT:-3001}/api/health"
echo ""

# Check if required directories exist
if [ ! -d "/app/dist" ]; then
  echo "❌ Frontend build directory not found at /app/dist"
  echo "   Make sure 'npm run build' was executed during Docker build"
  exit 1
fi

if [ ! -f "/app/server.js" ]; then
  echo "❌ Backend server file not found at /app/server.js"
  exit 1
fi

echo "✅ Configuration completed successfully"
echo "🌐 NetPulse is ready to monitor your network!"
echo ""

# Execute the main command (Node.js server)
exec "$@"