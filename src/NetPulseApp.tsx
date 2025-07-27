import React, { createContext, useState, useEffect, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Types
interface Target {
  id: string;
  name: string;
  address: string;
  enabled: boolean;
  category: string;
  description: string;
  status: 'online' | 'offline' | 'unknown';
  latency: number | null;
  packetLoss: number;
  lastCheck: string | null;
  history: any[];
  consecutiveFailures: number;
}

interface Alert {
  id: string;
  targetId: string;
  type: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface Log {
  id: string;
  targetId: string;
  message: string;
  level: string;
  timestamp: string;
}

interface Settings {
  theme: 'light' | 'dark';
  autoRefresh: boolean;
  refreshInterval: number;
  maxHistoryPoints: number;
  enableNotifications: boolean;
  enableSounds: boolean;
  latencyThreshold: number;
  packetLossThreshold: number;
  showOfflineOnly: boolean;
  emailNotifications: boolean;
  webhookUrl: string;
}

type AppView = 'dashboard' | 'reports';

interface AppContextType {
  targets: Target[];
  alerts: Alert[];
  logs: Log[];
  selectedTarget: string | null;
  view: AppView;
  settings: Settings;
  isSettingsOpen: boolean;
  setTargets: React.Dispatch<React.SetStateAction<Target[]>>;
  setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
  setLogs: React.Dispatch<React.SetStateAction<Log[]>>;
  setSelectedTarget: React.Dispatch<React.SetStateAction<string | null>>;
  setView: React.Dispatch<React.SetStateAction<AppView>>;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  addTarget: (name: string, address: string, category?: string) => void;
  removeTarget: (targetId: string) => void;
  toggleTarget: (targetId: string) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  acknowledgeAlert: (alertId: string) => void;
  addLog: (log: Omit<Log, 'id' | 'timestamp'>) => void;
}

// Create context for the app
export const AppContext = createContext<AppContextType | null>(null);

const NetPulseApp: React.FC = () => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    autoRefresh: true,
    refreshInterval: 5,
    maxHistoryPoints: 100,
    enableNotifications: true,
    enableSounds: false,
    latencyThreshold: 150,
    packetLossThreshold: 5,
    showOfflineOnly: false,
    emailNotifications: false,
    webhookUrl: '',
  });

  // Load targets from config on mount
  useEffect(() => {
    loadTargetsFromConfig();
  }, []);

  const loadTargetsFromConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      
      if (config.targets) {
        const loadedTargets: Target[] = config.targets.map((target: any, index: number) => ({
          id: `target-${index}`,
          name: target.name,
          address: target.ip,
          enabled: target.enabled,
          category: target.category,
          description: target.description,
          status: 'unknown' as const,
          latency: null,
          packetLoss: 0,
          lastCheck: null,
          history: [],
          consecutiveFailures: 0,
        }));
        
        setTargets(loadedTargets);
        if (loadedTargets.length > 0 && !selectedTarget) {
          setSelectedTarget(loadedTargets[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      toast.error('Failed to load configuration');
    }
  };

  const addTarget = useCallback((name: string, address: string, category = 'Custom') => {
    const newTarget: Target = {
      id: `target-${Date.now()}`,
      name,
      address,
      enabled: true,
      category,
      description: `Custom target: ${name}`,
      status: 'unknown',
      latency: null,
      packetLoss: 0,
      lastCheck: null,
      history: [],
      consecutiveFailures: 0,
    };

    setTargets(prev => [...prev, newTarget]);
    toast.success(`Added target: ${name}`);
  }, []);

  const removeTarget = useCallback((targetId: string) => {
    setTargets(prev => prev.filter(t => t.id !== targetId));
    if (selectedTarget === targetId) {
      setSelectedTarget(targets.length > 1 ? targets[0].id : null);
    }
    toast.info('Target removed');
  }, [selectedTarget, targets]);

  const toggleTarget = useCallback((targetId: string) => {
    setTargets(prev => prev.map(t => 
      t.id === targetId ? { ...t, enabled: !t.enabled } : t
    ));
  }, []);

  const addAlert = useCallback((alert: Omit<Alert, 'id' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    
    setAlerts(prev => [newAlert, ...prev].slice(0, 100)); // Keep last 100 alerts
    
    if (settings.enableNotifications) {
      toast.error(alert.message);
    }
  }, [settings.enableNotifications]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, acknowledged: true } : a
    ));
  }, []);

  const addLog = useCallback((log: Omit<Log, 'id' | 'timestamp'>) => {
    const newLog: Log = {
      ...log,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    
    setLogs(prev => [newLog, ...prev].slice(0, 1000)); // Keep last 1000 logs
  }, []);

  const contextValue: AppContextType = {
    targets,
    alerts,
    logs,
    selectedTarget,
    view,
    settings,
    isSettingsOpen,
    setTargets,
    setAlerts,
    setLogs,
    setSelectedTarget,
    setView,
    setSettings,
    setIsSettingsOpen,
    addTarget,
    removeTarget,
    toggleTarget,
    addAlert,
    acknowledgeAlert,
    addLog,
  };

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Modern Dashboard Layout
  return (
    <AppContext.Provider value={contextValue}>
      <div className={`min-h-screen transition-colors duration-200 ${
        settings.theme === 'dark' 
          ? 'bg-gray-900 text-white' 
          : 'bg-gray-50 text-gray-900'
      }`}>
        {/* Header */}
        <header className="bg-blue-600 dark:bg-gray-800 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-2xl font-bold text-white">NetPulse Monitor</h1>
                  <p className="text-blue-200 dark:text-gray-300 text-sm">Production-Ready Network Monitoring</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-green-400 text-sm">
                  Active: {targets.filter(t => t.enabled).length} | Total: {targets.length}
                </span>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Settings
                </button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel - Add Target Form */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Add Monitoring Target
                  </h2>
                  
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Target Name (e.g. Google DNS)"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Address (e.g. 8.8.8.8 or google.com)"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                      Add Target
                    </button>
                  </div>
                </div>
                
                {/* Target List */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Monitoring Targets
                  </h3>
                  
                  <div className="space-y-2">
                    {targets.map((target) => (
                      <div key={target.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{target.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{target.address}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              target.status === 'online' ? 'bg-green-100 text-green-800' :
                              target.status === 'offline' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {target.status}
                            </span>
                            {target.latency && (
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {target.latency}ms
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeTarget(target.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Stop
                        </button>
                      </div>
                    ))}
                    
                    {targets.length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No targets configured. Add one above to start monitoring.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right Panel - Charts and Data */}
              <div className="lg:col-span-2">
                {selectedTarget ? (
                  <div className="space-y-6">
                    {/* Real-time Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Latency Chart
                        </h3>
                        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                          Chart will show latency trends
                        </div>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Packet Loss Chart
                        </h3>
                        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                          Chart will show packet loss data
                        </div>
                      </div>
                    </div>
                    
                    {/* Alerts and Logs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Recent Alerts
                        </h3>
                        <div className="space-y-2">
                          {alerts.slice(0, 5).map((alert) => (
                            <div key={alert.id} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                              <div className="text-sm text-red-800 dark:text-red-200">{alert.message}</div>
                              <div className="text-xs text-red-600 dark:text-red-400">{new Date(alert.timestamp).toLocaleString()}</div>
                            </div>
                          ))}
                          {alerts.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No alerts</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                          Activity Logs
                        </h3>
                        <div className="space-y-2">
                          {logs.slice(0, 5).map((log) => (
                            <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                              <div className="text-sm text-gray-900 dark:text-white">{log.message}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</div>
                            </div>
                          ))}
                          {logs.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No activity logs</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <div className="text-center py-12">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Welcome to NetPulse Monitor
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Add a monitoring target to start viewing real-time network data and analytics.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        
        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
                    <select 
                      value={settings.theme}
                      onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' }))}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.enableNotifications}
                      onChange={(e) => setSettings(prev => ({ ...prev, enableNotifications: e.target.checked }))}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Notifications</label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                  >
                    Close
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
          theme={settings.theme}
        />
      </div>
    </AppContext.Provider>
  );
};

export default NetPulseApp;