import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Enhanced interfaces for complete state management
interface PingResult {
  timestamp: string;
  responseTime: number | null;
  packetLoss: number;
  alive: boolean;
  target: string;
}

interface Target {
  id: string;
  name: string;
  address: string;
  status: 'online' | 'offline' | 'unknown';
  isMonitoring: boolean;
  responseTime: number | null;
  packetLoss: number;
  consecutiveFailures: number;
  totalChecks: number;
  history: PingResult[];
  lastPing?: string;
  // Individual target settings
  settings: {
    pingInterval: number;
    latencyThreshold: number;
    packetLossThreshold: number;
    enableAlerts: boolean;
  };
  // UI state
  expanded: boolean;
  activeTab: 'history' | 'alerts' | 'logs';
}

interface Alert {
  id: string;
  targetId: string;
  targetName: string;
  type: 'high_latency' | 'packet_loss' | 'offline' | 'recovery';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface Log {
  id: string;
  targetId: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  timestamp: string;
}

interface Settings {
  latencyThreshold: number;
  packetLossThreshold: number;
  pingInterval: number;
  theme: 'light' | 'dark';
  alertSound: boolean;
  geminiAnalysis: boolean;
  emailWebhookUrl: string;
  slackWebhookUrl: string;
}

const defaultSettings: Settings = {
  latencyThreshold: 150,
  packetLossThreshold: 10,
  pingInterval: 5,
  theme: 'dark',
  alertSound: true,
  geminiAnalysis: true,
  emailWebhookUrl: '',
  slackWebhookUrl: ''
};

// Default target settings
const defaultTargetSettings = {
  pingInterval: 5,
  latencyThreshold: 150,
  packetLossThreshold: 10,
  enableAlerts: true
};

// Storage keys for persistence
const STORAGE_KEYS = {
  TARGETS: 'netpulse-targets',
  MONITORING_STATE: 'netpulse-monitoring-state',
  ALERTS: 'netpulse-alerts',
  LOGS: 'netpulse-logs',
  SETTINGS: 'netpulse-settings'
};

const App: React.FC = () => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [showTargetSettings, setShowTargetSettings] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetAddress, setNewTargetAddress] = useState('');
  const [activeIntervals, setActiveIntervals] = useState<{[key: string]: any}>({});

  // Load complete state from localStorage
  const loadPersistedState = () => {
    try {
      // Load settings
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      // Load alerts
      const savedAlerts = localStorage.getItem(STORAGE_KEYS.ALERTS);
      if (savedAlerts) {
        setAlerts(JSON.parse(savedAlerts));
      }

      // Load logs
      const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (savedLogs) {
        setLogs(JSON.parse(savedLogs));
      }

      console.log('✅ Persisted state loaded');
    } catch (error) {
      console.error('❌ Error loading persisted state:', error);
    }
  };

  // Save state to localStorage
  const saveStateToLocalStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.TARGETS, JSON.stringify(targets));
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      
      // Save monitoring state with current settings
      const activeTargets = targets.filter(t => t.isMonitoring).map(t => ({
        id: t.id,
        settings: t.settings
      }));
      localStorage.setItem(STORAGE_KEYS.MONITORING_STATE, JSON.stringify(activeTargets));
      
      console.log('💾 State saved to localStorage:', { 
        targets: targets.length, 
        activeMonitoring: activeTargets.length,
        alerts: alerts.length,
        logs: logs.length 
      });
    } catch (error) {
      console.error('❌ Error saving state:', error);
    }
  };

  // Fetch targets from database and restore state
  const fetchTargets = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/targets');
      const data = await response.json();
      
      if (data.success && data.targets) {
        // Load persisted targets from localStorage
        const savedTargets = localStorage.getItem(STORAGE_KEYS.TARGETS);
        const persistedTargets = savedTargets ? JSON.parse(savedTargets) : [];
        
        const dbTargets: Target[] = data.targets.map((dbTarget: any) => {
          // Find persisted target data
          const persistedTarget = persistedTargets.find((pt: Target) => pt.id === dbTarget.id.toString());
          
          return {
            id: dbTarget.id.toString(),
            name: dbTarget.name,
            address: dbTarget.host,
            status: persistedTarget?.status || 'unknown' as const,
            isMonitoring: false, // Will be restored separately
            responseTime: persistedTarget?.responseTime || null,
            packetLoss: persistedTarget?.packetLoss || 0,
            consecutiveFailures: persistedTarget?.consecutiveFailures || 0,
            totalChecks: persistedTarget?.totalChecks || 0,
            history: persistedTarget?.history || [],
            settings: persistedTarget?.settings || { ...defaultTargetSettings },
            expanded: persistedTarget?.expanded || false,
            activeTab: persistedTarget?.activeTab || 'history' as const
          };
        });
        
        setTargets(dbTargets);
        console.log('✅ Targets loaded with persisted state:', dbTargets);
        
        // Restore monitoring state
        setTimeout(() => restoreMonitoringState(dbTargets), 1000);
        
      } else {
        console.log('No targets found in database');
        setTargets([]);
      }
    } catch (error) {
      console.error('❌ Error fetching targets:', error);
      toast.error('Failed to fetch targets from database');
    } finally {
      setIsLoading(false);
    }
  };

  // Restore monitoring state after targets are loaded
  const restoreMonitoringState = (targetList: Target[]) => {
    try {
      const monitoringState = localStorage.getItem(STORAGE_KEYS.MONITORING_STATE);
      if (monitoringState) {
        const activeTargets = JSON.parse(monitoringState);
        console.log('🔄 Restoring monitoring state for', activeTargets.length, 'targets');
        
        // Wait for state to settle before restarting monitoring
        setTimeout(() => {
          activeTargets.forEach((activeTarget: any) => {
            const target = targetList.find(t => t.id === activeTarget.id);
            if (target) {
              console.log(`🚀 Auto-restarting monitoring for ${target.name}`);
              // Update target settings if they were persisted
              if (activeTarget.settings) {
                target.settings = { ...target.settings, ...activeTarget.settings };
              }
              startMonitoring(target, false); // Don't show toast for restoration
            }
          });
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error restoring monitoring state:', error);
    }
  };

  // Enhanced monitoring function with individual target settings
  const startMonitoring = async (target: Target, showToast = true) => {
    try {
      console.log(`🚀 Starting monitoring for ${target.name} with interval: ${target.settings.pingInterval}s`);
      
      // Clear existing interval if any
      if (activeIntervals[target.id]) {
        clearInterval(activeIntervals[target.id]);
        setActiveIntervals(prev => {
          const { [target.id]: removed, ...rest } = prev;
          return rest;
        });
      }
      
      // Update target status
      setTargets(prev => prev.map(t => 
        t.id === target.id ? { ...t, isMonitoring: true, status: 'unknown' } : t
      ));
      
      // Create monitoring interval with target's individual settings
      const intervalId = setInterval(async () => {
        try {
          const response = await fetch('/api/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: target.address })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const pingResult = await response.json();
          
          // Process ping result
          const result: PingResult = {
            timestamp: new Date().toISOString(),
            responseTime: pingResult.alive ? parseFloat(pingResult.time) : null,
            packetLoss: pingResult.alive ? 0 : 100,
            alive: pingResult.alive,
            target: target.address
          };
          
          // Update target with new result
          setTargets(prev => prev.map(t => {
            if (t.id === target.id) {
              const newHistory = [...t.history, result].slice(-100); // Keep last 100 results
              const newConsecutiveFailures = result.alive ? 0 : t.consecutiveFailures + 1;
              
              return {
                ...t,
                status: result.alive ? 'online' : 'offline',
                responseTime: result.responseTime,
                packetLoss: result.packetLoss,
                consecutiveFailures: newConsecutiveFailures,
                totalChecks: t.totalChecks + 1,
                history: newHistory,
                lastPing: new Date().toISOString()
              };
            }
            return t;
          }));
          
          // Add log entry
          const logEntry: Log = {
            id: `log-${Date.now()}-${Math.random()}`,
            targetId: target.id,
            message: result.alive 
              ? `Reply from ${target.address}: bytes=32 time=${result.responseTime}ms TTL=64`
              : `Request timeout from ${target.address}`,
            level: result.alive ? 'info' : 'error',
            timestamp: new Date().toISOString()
          };
          
          setLogs(prev => [logEntry, ...prev].slice(0, 1000)); // Keep last 1000 logs
          
          // Check for alerts based on individual target settings
          checkTargetAlerts(target, result);
          
        } catch (error) {
          console.error(`❌ Error pinging ${target.name}:`, error);
          
          // Add error log
          const errorLog: Log = {
            id: `log-${Date.now()}-${Math.random()}`,
            targetId: target.id,
            message: `[CONTAINER] Container request timeout - CONTAINER TIMEOUT`,
            level: 'error',
            timestamp: new Date().toISOString()
          };
          
          setLogs(prev => [errorLog, ...prev].slice(0, 1000));
        }
      }, target.settings.pingInterval * 1000);
      
      // Store interval ID
      setActiveIntervals(prev => ({ ...prev, [target.id]: intervalId }));
      
      // Save monitoring state immediately
      setTimeout(() => {
        const activeTargets = targets.filter(t => t.isMonitoring || t.id === target.id).map(t => ({
          id: t.id,
          settings: t.settings
        }));
        localStorage.setItem(STORAGE_KEYS.MONITORING_STATE, JSON.stringify(activeTargets));
      }, 100);
      
      if (showToast) {
        toast.success(`🚀 Started monitoring ${target.name}`);
      }
      
    } catch (error) {
      console.error(`❌ Error starting monitoring for ${target.name}:`, error);
      toast.error(`Failed to start monitoring ${target.name}`);
    }
  };

  // Stop monitoring
  const stopMonitoring = (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    
    if (activeIntervals[targetId]) {
      clearInterval(activeIntervals[targetId]);
      setActiveIntervals(prev => {
        const { [targetId]: removed, ...rest } = prev;
        return rest;
      });
    }
    
    setTargets(prev => prev.map(t => 
      t.id === targetId ? { ...t, isMonitoring: false, status: 'unknown' } : t
    ));

    // Update monitoring state in localStorage
    setTimeout(() => {
      const activeTargets = targets.filter(t => t.isMonitoring && t.id !== targetId).map(t => ({
        id: t.id,
        settings: t.settings
      }));
      localStorage.setItem(STORAGE_KEYS.MONITORING_STATE, JSON.stringify(activeTargets));
    }, 100);
    
    toast.info(`⏸️ Stopped monitoring ${target?.name}`);
  };

  // Check for alerts based on individual target settings
  const checkTargetAlerts = (target: Target, result: PingResult) => {
    const now = new Date().toISOString();
    
    if (!target.settings.enableAlerts) return;
    
    // High latency alert
    if (result.alive && result.responseTime && result.responseTime > target.settings.latencyThreshold) {
      const alert: Alert = {
        id: `alert-${Date.now()}-${Math.random()}`,
        targetId: target.id,
        targetName: target.name,
        type: 'high_latency',
        message: `High latency detected: ${result.responseTime}ms (threshold: ${target.settings.latencyThreshold}ms)`,
        timestamp: now,
        acknowledged: false,
        severity: result.responseTime > target.settings.latencyThreshold * 2 ? 'critical' : 'high'
      };
      setAlerts(prev => [alert, ...prev].slice(0, 500));
    }
    
    // Packet loss alert
    if (result.packetLoss > target.settings.packetLossThreshold) {
      const alert: Alert = {
        id: `alert-${Date.now()}-${Math.random()}`,
        targetId: target.id,
        targetName: target.name,
        type: 'packet_loss',
        message: `Packet loss detected: ${result.packetLoss}% (threshold: ${target.settings.packetLossThreshold}%)`,
        timestamp: now,
        acknowledged: false,
        severity: result.packetLoss > 50 ? 'critical' : 'high'
      };
      setAlerts(prev => [alert, ...prev].slice(0, 500));
    }
    
    // Offline alert
    if (!result.alive && target.consecutiveFailures >= 3) {
      const alert: Alert = {
        id: `alert-${Date.now()}-${Math.random()}`,
        targetId: target.id,
        targetName: target.name,
        type: 'offline',
        message: `Target offline: ${target.consecutiveFailures} consecutive failures`,
        timestamp: now,
        acknowledged: false,
        severity: 'critical'
      };
      setAlerts(prev => [alert, ...prev].slice(0, 500));
    }
  };

  // Add new target
  const addTarget = async () => {
    if (!newTargetName.trim() || !newTargetAddress.trim()) {
      toast.error('Please enter both target name and address');
      return;
    }
    
    try {
      const response = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTargetName.trim(),
          host: newTargetAddress.trim(),
          type: 'ping'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh targets to include the new one
        await fetchTargets();
        setNewTargetName('');
        setNewTargetAddress('');
        toast.success(`✅ Added ${newTargetName} successfully`);
      } else {
        // If it appears to fail, try refreshing anyway
        setTimeout(async () => {
          await fetchTargets();
          setNewTargetName('');
          setNewTargetAddress('');
          toast.info('Target added - page refreshed to ensure consistency');
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error adding target:', error);
      // Auto-refresh on error as fallback
      setTimeout(async () => {
        await fetchTargets();
        setNewTargetName('');
        setNewTargetAddress('');
        toast.info('Target may have been added - refreshed to check');
      }, 1000);
    }
  };

  // Delete target
  const deleteTarget = async (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;
    
    // Stop monitoring first
    if (target.isMonitoring) {
      stopMonitoring(targetId);
    }
    
    try {
      const response = await fetch(`/api/targets/${targetId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setTargets(prev => prev.filter(t => t.id !== targetId));
        toast.success(`🗑️ Deleted ${target.name}`);
      } else {
        toast.error('Failed to delete target');
      }
    } catch (error) {
      console.error('❌ Error deleting target:', error);
      toast.error('Failed to delete target');
    }
  };

  // Update individual target settings
  const updateTargetSettings = (targetId: string, newSettings: Partial<typeof defaultTargetSettings>) => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;
    
    const wasMonitoring = target.isMonitoring;
    
    // Stop monitoring if running
    if (wasMonitoring) {
      stopMonitoring(targetId);
    }
    
    // Update settings
    setTargets(prev => prev.map(t => 
      t.id === targetId 
        ? { ...t, settings: { ...t.settings, ...newSettings } }
        : t
    ));
    
    // Ask user if they want to restart monitoring with new settings
    if (wasMonitoring) {
      toast.info(
        <div>
          <p>Settings updated for {target.name}</p>
          <button 
            onClick={() => {
              const updatedTarget = targets.find(t => t.id === targetId);
              if (updatedTarget) {
                startMonitoring({ ...updatedTarget, settings: { ...updatedTarget.settings, ...newSettings } });
              }
            }}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Restart Monitoring
          </button>
        </div>,
        { autoClose: false }
      );
    }
    
    toast.success('Settings updated');
  };

  // Toggle target expansion
  const toggleTargetExpansion = (targetId: string) => {
    setTargets(prev => prev.map(t => 
      t.id === targetId ? { ...t, expanded: !t.expanded } : t
    ));
  };

  // Set target active tab
  const setTargetActiveTab = (targetId: string, tab: 'history' | 'alerts' | 'logs') => {
    setTargets(prev => prev.map(t => 
      t.id === targetId ? { ...t, activeTab: tab } : t
    ));
  };

  // Export logs
  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `netpulse-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Render performance chart
  const renderChart = (history: PingResult[], type: 'responseTime' | 'packetLoss') => {
    if (history.length === 0) {
      return (
        <div className="bg-gray-800 rounded-lg p-4 h-64">
          <h4 className="text-white font-medium mb-2">
            {type === 'responseTime' ? 'Latency (ms)' : 'Packet Loss (%)'}
          </h4>
          <div className="h-48 flex items-center justify-center text-gray-400">
            No data available
          </div>
        </div>
      );
    }
    
    const data = history.slice(-20); // Last 20 data points
    const values = data.map(h => type === 'responseTime' ? (h.responseTime || 0) : h.packetLoss);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = maxValue - minValue || 1;
    
    return (
      <div className="bg-gray-800 rounded-lg p-4 h-64">
        <h4 className="text-white font-medium mb-2">
          {type === 'responseTime' ? 'Latency (ms)' : 'Packet Loss (%)'}
        </h4>
        <div className="h-48 relative">
          <svg 
            width="100%" 
            height="100%" 
            viewBox="0 0 400 200"
            className="absolute inset-0"
          >
            {/* Background grid */}
            <defs>
              <pattern id={`grid-${type}`} width="40" height="20" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${type})`}/>
            
            {/* Chart line */}
            {data.length > 1 && (
              <polyline
                fill="none"
                stroke={type === 'responseTime' ? '#06b6d4' : '#f59e0b'}
                strokeWidth="2"
                points={data.map((_, index) => {
                  const x = (index / (data.length - 1)) * 380 + 10;
                  const normalizedValue = range > 0 ? (values[index] - minValue) / range : 0.5;
                  const y = 180 - (normalizedValue * 160) + 10;
                  return `${x},${y}`;
                }).join(' ')}
              />
            )}
            
            {/* Data points */}
            {data.map((_, index) => {
              const x = (index / Math.max(data.length - 1, 1)) * 380 + 10;
              const normalizedValue = range > 0 ? (values[index] - minValue) / range : 0.5;
              const y = 180 - (normalizedValue * 160) + 10;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={type === 'responseTime' ? '#06b6d4' : '#f59e0b'}
                />
              );
            })}
          </svg>
          
          {/* Value labels */}
          <div className="absolute top-2 right-2 text-xs text-gray-400">
            Max: {maxValue}{type === 'responseTime' ? 'ms' : '%'}
          </div>
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            Min: {minValue}{type === 'responseTime' ? 'ms' : '%'}
          </div>
        </div>
      </div>
    );
  };

  // Load initial state
  useEffect(() => {
    loadPersistedState();
    fetchTargets();
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (!isLoading) {
      saveStateToLocalStorage();
    }
  }, [targets, alerts, logs, settings, isLoading]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(activeIntervals).forEach(intervalId => {
        if (intervalId) clearInterval(intervalId);
      });
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading NetPulse Monitor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">NP</span>
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">NetPulse Monitor</h1>
              <p className="text-gray-400 text-sm">Real-time Network Monitoring</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-gray-400 text-sm">
              Intervals: {Object.keys(activeIntervals).length} | 
              Active Targets: {targets.filter(t => t.isMonitoring).length} | 
              Total Targets: {targets.length}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </header>

      <main className="flex">
        {/* Left Panel - Add Target Form */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-6">
          <h2 className="text-white text-lg font-semibold mb-4">Add New Monitoring Target</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="e.g. Google DNS"
              value={newTargetName}
              onChange={(e) => setNewTargetName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="e.g. 8.8.8.8"
              value={newTargetAddress}
              onChange={(e) => setNewTargetAddress(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
              onKeyPress={(e) => e.key === 'Enter' && addTarget()}
            />
            <button
              onClick={addTarget}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
            >
              Add Target
            </button>
          </div>

          {/* Container Monitor Status */}
          <div className="mt-8 p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <h3 className="text-green-400 font-semibold flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Container Monitor
            </h3>
            <div className="text-green-300 text-sm mt-2 space-y-1">
              <div>Intervals: {Object.keys(activeIntervals).length}/3</div>
              <div>Active Targets: {targets.filter(t => t.isMonitoring).length}</div>
              <div>Total Targets: {targets.length}</div>
              <div className="text-xs text-green-400 mt-2">
                ● Receive: IPs, pings, etc.
                All monitoring systems operational
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Targets */}
        <div className="flex-1 p-6">
          {targets.length > 0 ? (
            <div className="space-y-4">
              {targets.map((target) => (
                <div key={target.id} className="bg-gray-800 rounded-lg border border-gray-700">
                  {/* Target Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        target.status === 'online' ? 'bg-green-500' :
                        target.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></div>
                      <div>
                        <h3 className="text-white font-semibold">{target.name}</h3>
                        <p className="text-gray-400 text-sm">{target.address}</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        target.status === 'online' ? 'bg-green-900/50 text-green-300' :
                        target.status === 'offline' ? 'bg-red-900/50 text-red-300' : 
                        'bg-yellow-900/50 text-yellow-300'
                      }`}>
                        {target.status.toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-lg font-bold text-cyan-400">
                          {target.responseTime !== null ? `${target.responseTime}ms` : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-400">Latency</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-cyan-400">{target.packetLoss}%</div>
                        <div className="text-xs text-gray-400">Packet Loss</div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => target.isMonitoring ? stopMonitoring(target.id) : startMonitoring(target)}
                          className={`px-4 py-2 rounded-lg font-medium ${
                            target.isMonitoring 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {target.isMonitoring ? '⏹ Stop' : '▶ Start'}
                        </button>
                        <button
                          onClick={() => toggleTargetExpansion(target.id)}
                          className={`px-4 py-2 rounded-lg font-medium ${
                            target.expanded
                              ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                              : 'bg-gray-600 hover:bg-gray-700 text-white'
                          }`}
                        >
                          {target.expanded ? 'Hide Details' : 'Show Details'}
                        </button>
                        <button
                          onClick={() => setShowTargetSettings(target.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          ⚙️ Settings
                        </button>
                        <button
                          onClick={() => deleteTarget(target.id)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  {target.expanded && (
                    <div className="border-t border-gray-700">
                      {/* Tab Navigation */}
                      <div className="flex space-x-1 p-4 border-b border-gray-700">
                        <button
                          onClick={() => setTargetActiveTab(target.id, 'history')}
                          className={`px-4 py-2 rounded-lg ${
                            target.activeTab === 'history'
                              ? 'bg-cyan-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          📈 History
                        </button>
                        <button
                          onClick={() => setTargetActiveTab(target.id, 'alerts')}
                          className={`px-4 py-2 rounded-lg ${
                            target.activeTab === 'alerts'
                              ? 'bg-cyan-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          🚨 Alerts ({alerts.filter(a => a.targetId === target.id).length})
                        </button>
                        <button
                          onClick={() => setTargetActiveTab(target.id, 'logs')}
                          className={`px-4 py-2 rounded-lg ${
                            target.activeTab === 'logs'
                              ? 'bg-cyan-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          📋 Live Logs
                        </button>
                      </div>

                      {/* Tab Content */}
                      <div className="p-6">
                        {target.activeTab === 'history' && (
                          <div className="space-y-6">
                            {/* Performance Charts - Side by Side */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {renderChart(target.history, 'responseTime')}
                              {renderChart(target.history, 'packetLoss')}
                            </div>
                          </div>
                        )}

                        {target.activeTab === 'alerts' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xl font-semibold text-white">Recent Alerts</h3>
                              <button className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm">
                                Export Alerts
                              </button>
                            </div>
                            {alerts.filter(a => a.targetId === target.id).length === 0 ? (
                              <div className="text-center py-8 bg-gray-700 rounded-lg">
                                <p className="text-gray-400">No alerts for this target.</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {alerts.filter(a => a.targetId === target.id).slice(0, 10).map((alert) => (
                                  <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                                    alert.severity === 'critical' ? 'bg-red-900/20 border-red-500' :
                                    alert.severity === 'high' ? 'bg-red-900/20 border-red-500' :
                                    alert.severity === 'medium' ? 'bg-yellow-900/20 border-yellow-500' :
                                    'bg-blue-900/20 border-blue-500'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-white font-medium">{alert.message}</p>
                                        <p className="text-gray-400 text-sm">{new Date(alert.timestamp).toLocaleString()}</p>
                                      </div>
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        alert.severity === 'critical' ? 'bg-red-600' :
                                        alert.severity === 'high' ? 'bg-red-600' :
                                        alert.severity === 'medium' ? 'bg-yellow-600' :
                                        'bg-blue-600'
                                      }`}>
                                        {alert.severity.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {target.activeTab === 'logs' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xl font-semibold text-white">Live Activity Logs</h3>
                              <button 
                                onClick={exportLogs}
                                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm flex items-center space-x-2"
                              >
                                <span>Export Logs</span>
                              </button>
                            </div>
                            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
                              {logs.filter(l => l.targetId === target.id).length === 0 ? (
                                <div className="text-center py-8">
                                  <p className="text-gray-400">No logs for this target yet.</p>
                                </div>
                              ) : (
                                logs.filter(l => l.targetId === target.id).slice(0, 20).map((log) => (
                                  <div key={log.id} className="mb-1 flex">
                                    <span className="text-gray-500 mr-2">
                                      {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className={`${
                                      log.level === 'error' ? 'text-red-400' :
                                      log.level === 'warning' ? 'text-yellow-400' : 'text-green-400'
                                    }`}>
                                      {log.message}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-400 mb-2">Welcome to NetPulse Monitor</h3>
              <p className="text-gray-500">Add a monitoring target using the form on the left to start monitoring.</p>
            </div>
          )}
        </div>
      </main>

      {/* Individual Target Settings Modal */}
      {showTargetSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-600 w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-600">
              <h2 className="text-xl font-semibold text-white">
                Target Settings - {targets.find(t => t.id === showTargetSettings)?.name}
              </h2>
              <button
                onClick={() => setShowTargetSettings(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              {(() => {
                const target = targets.find(t => t.id === showTargetSettings);
                if (!target) return null;
                
                return (
                  <div className="space-y-6">
                    {/* Target Info */}
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          target.status === 'online' ? 'bg-green-500' :
                          target.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                        <div>
                          <h3 className="text-white font-medium">{target.name}</h3>
                          <p className="text-gray-400 text-sm">{target.address}</p>
                        </div>
                        <div className={`ml-auto px-2 py-1 rounded text-xs ${
                          target.status === 'online' ? 'bg-green-900/50 text-green-300' :
                          target.status === 'offline' ? 'bg-red-900/50 text-red-300' : 
                          'bg-yellow-900/50 text-yellow-300'
                        }`}>
                          {target.status.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* Settings Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Ping Interval (seconds)
                        </label>
                        <input
                          type="number"
                          value={target.settings.pingInterval}
                          onChange={(e) => updateTargetSettings(target.id, {
                            pingInterval: parseInt(e.target.value) || 5
                          })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-cyan-500"
                          min="1"
                          max="300"
                        />
                        <div className="text-xs text-gray-400 mt-1">
                          Range: 1-300 seconds
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Latency Threshold (ms)
                        </label>
                        <input
                          type="number"
                          value={target.settings.latencyThreshold}
                          onChange={(e) => updateTargetSettings(target.id, {
                            latencyThreshold: parseInt(e.target.value) || 150
                          })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-cyan-500"
                          min="1"
                          max="5000"
                        />
                        <div className="text-xs text-gray-400 mt-1">
                          Range: 1-5000 ms
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Packet Loss Threshold (%)
                        </label>
                        <input
                          type="number"
                          value={target.settings.packetLossThreshold}
                          onChange={(e) => updateTargetSettings(target.id, {
                            packetLossThreshold: parseInt(e.target.value) || 10
                          })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-cyan-500"
                          min="0"
                          max="100"
                        />
                        <div className="text-xs text-gray-400 mt-1">
                          Range: 0-100%
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Alert Settings
                        </label>
                        <label className="flex items-center mt-4">
                          <input
                            type="checkbox"
                            checked={target.settings.enableAlerts}
                            onChange={(e) => updateTargetSettings(target.id, {
                              enableAlerts: e.target.checked
                            })}
                            className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                          />
                          <span className="ml-2 text-gray-300">Enable Alerts</span>
                        </label>
                        <div className="text-xs text-gray-400 mt-1">
                          Alert when thresholds are exceeded
                        </div>
                      </div>
                    </div>

                    {/* Warning for active monitoring */}
                    {target.isMonitoring && (
                      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3">
                        <div className="flex items-center">
                          <span className="text-yellow-400 mr-2">⚠️</span>
                          <span className="text-yellow-300 text-sm">
                            Changes will require restarting monitoring to take effect
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            
            <div className="flex items-center justify-end p-6 border-t border-gray-600 space-x-3">
              <button
                onClick={() => {
                  const target = targets.find(t => t.id === showTargetSettings);
                  if (target) {
                    updateTargetSettings(target.id, defaultTargetSettings);
                  }
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Reset to Defaults
              </button>
              <button
                onClick={() => setShowTargetSettings(null)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Global Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Latency Threshold (ms)
                  </label>
                  <input
                    type="number"
                    value={settings.latencyThreshold}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      latencyThreshold: parseInt(e.target.value) || 150
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Packet Loss Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={settings.packetLossThreshold}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      packetLossThreshold: parseInt(e.target.value) || 10
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.alertSound}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      alertSound: e.target.checked
                    }))}
                    className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <span className="ml-2 text-gray-300">Alert Sound</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.geminiAnalysis}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      geminiAnalysis: e.target.checked
                    }))}
                    className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <span className="ml-2 text-gray-300">Gemini Analysis</span>
                </label>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
                    setShowSettings(false);
                    toast.success('Settings saved');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-600 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-600">
              <h2 className="text-xl font-semibold text-white">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Global Settings */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Global Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Default Latency Threshold (ms)
                    </label>
                    <input
                      type="number"
                      value={settings.latencyThreshold}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        latencyThreshold: parseInt(e.target.value) || 150
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-cyan-500"
                      min="1"
                      max="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Default Packet Loss Threshold (%)
                    </label>
                    <input
                      type="number"
                      value={settings.packetLossThreshold}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        packetLossThreshold: parseInt(e.target.value) || 10
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-cyan-500"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Default Ping Interval (s)
                    </label>
                    <input
                      type="number"
                      value={settings.pingInterval}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        pingInterval: parseInt(e.target.value) || 5
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-cyan-500"
                      min="1"
                      max="300"
                    />
                  </div>
                </div>
              </div>
              
              {/* Notification Settings */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Notifications</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.alertSound}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        alertSound: e.target.checked
                      }))}
                      className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                    <span className="ml-2 text-gray-300">Enable Alert Sounds</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.geminiAnalysis}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        geminiAnalysis: e.target.checked
                      }))}
                      className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                    <span className="ml-2 text-gray-300">Enable Gemini AI Analysis</span>
                  </label>
                </div>
              </div>

              {/* Webhook Settings */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Webhook Integration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Webhook URL
                    </label>
                    <input
                      type="url"
                      value={settings.emailWebhookUrl}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        emailWebhookUrl: e.target.value
                      }))}
                      placeholder="https://your-webhook-url.com/email"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Slack Webhook URL
                    </label>
                    <input
                      type="url"
                      value={settings.slackWebhookUrl}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        slackWebhookUrl: e.target.value
                      }))}
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Storage Info */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Storage Info</h3>
                <div className="bg-gray-700 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Active Intervals:</span>
                    <span className="text-cyan-400">{Object.keys(activeIntervals).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Targets:</span>
                    <span className="text-cyan-400">{targets.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Alerts:</span>
                    <span className="text-cyan-400">{alerts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Logs:</span>
                    <span className="text-cyan-400">{logs.length}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end p-6 border-t border-gray-600 space-x-3">
              <button
                onClick={() => {
                  // Clear all localStorage data
                  Object.values(STORAGE_KEYS).forEach(key => {
                    localStorage.removeItem(key);
                  });
                  toast.success('All data cleared');
                  window.location.reload();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Clear All Data
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  toast.success('Settings saved');
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
};

export default App;
