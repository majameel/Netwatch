// CONCURRENT PING WORKER - Handles individual target monitoring in isolation
// This runs in a separate thread to prevent JavaScript's single-threaded limitations

class PingWorker {
  constructor() {
    this.activeTargets = new Map();
    this.maxConcurrentTargets = 20; // Browser/container limit
    this.workerStats = {
      totalPings: 0,
      successfulPings: 0,
      failedPings: 0,
      startTime: Date.now()
    };
  }

  startMonitoring(target) {
    const { id, address, name, pingInterval } = target;
    
    console.log(`🔧 [WORKER] Starting monitoring for ${name} (${address})`);
    
    // Check concurrent limit
    if (this.activeTargets.size >= this.maxConcurrentTargets) {
      this.postMessage({
        type: 'error',
        targetId: id,
        error: `Maximum concurrent targets (${this.maxConcurrentTargets}) reached`
      });
      return;
    }

    // Clear existing interval if any
    if (this.activeTargets.has(id)) {
      clearInterval(this.activeTargets.get(id).intervalId);
    }

    // Create isolated ping function for this target
    const pingFunction = async () => {
      try {
        this.workerStats.totalPings++;
        
        const startTime = performance.now();
        const result = await this.performPing(address);
        const endTime = performance.now();
        
        if (result.success) {
          this.workerStats.successfulPings++;
        } else {
          this.workerStats.failedPings++;
        }

        // Post result back to main thread
        this.postMessage({
          type: 'pingResult',
          targetId: id,
          result: {
            target: address,
            alive: result.success,
            responseTime: result.success ? Math.round(endTime - startTime) : null,
            packetLoss: result.success ? 0 : 100,
            timestamp: new Date().toISOString(),
            workerThread: true
          },
          stats: this.getStats()
        });

      } catch (error) {
        this.workerStats.failedPings++;
        console.error(`[WORKER] Ping failed for ${name}:`, error);
        
        this.postMessage({
          type: 'pingResult',
          targetId: id,
          result: {
            target: address,
            alive: false,
            responseTime: null,
            packetLoss: 100,
            timestamp: new Date().toISOString(),
            error: error.message,
            workerThread: true
          },
          stats: this.getStats()
        });
      }
    };

    // Set up interval with slight randomization to prevent synchronization
    const randomizedInterval = pingInterval * 1000 + (Math.random() * 2000 - 1000);
    const intervalId = setInterval(pingFunction, randomizedInterval);
    
    // Store target info
    this.activeTargets.set(id, {
      intervalId,
      address,
      name,
      startTime: Date.now()
    });

    // Immediate first ping
    setTimeout(pingFunction, Math.random() * 1000);

    console.log(`✅ [WORKER] Started monitoring ${name} (interval: ${Math.round(randomizedInterval)}ms)`);
    
    this.postMessage({
      type: 'monitoringStarted',
      targetId: id,
      message: `Worker thread monitoring started for ${name}`,
      activeCount: this.activeTargets.size,
      maxTargets: this.maxConcurrentTargets
    });
  }

  stopMonitoring(targetId) {
    const target = this.activeTargets.get(targetId);
    if (target) {
      clearInterval(target.intervalId);
      this.activeTargets.delete(targetId);
      
      console.log(`🛑 [WORKER] Stopped monitoring ${target.name}`);
      
      this.postMessage({
        type: 'monitoringStopped',
        targetId,
        message: `Worker thread monitoring stopped for ${target.name}`,
        activeCount: this.activeTargets.size
      });
    }
  }

  async performPing(address) {
    try {
      // Use fetch with timeout as a network connectivity test
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: address }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return {
        success: result.alive && result.responseTime !== null,
        responseTime: result.responseTime,
        packetLoss: result.packetLoss || 0
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  getStats() {
    const uptime = Date.now() - this.workerStats.startTime;
    return {
      activeTargets: this.activeTargets.size,
      maxTargets: this.maxConcurrentTargets,
      totalPings: this.workerStats.totalPings,
      successfulPings: this.workerStats.successfulPings,
      failedPings: this.workerStats.failedPings,
      successRate: this.workerStats.totalPings > 0 ? 
        Math.round((this.workerStats.successfulPings / this.workerStats.totalPings) * 100) : 0,
      uptime: Math.round(uptime / 1000)
    };
  }

  getTargetList() {
    return Array.from(this.activeTargets.entries()).map(([id, target]) => ({
      id,
      name: target.name,
      address: target.address,
      running: Date.now() - target.startTime
    }));
  }

  postMessage(data) {
    // In actual worker, this would be self.postMessage(data)
    // For now, we'll use a message handler
    if (typeof self !== 'undefined' && self.postMessage) {
      self.postMessage(data);
    }
  }
}

// Worker message handler
const pingWorker = new PingWorker();

// Listen for messages from main thread
if (typeof self !== 'undefined') {
  self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
      case 'startMonitoring':
        pingWorker.startMonitoring(data);
        break;
        
      case 'stopMonitoring':
        pingWorker.stopMonitoring(data.targetId);
        break;
        
      case 'getStats':
        pingWorker.postMessage({
          type: 'stats',
          stats: pingWorker.getStats(),
          targets: pingWorker.getTargetList()
        });
        break;
        
      case 'setMaxTargets':
        pingWorker.maxConcurrentTargets = Math.min(data.max, 50); // Hard limit of 50
        pingWorker.postMessage({
          type: 'maxTargetsUpdated',
          maxTargets: pingWorker.maxConcurrentTargets
        });
        break;
        
      default:
        console.warn('[WORKER] Unknown message type:', type);
    }
  };
}

// Export for non-worker environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PingWorker;
}
