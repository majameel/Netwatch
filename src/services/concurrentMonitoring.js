// CONCURRENT MONITORING MANAGER - Handles Web Workers and target coordination
import { toast } from 'react-toastify';

export class ConcurrentMonitoringManager {
  constructor() {
    this.workers = [];
    this.targetWorkerMap = new Map(); // Maps target ID to worker index
    this.maxWorkersCount = Math.min(navigator.hardwareConcurrency || 4, 8); // CPU cores, max 8
    this.maxTargetsPerWorker = 5; // 5 targets per worker
    this.totalMaxTargets = this.maxWorkersCount * this.maxTargetsPerWorker; // 40 total max
    this.messageHandlers = new Map();
    this.stats = {
      totalTargets: 0,
      activeWorkers: 0,
      totalPings: 0
    };
    
    console.log(`🏭 [MANAGER] Initialized with ${this.maxWorkersCount} workers (max ${this.totalMaxTargets} targets)`);
    this.initializeWorkers();
  }

  initializeWorkers() {
    for (let i = 0; i < this.maxWorkersCount; i++) {
      try {
        // Create worker from the pingWorker.js file
        const worker = new Worker(new URL('../workers/pingWorker.js', import.meta.url), {
          type: 'module'
        });
        
        worker.onmessage = (e) => this.handleWorkerMessage(i, e.data);
        worker.onerror = (error) => {
          console.error(`❌ [MANAGER] Worker ${i} error:`, error);
          toast.error(`Worker ${i} encountered an error`, { autoClose: 3000 });
        };
        
        this.workers[i] = {
          worker,
          activeTargets: 0,
          available: true
        };
        
        console.log(`✅ [MANAGER] Worker ${i} initialized`);
        
      } catch (error) {
        console.error(`❌ [MANAGER] Failed to create worker ${i}:`, error);
        
        // Fallback: reduce max workers if we can't create them
        this.maxWorkersCount = i;
        this.totalMaxTargets = this.maxWorkersCount * this.maxTargetsPerWorker;
        break;
      }
    }
    
    this.stats.activeWorkers = this.workers.length;
    console.log(`🏭 [MANAGER] ${this.workers.length} workers ready (max targets: ${this.totalMaxTargets})`);
  }

  handleWorkerMessage(workerIndex, data) {
    const { type, targetId } = data;
    
    // Route message to appropriate handler
    const handler = this.messageHandlers.get(targetId);
    if (handler) {
      handler(data);
    }
    
    // Update stats based on message type
    switch (type) {
      case 'monitoringStarted':
        this.workers[workerIndex].activeTargets++;
        this.stats.totalTargets++;
        break;
        
      case 'monitoringStopped':
        this.workers[workerIndex].activeTargets--;
        this.stats.totalTargets--;
        break;
        
      case 'pingResult':
        this.stats.totalPings++;
        break;
    }
  }

  startTargetMonitoring(target, resultHandler) {
    return new Promise((resolve, reject) => {
      // Check global limit
      if (this.stats.totalTargets >= this.totalMaxTargets) {
        const error = `Maximum targets reached (${this.totalMaxTargets}). Cannot start monitoring ${target.name}.`;
        console.error(`🚫 [MANAGER] ${error}`);
        toast.error(error, { autoClose: 5000 });
        reject(new Error(error));
        return;
      }

      // Find available worker with least load
      const availableWorker = this.findBestWorker();
      if (!availableWorker) {
        const error = `No available workers for ${target.name}`;
        console.error(`🚫 [MANAGER] ${error}`);
        reject(new Error(error));
        return;
      }

      const { workerIndex, worker } = availableWorker;
      
      console.log(`🎯 [MANAGER] Assigning ${target.name} to worker ${workerIndex}`);
      
      // Register message handler for this target
      this.messageHandlers.set(target.id, resultHandler);
      
      // Map target to worker
      this.targetWorkerMap.set(target.id, workerIndex);
      
      // Send start command to worker
      worker.worker.postMessage({
        type: 'startMonitoring',
        data: {
          id: target.id,
          address: target.address,
          name: target.name,
          pingInterval: target.pingInterval
        }
      });
      
      toast.success(`🚀 Started concurrent monitoring: ${target.name}`, {
        autoClose: 2000,
        icon: '⚡'
      });
      
      resolve({
        workerIndex,
        targetId: target.id,
        maxTargets: this.totalMaxTargets,
        currentTargets: this.stats.totalTargets
      });
    });
  }

  stopTargetMonitoring(targetId) {
    return new Promise((resolve) => {
      const workerIndex = this.targetWorkerMap.get(targetId);
      
      if (workerIndex !== undefined && this.workers[workerIndex]) {
        console.log(`🛑 [MANAGER] Stopping ${targetId} on worker ${workerIndex}`);
        
        this.workers[workerIndex].worker.postMessage({
          type: 'stopMonitoring',
          data: { targetId }
        });
        
        // Cleanup
        this.targetWorkerMap.delete(targetId);
        this.messageHandlers.delete(targetId);
        
        resolve({ success: true, workerIndex });
      } else {
        console.warn(`⚠️ [MANAGER] Target ${targetId} not found in any worker`);
        resolve({ success: false, error: 'Target not found' });
      }
    });
  }

  findBestWorker() {
    // Find worker with least active targets
    let bestWorker = null;
    let minTargets = Infinity;
    
    for (let i = 0; i < this.workers.length; i++) {
      const worker = this.workers[i];
      if (worker.available && worker.activeTargets < this.maxTargetsPerWorker) {
        if (worker.activeTargets < minTargets) {
          minTargets = worker.activeTargets;
          bestWorker = { workerIndex: i, worker };
        }
      }
    }
    
    return bestWorker;
  }

  getSystemStats() {
    return {
      ...this.stats,
      maxTargets: this.totalMaxTargets,
      maxWorkers: this.maxWorkersCount,
      maxTargetsPerWorker: this.maxTargetsPerWorker,
      availableSlots: this.totalMaxTargets - this.stats.totalTargets,
      workerDistribution: this.workers.map((w, i) => ({
        index: i,
        activeTargets: w.activeTargets,
        available: w.available
      }))
    };
  }

  getDetailedStats() {
    return new Promise((resolve) => {
      const workerPromises = this.workers.map((worker, index) => {
        return new Promise((workerResolve) => {
          const timeout = setTimeout(() => {
            workerResolve({ index, error: 'timeout' });
          }, 1000);
          
          const handler = (e) => {
            if (e.data.type === 'stats') {
              clearTimeout(timeout);
              worker.worker.removeEventListener('message', handler);
              workerResolve({ index, stats: e.data.stats, targets: e.data.targets });
            }
          };
          
          worker.worker.addEventListener('message', handler);
          worker.worker.postMessage({ type: 'getStats' });
        });
      });
      
      Promise.all(workerPromises).then(results => {
        resolve({
          system: this.getSystemStats(),
          workers: results
        });
      });
    });
  }

  updateMaxTargets(newMax) {
    const clampedMax = Math.min(Math.max(newMax, 5), 100); // Between 5 and 100
    this.totalMaxTargets = clampedMax;
    this.maxTargetsPerWorker = Math.ceil(clampedMax / this.maxWorkersCount);
    
    // Notify all workers
    this.workers.forEach(worker => {
      worker.worker.postMessage({
        type: 'setMaxTargets',
        data: { max: this.maxTargetsPerWorker }
      });
    });
    
    console.log(`🔧 [MANAGER] Updated max targets to ${clampedMax} (${this.maxTargetsPerWorker} per worker)`);
    
    return {
      totalMax: this.totalMaxTargets,
      perWorker: this.maxTargetsPerWorker,
      workers: this.maxWorkersCount
    };
  }

  destroy() {
    console.log('🧹 [MANAGER] Destroying all workers...');
    
    this.workers.forEach((worker, index) => {
      try {
        worker.worker.terminate();
        console.log(`✅ [MANAGER] Worker ${index} terminated`);
      } catch (error) {
        console.error(`❌ [MANAGER] Error terminating worker ${index}:`, error);
      }
    });
    
    this.workers = [];
    this.targetWorkerMap.clear();
    this.messageHandlers.clear();
    this.stats = { totalTargets: 0, activeWorkers: 0, totalPings: 0 };
  }
}

// Singleton instance
let monitoringManager = null;

export function getMonitoringManager() {
  if (!monitoringManager) {
    monitoringManager = new ConcurrentMonitoringManager();
  }
  return monitoringManager;
}

export function destroyMonitoringManager() {
  if (monitoringManager) {
    monitoringManager.destroy();
    monitoringManager = null;
  }
}
