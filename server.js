import express from 'express';
import cors from 'cors';
import ping from 'ping';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Gemini AI if API key is provided
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Store for monitoring data
const monitoringData = new Map();

// Ping endpoint
app.post('/api/ping', async (req, res) => {
  try {
    const { target } = req.body;
    
    if (!target) {
      return res.status(400).json({ error: 'Target is required' });
    }

    console.log(`Pinging ${target}...`);
    
    // Configure ping options for Windows with enhanced packet count
    const isWindows = process.platform === 'win32';
    const pingConfig = {
      timeout: 8, // Increased timeout for better reliability
      extra: isWindows ? ['-n', '10', '-w', '8000'] : ['-c', '10', '-W', '8'], // 10 packets with 8s timeout
      numeric: false,
      min_reply: 1 // At least 1 reply required
    };

    console.log(`🏓 Pinging ${target} with config:`, pingConfig);
    const result = await ping.promise.probe(target, pingConfig);
    console.log('📊 Raw ping result:', JSON.stringify(result, null, 2));
    
    // Enhanced packet loss calculation with multiple detection methods
    let packetLoss = 0;
    let packetsTransmitted = 10;
    let packetsReceived = 10;
    
    // Method 1: Parse from raw output for most accurate results
    if (result.output) {
      const output = result.output.toString();
      console.log('🔍 Parsing raw output for packet loss...');
      
      if (isWindows) {
        // Windows: "Packets: Sent = 10, Received = 8, Lost = 2 (20% loss)"
        const sentMatch = output.match(/Sent\s*=\s*(\d+)/i);
        const receivedMatch = output.match(/Received\s*=\s*(\d+)/i);
        const lossMatch = output.match(/\((\d+(?:\.\d+)?)%\s*loss\)/i);
        
        if (sentMatch && receivedMatch) {
          packetsTransmitted = parseInt(sentMatch[1]);
          packetsReceived = parseInt(receivedMatch[1]);
          packetLoss = ((packetsTransmitted - packetsReceived) / packetsTransmitted) * 100;
          console.log(`📉 Windows packet stats: ${packetsTransmitted} sent, ${packetsReceived} received, ${packetLoss}% loss`);
        } else if (lossMatch) {
          packetLoss = parseFloat(lossMatch[1]);
          console.log(`📉 Windows loss from regex: ${packetLoss}%`);
        }
      } else {
        // Linux: "10 packets transmitted, 8 received, 20% packet loss"
        const transmittedMatch = output.match(/(\d+)\s+packets?\s+transmitted/i);
        const receivedMatch = output.match(/(\d+)\s+received/i);
        const lossMatch = output.match(/(\d+(?:\.\d+)?)%\s+packet\s+loss/i);
        
        if (transmittedMatch && receivedMatch) {
          packetsTransmitted = parseInt(transmittedMatch[1]);
          packetsReceived = parseInt(receivedMatch[1]);
          packetLoss = ((packetsTransmitted - packetsReceived) / packetsTransmitted) * 100;
          console.log(`📉 Linux packet stats: ${packetsTransmitted} sent, ${packetsReceived} received, ${packetLoss}% loss`);
        } else if (lossMatch) {
          packetLoss = parseFloat(lossMatch[1]);
          console.log(`📉 Linux loss from regex: ${packetLoss}%`);
        }
      }
    }
    
    // Method 2: Fallback to library's packet loss detection
    if (packetLoss === 0 && result.packetLoss) {
      const lossString = result.packetLoss.toString();
      const match = lossString.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        packetLoss = parseFloat(match[1]);
        console.log(`📉 Library packet loss: ${packetLoss}%`);
      }
    }
    
    // Method 3: If completely offline, set 100% loss
    if (!result.alive || result.time === 'unknown' || result.time === false) {
      packetLoss = 100;
      console.log(`🔴 Target unreachable - setting 100% packet loss`);
    }

    // Parse response time more carefully
    let responseTime = null;
    if (result.alive && result.time !== 'unknown' && result.time !== false) {
      responseTime = parseFloat(result.time);
      if (isNaN(responseTime)) {
        responseTime = null;
      }
    }

    // Determine if target is truly alive
    const isAlive = result.alive && responseTime !== null && packetLoss < 100;
    
    const response = {
      target,
      alive: isAlive,
      responseTime: responseTime,
      packetLoss: Math.round(packetLoss * 100) / 100, // Round to 2 decimal places
      timestamp: new Date().toISOString(),
      min: result.min === 'unknown' ? null : parseFloat(result.min) || null,
      max: result.max === 'unknown' ? null : parseFloat(result.max) || null,
      avg: result.avg === 'unknown' ? null : parseFloat(result.avg) || null,
      stddev: result.stddev === 'unknown' ? null : parseFloat(result.stddev) || null,
      // Additional debugging info
      packetsTransmitted,
      packetsReceived,
      rawOutput: result.output || 'No output available'
    };

    console.log(`✅ Final response for ${target}:`, JSON.stringify(response, null, 2));

    // Store monitoring data
    if (!monitoringData.has(target)) {
      monitoringData.set(target, []);
    }
    const targetData = monitoringData.get(target);
    targetData.push(response);
    
    // Keep only last 100 records per target
    if (targetData.length > 100) {
      targetData.shift();
    }

    console.log(`Ping result for ${target}:`, response);
    res.json(response);
    
  } catch (error) {
    console.error('Ping error:', error);
    res.status(500).json({ 
      error: 'Ping failed', 
      details: error.message,
      target: req.body.target,
      alive: false,
      responseTime: null,
      packetLoss: 100,
      timestamp: new Date().toISOString()
    });
  }
});

// Get monitoring history
app.get('/api/history/:target', (req, res) => {
  const { target } = req.params;
  const data = monitoringData.get(target) || [];
  res.json(data);
});

// Get all monitored targets
app.get('/api/targets', (req, res) => {
  const targets = Array.from(monitoringData.keys()).map(target => {
    const data = monitoringData.get(target);
    const latest = data[data.length - 1];
    return {
      target,
      lastCheck: latest?.timestamp,
      status: latest?.alive ? 'up' : 'down',
      latency: latest?.responseTime
    };
  });
  res.json(targets);
});

// AI Analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    if (!genAI) {
      return res.status(503).json({ 
        error: 'AI service not available', 
        message: 'Gemini API key not configured' 
      });
    }

    const { target, data } = req.body;
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Analyze this network monitoring data for ${target}:
    ${JSON.stringify(data, null, 2)}
    
    Provide insights about:
    - Network stability
    - Performance trends
    - Potential issues
    - Recommendations
    
    Keep the response concise and actionable.`;
    
    const result = await model.generateContent(prompt);
    const analysis = result.response.text();
    
    res.json({ analysis });
    
  } catch (error) {
    console.error('AI Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'NetPulse API',
    version: '1.0.0'
  });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error', 
    details: error.message 
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NetPulse server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Gemini AI: ${genAI ? 'Enabled' : 'Disabled (no API key)'}`);
});