import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Real types for the working dashboard
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
  intervalId?: NodeJS.Timeout;
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

// State persistence keys
const STORAGE_KEYS = {
  TARGETS: 'netpulse-targets',
  MONITORING_STATE: 'netpulse-monitoring-state',
  ALERTS: 'netpulse-alerts',
  LOGS: 'netpulse-logs',
  SETTINGS: 'netpulse-settings',
  UI_STATE: 'netpulse-ui-state'
};

const App: React.FC = () => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIntervals, setActiveIntervals] = useState<{[key: string]: NodeJS.Timeout}>({});

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

      console.log('✅ State loaded from localStorage');
    } catch (error) {
      console.error('❌ Error loading persisted state:', error);
    }
  };

  // Save complete state to localStorage
  const savePersistedState = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.TARGETS, JSON.stringify(targets));
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      
      // Save monitoring state
      const activeTargets = targets.filter(t => t.isMonitoring).map(t => ({
        id: t.id,
        settings: t.settings
      }));
      localStorage.setItem(STORAGE_KEYS.MONITORING_STATE, JSON.stringify(activeTargets));
      
      // Save UI state
      const uiState = targets.map(t => ({
        id: t.id,
        expanded: t.expanded,
        activeTab: t.activeTab
      }));
      localStorage.setItem(STORAGE_KEYS.UI_STATE, JSON.stringify(uiState));
    } catch (error) {
      console.error('❌ Error saving persisted state:', error);
    }
  };

  // Fetch targets from database
  const fetchTargets = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/targets');
      const data = await response.json();
      
      if (data.success && data.targets) {
        const dbTargets: Target[] = data.targets.map((dbTarget: any) => ({
          id: dbTarget.id.toString(),
          name: dbTarget.name,
          address: dbTarget.host,
          status: 'unknown' as const,
          isMonitoring: false,
          responseTime: null,
          packetLoss: 0,
          consecutiveFailures: 0,
          totalChecks: 0,
          history: []
        }));
        
        setTargets(dbTargets);
        console.log('✅ Fetched targets from database:', dbTargets);
        
        // Auto-restart monitoring for targets that were previously being monitored
        const monitoringState = localStorage.getItem('netpulse-monitoring-state');
        if (monitoringState) {
          try {
            const activeTargets = JSON.parse(monitoringState);
            console.log('🔄 Restoring monitoring state for targets:', activeTargets);
            
            // Start monitoring for previously active targets after a short delay
            setTimeout(() => {
              dbTargets.forEach(target => {
                if (activeTargets.includes(target.id)) {
                  console.log(`🚀 Auto-restarting monitoring for ${target.name}`);
                  startMonitoring(target);
                }
              });
            }, 1000);
          } catch (e) {
            console.warn('Failed to parse monitoring state:', e);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fetching targets:', error);
      toast.error('Failed to fetch targets from database');
    } finally {
      setIsLoading(false);
    }
  };
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'alerts' | 'logs'>('history');
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetAddress, setNewTargetAddress] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Save monitoring state to localStorage
  const saveMonitoringState = () => {
    const activeTargets = targets.filter(t => t.isMonitoring).map(t => t.id);
    localStorage.setItem('netpulse-monitoring-state', JSON.stringify(activeTargets));
  };

  // Start monitoring a target using real API
  const startMonitoring = async (target: Target) => {
    try {
      console.log(`Starting monitoring for ${target.name} (${target.address})`);
      
      // Update UI immediately
      setTargets(prev => prev.map(t => 
        t.id === target.id ? { ...t, isMonitoring: true } : t
      ));
      
      // Start monitoring loop
      const monitorTarget = async () => {
        try {
          const response = await fetch('/api/ping', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ target: target.address })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const pingResult = await response.json();
          console.log('Ping result:', pingResult);
          
          // Create detailed log message with ping output
          const timestamp = new Date().toLocaleTimeString();
          let logMessage = '';
          let logLevel: 'info' | 'warning' | 'error' = 'info';
          
          if (pingResult.alive) {
            logMessage = `Reply from ${target.address}: bytes=32 time=${pingResult.responseTime}ms TTL=64`;
            
            // Check for high latency based on settings
            if (pingResult.responseTime > settings.latencyThreshold) {
              logLevel = 'warning';
              logMessage += ` (HIGH LATENCY)`;
            }
          } else {
            logMessage = `Request timeout for ${target.address}: Destination host unreachable`;
            logLevel = 'error';
          }
          
          // Update target with real data
          setTargets(prev => prev.map(t => {
            if (t.id === target.id) {
              const newHistory = [...t.history, {
                timestamp: pingResult.timestamp,
                responseTime: pingResult.responseTime,
                packetLoss: pingResult.packetLoss,
                alive: pingResult.alive,
                target: pingResult.target
              }].slice(-50); // Keep last 50 results
              
              return {
                ...t,
                status: pingResult.alive ? 'online' : 'offline',
                responseTime: pingResult.responseTime,
                packetLoss: pingResult.packetLoss,
                totalChecks: t.totalChecks + 1,
                consecutiveFailures: pingResult.alive ? 0 : t.consecutiveFailures + 1,
                history: newHistory,
                lastPing: pingResult.timestamp
              };
            }
            return t;
          }));
          
          // Add detailed log entry
          addLog({
            targetId: target.id,
            message: logMessage,
            level: logLevel
          });
          
          // Generate alerts based on settings
          if (!pingResult.alive) {
            addAlert({
              targetId: target.id,
              targetName: target.name,
              type: 'offline',
              message: `${target.name} is offline - no response received`,
              severity: 'critical',
              acknowledged: false
            });
          } else if (pingResult.responseTime > settings.latencyThreshold) {
            addAlert({
              targetId: target.id,
              targetName: target.name,
              type: 'high_latency',
              message: `High latency detected on ${target.name}: ${pingResult.responseTime}ms (threshold: ${settings.latencyThreshold}ms)`,
              severity: 'medium',
              acknowledged: false
            });
          } else if (pingResult.packetLoss > settings.packetLossThreshold) {
            addAlert({
              targetId: target.id,
              targetName: target.name,
              type: 'packet_loss',
              message: `Packet loss detected on ${target.name}: ${pingResult.packetLoss}% (threshold: ${settings.packetLossThreshold}%)`,
              severity: 'high',
              acknowledged: false
            });
          }
          
        } catch (error) {
          console.error(`Error monitoring ${target.name}:`, error);
          addLog({
            targetId: target.id,
            message: `Error monitoring ${target.name}: ${(error as Error).message}`,
            level: 'error'
          });
        }
      };
      
      // Perform initial ping
      await monitorTarget();
      
      // Set up interval for continuous monitoring using settings interval
      const intervalId = setInterval(monitorTarget, settings.pingInterval * 1000);
      
      // Store interval ID for cleanup
      target.intervalId = intervalId;
      target.intervalId = intervalId;
      
      // Save monitoring state to localStorage
      setTimeout(saveMonitoringState, 100);
      
      toast.success(`Started monitoring ${target.name}`);
      
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      toast.error(`Failed to start monitoring ${target.name}`);
      
      // Revert UI state
      setTargets(prev => prev.map(t => 
        t.id === target.id ? { ...t, isMonitoring: false } : t
      ));
    }
  };

  // Stop monitoring a target
  const stopMonitoring = (target: Target) => {
    if (target.intervalId) {
      clearInterval(target.intervalId);
    }
    
    setTargets(prev => prev.map(t => 
      t.id === target.id ? { ...t, isMonitoring: false, intervalId: undefined } : t
    ));
    
    // Save monitoring state to localStorage
    setTimeout(saveMonitoringState, 100);
    
    toast.info(`Stopped monitoring ${target.name}`);
  };

  useEffect(() => {
    loadSettings(); // Load settings first
    fetchTargets(); // Then fetch targets
    
    // Cleanup intervals on unmount
    return () => {
      targets.forEach(target => {
        if (target.intervalId) {
          clearInterval(target.intervalId);
        }
      });
    };
  }, []);

  const addTarget = async () => {
    if (!newTargetName.trim() || !newTargetAddress.trim()) {
      toast.error('Please enter both target name and address');
      return;
    }
    
    try {
      toast.info('Adding target to database...');
      
      // Add to database via API
      const response = await fetch('/api/targets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTargetName.trim(),
          host: newTargetAddress.trim(),
          type: 'ping'
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.target) {
        const newTarget: Target = {
          id: result.target.id.toString(),
          name: result.target.name,
          address: result.target.host,
          status: 'unknown',
          isMonitoring: false,
          responseTime: null,
          packetLoss: 0,
          consecutiveFailures: 0,
          totalChecks: 0,
          history: [],
        };
        
        setTargets(prev => [...prev, newTarget]);
        setNewTargetName('');
        setNewTargetAddress('');
        
        if (!selectedTarget) {
          setSelectedTarget(newTarget.id);
        }
        
        // Refetch targets to ensure consistency
        setTimeout(() => {
          fetchTargets();
        }, 500);
        
        toast.success(`Successfully added ${newTarget.name} for monitoring`);
      } else {
        throw new Error(result.error || 'Failed to add target');
      }
    } catch (error) {
      console.error('Error adding target:', error);
      toast.error(`Failed to add target: ${(error as Error).message}. Please try refreshing the page.`);
      
      // Auto-refresh after 2 seconds if add fails
      setTimeout(() => {
        toast.info('Refreshing targets list...');
        fetchTargets();
      }, 2000);
    }
  };

  const deleteTarget = async (targetId: string) => {
    try {
      const target = targets.find(t => t.id === targetId);
      if (!target) {
        toast.error('Target not found');
        return;
      }

      // Stop monitoring if active
      if (target.isMonitoring && target.intervalId) {
        clearInterval(target.intervalId);
      }

      // Try to delete from backend if it exists there
      try {
        const response = await fetch(`/api/targets/${targetId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          console.log(`Target ${targetId} deleted from backend`);
        } else {
          console.log(`Target ${targetId} not found in backend, deleting locally only`);
        }
      } catch (error) {
        console.log('Backend delete failed, deleting locally only:', error);
      }

      // Remove from local state
      setTargets(prev => prev.filter(t => t.id !== targetId));
      
      // Update selected target if the deleted one was selected
      if (selectedTarget === targetId) {
        const remainingTargets = targets.filter(t => t.id !== targetId);
        setSelectedTarget(remainingTargets.length > 0 ? remainingTargets[0].id : null);
      }

      // Remove related alerts and logs
      setAlerts(prev => prev.filter(alert => alert.targetId !== targetId));
      setLogs(prev => prev.filter(log => log.targetId !== targetId));

      toast.success(`Deleted ${target.name} from monitoring`);
    } catch (error) {
      console.error('Error deleting target:', error);
      toast.error('Failed to delete target');
    }
  };

  const toggleMonitoring = async (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;
    
    if (target.isMonitoring) {
      stopMonitoring(target);
    } else {
      await startMonitoring(target);
    }
  };

  const addAlert = (alertData: Omit<Alert, 'id' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alertData,
      id: `alert-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    
    setAlerts(prev => [newAlert, ...prev].slice(0, 100));
  };

  const addLog = (logData: Omit<Log, 'id' | 'timestamp'>) => {
    const newLog: Log = {
      ...logData,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    
    setLogs(prev => [newLog, ...prev].slice(0, 1000));
  };

  // Export logs functionality
  const exportLogs = () => {
    try {
      const targetData = selectedTargetData;
      const targetLogs = logs.filter(log => log.targetId === selectedTarget);
      
      const exportData = {
        target: targetData ? `${targetData.name} (${targetData.address})` : 'Unknown',
        exportTime: new Date().toISOString(),
        totalLogs: targetLogs.length,
        logs: targetLogs.map(log => ({
          timestamp: new Date(log.timestamp).toLocaleString(),
          level: log.level.toUpperCase(),
          message: log.message
        }))
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `netpulse-logs-${targetData?.name || 'target'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Logs exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export logs');
    }
  };

  // Settings management
  const saveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem('netpulse-settings', JSON.stringify(newSettings));
    
    // Restart monitoring with new intervals for all active targets
    setTimeout(() => {
      targets.forEach(target => {
        if (target.isMonitoring && target.intervalId) {
          console.log(`🔄 Restarting monitoring for ${target.name} with new interval: ${newSettings.pingInterval}s`);
          clearInterval(target.intervalId);
          // Start monitoring with new settings
          const updatedTarget = { ...target };
          startMonitoring(updatedTarget);
        }
      });
    }, 100);
    
    toast.success('Settings saved and monitoring restarted with new intervals');
  };

  // Load settings from localStorage
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('netpulse-settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const selectedTargetData = targets.find(t => t.id === selectedTarget);

  const renderChart = (data: PingResult[], metric: 'responseTime' | 'packetLoss') => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-gray-800 rounded-lg h-64 flex items-center justify-center border border-gray-700">
          <p className="text-gray-400">No data available</p>
        </div>
      );
    }

    const chartData = data.slice(-50); // Show last 50 data points
    const width = 800;
    const height = 240;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Calculate scales
    const isLatency = metric === 'responseTime';
    const values = chartData.map(d => isLatency ? (d.responseTime || 0) : d.packetLoss);
    const maxValue = isLatency ? Math.max(200, Math.max(...values) * 1.1) : 100;
    const minValue = 0;
    
    const threshold = isLatency ? settings.latencyThreshold : settings.packetLossThreshold;
    
    // Generate path points
    const points = chartData.map((result, index) => {
      const x = padding + (index / (chartData.length - 1)) * chartWidth;
      const value = isLatency ? (result.responseTime || 0) : result.packetLoss;
      const y = padding + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
      return { x, y, value, timestamp: result.timestamp };
    });

    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    // Threshold line
    const thresholdY = padding + chartHeight - ((threshold - minValue) / (maxValue - minValue)) * chartHeight;

    // Generate time labels
    const timeLabels = [];
    const labelCount = 6;
    for (let i = 0; i < labelCount; i++) {
      const index = Math.floor((i / (labelCount - 1)) * (chartData.length - 1));
      if (chartData[index]) {
        const time = new Date(chartData[index].timestamp);
        const x = padding + (index / (chartData.length - 1)) * chartWidth;
        timeLabels.push({
          x,
          label: time.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          })
        });
      }
    }

    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium">
            {isLatency ? 'Latency (ms)' : 'Packet Loss (%)'}
          </h4>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
              <span className="text-gray-300">Current</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span className="text-gray-300">Threshold ({threshold}{isLatency ? 'ms' : '%'})</span>
            </div>
          </div>
        </div>
        
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#374151" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width={chartWidth} height={chartHeight} x={padding} y={padding} fill="url(#grid)" opacity="0.3"/>
          
          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const value = minValue + (maxValue - minValue) * ratio;
            const y = padding + chartHeight - ratio * chartHeight;
            return (
              <g key={ratio}>
                <line x1={padding - 5} y1={y} x2={padding} y2={y} stroke="#6b7280" strokeWidth="1"/>
                <text x={padding - 10} y={y + 4} fill="#9ca3af" fontSize="12" textAnchor="end">
                  {Math.round(value)}{isLatency ? '' : '%'}
                </text>
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {timeLabels.map(label => (
            <g key={label.x}>
              <line x1={label.x} y1={padding + chartHeight} x2={label.x} y2={padding + chartHeight + 5} stroke="#6b7280" strokeWidth="1"/>
              <text x={label.x} y={padding + chartHeight + 18} fill="#9ca3af" fontSize="11" textAnchor="middle">
                {label.label}
              </text>
            </g>
          ))}
          
          {/* Threshold line */}
          <line 
            x1={padding} 
            y1={thresholdY} 
            x2={padding + chartWidth} 
            y2={thresholdY} 
            stroke="#ef4444" 
            strokeWidth="2" 
            strokeDasharray="5,5"
            opacity="0.8"
          />
          
          {/* Area under curve */}
          <path
            d={`${pathData} L ${points[points.length - 1]?.x || 0} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`}
            fill="url(#gradient)"
            opacity="0.2"
          />
          
          {/* Main line */}
          <path
            d={pathData}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {points.slice(-10).map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="3"
                fill="#06b6d4"
                stroke="#1f2937"
                strokeWidth="2"
              />
            </g>
          ))}
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading NetPulse Monitor...</p>
        </div>
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
              <p className="text-gray-400 text-sm">Real-Time Network Monitoring</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-gray-400 text-sm">
              Active: {targets.filter(t => t.isMonitoring).length} | Total: {targets.length}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex">
        {/* Left Panel - Add Target Form */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-6">
          <h2 className="text-white text-lg font-semibold mb-4">Add Monitoring Target</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Target Name (e.g. Google DNS)"
              value={newTargetName}
              onChange={(e) => setNewTargetName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Address (e.g. 8.8.8.8 or google.com)"
              value={newTargetAddress}
              onChange={(e) => setNewTargetAddress(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
              onKeyPress={(e) => e.key === 'Enter' && addTarget()}
            />
            <button 
              onClick={addTarget}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Target
            </button>
          </div>
          
          {targets.length === 0 && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <p className="text-gray-300 text-sm">
                No targets configured. Add your first monitoring target above to get started.
              </p>
            </div>
          )}
        </div>

        {/* Right Panel - Monitoring Dashboard */}
        <div className="flex-1 p-6">
          {targets.length > 0 ? (
            <>
              {/* Target Cards with Individual Details */}
              <div className="space-y-6">
                {targets.map((target) => (
                  <div key={target.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    {/* Target Header Card */}
                    <div className={`target-card ${target.status} p-6`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="text-xl font-semibold text-white">{target.name}</h3>
                            <p className="text-gray-400">{target.address}</p>
                          </div>
                          <div className={`target-status ${target.status} px-3 py-1 rounded-full`}>
                            <div className={`pulse-dot ${
                              target.status === 'online' ? 'green' :
                              target.status === 'offline' ? 'red' : 'yellow'
                            } mr-2`}></div>
                            {target.status.toUpperCase()}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-cyan-400">
                              {target.responseTime !== null ? `${target.responseTime}ms` : 'N/A'}
                            </div>
                            <div className="text-sm text-gray-400">Latency</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-cyan-400">{target.packetLoss}%</div>
                            <div className="text-sm text-gray-400">Packet Loss</div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => toggleMonitoring(target.id)}
                              className={`px-4 py-2 rounded-lg font-medium ${
                                target.isMonitoring 
                                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {target.isMonitoring ? '⏹ Stop' : '▶ Start'}
                            </button>
                            <button
                              onClick={() => setSelectedTarget(selectedTarget === target.id ? null : target.id)}
                              className={`px-4 py-2 rounded-lg font-medium ${
                                selectedTarget === target.id
                                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                                  : 'bg-gray-600 hover:bg-gray-700 text-white'
                              }`}
                            >
                              {selectedTarget === target.id ? '📊 Hide Details' : '📊 Show Details'}
                            </button>
                            <button
                              onClick={() => deleteTarget(target.id)}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                              title="Delete target"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details Section */}
                    {selectedTarget === target.id && (
                      <div className="border-t border-gray-700 bg-gray-900">
                        {/* Tab Navigation */}
                        <div className="flex space-x-1 p-4 border-b border-gray-700">
                          <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 rounded-lg ${
                              activeTab === 'history'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            📈 Performance
                          </button>
                          <button
                            onClick={() => setActiveTab('alerts')}
                            className={`px-4 py-2 rounded-lg ${
                              activeTab === 'alerts'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            🚨 Alerts ({alerts.filter(a => a.targetId === target.id).length})
                          </button>
                          <button
                            onClick={() => setActiveTab('logs')}
                            className={`px-4 py-2 rounded-lg ${
                              activeTab === 'logs'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            📋 Live Logs
                          </button>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                          {activeTab === 'history' && (
                            <div className="space-y-6">
                              {/* Individual Target Settings */}
                              <div className="bg-gray-800 rounded-lg p-4">
                                <h4 className="text-white font-medium mb-4">Target Settings</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Latency Threshold (ms)
                                    </label>
                                    <input
                                      type="number"
                                      value={settings.latencyThreshold}
                                      onChange={(e) => {
                                        const newSettings = {...settings, latencyThreshold: parseInt(e.target.value) || 150};
                                        saveSettings(newSettings);
                                      }}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                      min="1"
                                      max="5000"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Packet Loss Threshold (%)
                                    </label>
                                    <input
                                      type="number"
                                      value={settings.packetLossThreshold}
                                      onChange={(e) => {
                                        const newSettings = {...settings, packetLossThreshold: parseInt(e.target.value) || 10};
                                        saveSettings(newSettings);
                                      }}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                      min="1"
                                      max="100"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                      Ping Interval (s)
                                    </label>
                                    <input
                                      type="number"
                                      value={settings.pingInterval}
                                      onChange={(e) => {
                                        const newSettings = {...settings, pingInterval: parseInt(e.target.value) || 5};
                                        saveSettings(newSettings);
                                      }}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                      min="1"
                                      max="300"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Performance Charts */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {renderChart(target.history || [], 'responseTime')}
                                {renderChart(target.history || [], 'packetLoss')}
                              </div>

                              {/* Recent Results */}
                              <div>
                                <h4 className="text-lg font-medium text-white mb-3">Recent Results</h4>
                                {target.history.length === 0 ? (
                                  <div className="text-center py-8 bg-gray-800 rounded-lg">
                                    <p className="text-gray-400">No ping data available yet.</p>
                                    <p className="text-gray-500 text-sm mt-2">
                                      Click "Start" to begin monitoring this target.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {target.history.slice(-10).reverse().map((result, index) => (
                                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                                        <div className="flex items-center space-x-3">
                                          <span className={`w-2 h-2 rounded-full ${result.alive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                          <span className="text-gray-300">{new Date(result.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="flex space-x-4 text-sm">
                                          <span className={result.alive ? "text-green-400" : "text-red-400"}>
                                            {result.responseTime ? `${result.responseTime}ms` : 'No response'}
                                          </span>
                                          <span className={result.packetLoss === 0 ? "text-green-400" : "text-yellow-400"}>
                                            {result.packetLoss}% loss
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {activeTab === 'alerts' && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-white">Recent Alerts</h3>
                                <button className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm">
                                  Export Alerts
                                </button>
                              </div>
                              {alerts.filter(a => a.targetId === target.id).length === 0 ? (
                                <div className="text-center py-8 bg-gray-800 rounded-lg">
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

                          {activeTab === 'logs' && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-white">Live Activity Logs</h3>
                                <button 
                                  onClick={exportLogs}
                                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span>Export</span>
                                </button>
                              </div>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {logs.filter(l => l.targetId === target.id).length === 0 ? (
                                  <div className="text-center py-8 bg-gray-800 rounded-lg">
                                    <p className="text-gray-400">No logs for this target yet.</p>
                                  </div>
                                ) : (
                                  logs.filter(l => l.targetId === target.id).slice(0, 20).map((log) => (
                                    <div key={log.id} className="flex items-center space-x-3 p-3 bg-gray-800 rounded text-sm">
                                      <span className={`w-2 h-2 rounded-full ${
                                        log.level === 'error' ? 'bg-red-500' :
                                        log.level === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                                      }`}></span>
                                      <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                      <span className="text-white flex-1">{log.message}</span>
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
            </>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-400 mb-2">Welcome to NetPulse Monitor</h3>
              <p className="text-gray-500">Add a monitoring target using the form on the left to start viewing real-time network data and analytics.</p>
            </div>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Appearance */}
              <div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-4">Appearance</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Theme</label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, theme: 'light' }))}
                        className={`px-4 py-2 rounded-lg ${
                          settings.theme === 'light' 
                            ? 'bg-cyan-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Light
                      </button>
                      <button
                        onClick={() => setSettings(prev => ({ ...prev, theme: 'dark' }))}
                        className={`px-4 py-2 rounded-lg ${
                          settings.theme === 'dark' 
                            ? 'bg-cyan-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Dark
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerts & Notifications */}
              <div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-4">Alerts & Notifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Default Latency Threshold (ms)</label>
                    <input
                      type="number"
                      value={settings.latencyThreshold}
                      onChange={(e) => setSettings(prev => ({ ...prev, latencyThreshold: parseInt(e.target.value) || 150 }))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Default Packet Loss (%)</label>
                    <input
                      type="number"
                      value={settings.packetLossThreshold}
                      onChange={(e) => setSettings(prev => ({ ...prev, packetLossThreshold: parseInt(e.target.value) || 10 }))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-300 mb-2">Default Ping Interval (seconds)</label>
                    <input
                      type="number"
                      value={settings.pingInterval}
                      onChange={(e) => setSettings(prev => ({ ...prev, pingInterval: parseInt(e.target.value) || 5 }))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none"
                    />
                    <p className="text-gray-400 text-sm mt-1">How often to ping targets (2-60s). Can be overridden per target.</p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.alertSound}
                      onChange={(e) => setSettings(prev => ({ ...prev, alertSound: e.target.checked }))}
                      className="w-5 h-5 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                    <span className="text-gray-300">Enable alert sound</span>
                  </label>
                </div>
              </div>

              {/* Integrations */}
              <div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-4">Integrations</h3>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center space-x-3 mb-4">
                      <input
                        type="checkbox"
                        checked={settings.geminiAnalysis}
                        onChange={(e) => setSettings(prev => ({ ...prev, geminiAnalysis: e.target.checked }))}
                        className="w-5 h-5 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                      />
                      <span className="text-gray-300">Gemini AI Analysis</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Email Alert Webhook URL</label>
                    <input
                      type="url"
                      value={settings.emailWebhookUrl}
                      onChange={(e) => setSettings(prev => ({ ...prev, emailWebhookUrl: e.target.value }))}
                      placeholder="https://your-backend.com/email-alert"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none"
                    />
                    <p className="text-gray-400 text-sm mt-1">The URL of your secure backend service that handles sending emails.</p>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-2">Slack Alert Webhook URL</label>
                    <input
                      type="url"
                      value={settings.slackWebhookUrl}
                      onChange={(e) => setSettings(prev => ({ ...prev, slackWebhookUrl: e.target.value }))}
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-cyan-500 focus:outline-none"
                    />
                    <p className="text-gray-400 text-sm mt-1">Your Slack Incoming Webhook URL. See HELP.md for instructions.</p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    saveSettings(settings);
                    setShowSettings(false);
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
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
