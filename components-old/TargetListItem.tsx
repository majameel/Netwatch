import React, { useState, useContext } from 'react';
import { Target, AppContextType } from '../types';
import { AppContext } from '../App';
import { Play, Pause, Trash2, Settings, ChevronDown, ChevronUp, BarChart2, Download, AlertCircle, History, Activity } from 'lucide-react';
import LatencyChart from './LatencyChart';
import PacketLossChart from './PacketLossChart';
import AlertsPanel from './AlertsPanel';
import LogsPanel from './LogsPanel';

type ExpandedTab = 'history' | 'alerts' | 'logs';

const TargetListItem: React.FC<{ target: Target }> = ({ target }) => {
    const { deleteTarget, toggleMonitoring, updateTargetSettings, exportToCsv, settings } = useContext(AppContext) as AppContextType;
    const [isExpanded, setIsExpanded] = useState(false);
    const [expandedTab, setExpandedTab] = useState<ExpandedTab>('history');
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [tempLatency, setTempLatency] = useState(target.latencyThreshold ?? '');
    const [tempLoss, setTempLoss] = useState(target.packetLossThreshold ?? '');
    const [tempPingInterval, setTempPingInterval] = useState(target.pingInterval ?? '');
    const [timeRange, setTimeRange] = useState(100);

    const latency = target.status.latency;
    const packetLoss = target.status.packetLoss;

    const getLatencyColor = () => {
        if (latency === null) return 'text-text-light-secondary dark:text-text-dark-secondary';
        if (latency > (target.latencyThreshold ?? settings.defaultLatencyThreshold)) return 'text-red-500';
        if (latency > (target.latencyThreshold ?? settings.defaultLatencyThreshold) * 0.75) return 'text-yellow-500';
        return 'text-green-500 dark:text-green-400';
    };
    
    const getPacketLossColor = () => {
        if (packetLoss > (target.packetLossThreshold ?? settings.defaultPacketLossThreshold)) return 'text-red-500';
        return 'text-green-500 dark:text-green-400';
    }

    const handleSettingsSave = () => {
        const latency = tempLatency !== '' ? Number(tempLatency) : undefined;
        const loss = tempLoss !== '' ? Number(tempLoss) : undefined;
        const interval = tempPingInterval !== '' ? Number(tempPingInterval) : undefined;

        updateTargetSettings(target.id, latency, loss, interval);
        setIsSettingsVisible(false);
    }

    const TabButton: React.FC<{tabName: ExpandedTab, currentTab: ExpandedTab, children: React.ReactNode}> = ({ tabName, currentTab, children }) => (
        <button 
            onClick={() => setExpandedTab(tabName)}
            className={`flex items-center gap-2 py-2 px-4 font-medium transition-colors ${currentTab === tabName ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-cyan-500/80'}`}
        >
            {children}
        </button>
    );

    return (
        <div className="bg-primary-light dark:bg-secondary-dark rounded-lg shadow-md transition-all duration-300">
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between">
                <div className="flex items-center gap-4 mb-4 sm:mb-0 flex-grow">
                    <button onClick={() => toggleMonitoring(target.id)} className="p-2 rounded-full hover:bg-tertiary-light dark:hover:bg-tertiary-dark">
                        {target.isMonitoring ? <Pause className="text-yellow-500" /> : <Play className="text-green-500 dark:text-green-400" />}
                    </button>
                    <div>
                        <p className="font-bold text-lg text-text-light-primary dark:text-text-dark-primary">{target.name}</p>
                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{target.address}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                     <div className="text-center">
                        <p className={`font-mono text-xl font-semibold ${getLatencyColor()}`}>{latency !== null ? `${Math.round(latency)}ms` : 'N/A'}</p>
                        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Latency</p>
                    </div>
                    <div className="text-center">
                        <p className={`font-mono text-xl font-semibold ${getPacketLossColor()}`}>{packetLoss.toFixed(1)}%</p>
                        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Loss</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-4 sm:mt-0 sm:ml-4">
                    <button onClick={() => setIsSettingsVisible(!isSettingsVisible)} className="p-2 rounded-full hover:bg-tertiary-light dark:hover:bg-tertiary-dark text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary"><Settings size={20} /></button>
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-full hover:bg-tertiary-light dark:hover:bg-tertiary-dark text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary">
                        {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                    </button>
                    <button onClick={() => deleteTarget(target.id)} className="p-2 rounded-full hover:bg-tertiary-light dark:hover:bg-tertiary-dark text-text-light-secondary dark:text-text-dark-secondary hover:text-red-500"><Trash2 size={20} /></button>
                </div>
            </div>

            {isSettingsVisible && (
                 <div className="p-4 bg-secondary-light dark:bg-tertiary-dark/50 border-t border-border-light dark:border-border-dark flex items-end gap-4 flex-wrap">
                    <div className="flex-grow min-w-[120px]">
                        <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Latency Threshold (ms)</label>
                        <input type="number" value={tempLatency} onChange={e => setTempLatency(e.target.value)} placeholder={String(settings.defaultLatencyThreshold)} className="w-full bg-tertiary-light dark:bg-tertiary-dark rounded p-1 text-text-light-primary dark:text-text-dark-primary border border-border-light dark:border-border-dark" />
                    </div>
                    <div className="flex-grow min-w-[120px]">
                         <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Packet Loss Threshold (%)</label>
                        <input type="number" value={tempLoss} onChange={e => setTempLoss(e.target.value)} placeholder={String(settings.defaultPacketLossThreshold)} className="w-full bg-tertiary-light dark:bg-tertiary-dark rounded p-1 text-text-light-primary dark:text-text-dark-primary border border-border-light dark:border-border-dark" />
                    </div>
                    <div className="flex-grow min-w-[120px]">
                         <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Ping Interval (s)</label>
                        <input type="number" value={tempPingInterval} onChange={e => setTempPingInterval(e.target.value)} placeholder={String(settings.defaultPingInterval)} min="2" max="60" className="w-full bg-tertiary-light dark:bg-tertiary-dark rounded p-1 text-text-light-primary dark:text-text-dark-primary border border-border-light dark:border-border-dark" />
                    </div>
                    <button onClick={handleSettingsSave} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-1 px-3 rounded self-end">Save</button>
                 </div>
            )}
            
            {isExpanded && (
                <div className="border-t border-border-light dark:border-tertiary-dark">
                    <div className="border-b border-border-light dark:border-tertiary-dark flex">
                        <TabButton tabName="history" currentTab={expandedTab}><History size={16}/>History</TabButton>
                        <TabButton tabName="alerts" currentTab={expandedTab}><AlertCircle size={16}/>Alerts</TabButton>
                        <TabButton tabName="logs" currentTab={expandedTab}><Activity size={16}/>Live Logs</TabButton>
                    </div>
                    <div className="p-4">
                        {expandedTab === 'history' && (
                            <div>
                                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                                    <h4 className="font-semibold text-lg flex items-center gap-2"><BarChart2 size={20}/> Performance History</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">View Last:</span>
                                        <button onClick={() => setTimeRange(100)} className={`px-2 py-1 text-xs rounded ${timeRange === 100 ? 'bg-cyan-500 text-white' : 'bg-tertiary-light dark:bg-tertiary-dark hover:bg-tertiary-light/80 dark:hover:bg-tertiary-dark/80'}`}>100</button>
                                        <button onClick={() => setTimeRange(500)} className={`px-2 py-1 text-xs rounded ${timeRange === 500 ? 'bg-cyan-500 text-white' : 'bg-tertiary-light dark:bg-tertiary-dark hover:bg-tertiary-light/80 dark:hover:bg-tertiary-dark/80'}`}>500</button>
                                        <button onClick={() => setTimeRange(1000)} className={`px-2 py-1 text-xs rounded ${timeRange === 1000 ? 'bg-cyan-500 text-white' : 'bg-tertiary-light dark:bg-tertiary-dark hover:bg-tertiary-light/80 dark:hover:bg-tertiary-dark/80'}`}>All</button>
                                        <button onClick={() => exportToCsv(target.history, `${target.name.replace(/\s+/g, '_')}_history.csv`)} className="p-1 rounded hover:bg-tertiary-light dark:hover:bg-tertiary-dark text-text-light-secondary dark:text-text-dark-secondary" aria-label="Export history">
                                            <Download size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4 h-96 md:h-48">
                                    <div className="flex-1">
                                        <h5 className="text-center font-semibold text-sm mb-2">Latency (ms)</h5>
                                        <LatencyChart history={target.history.slice(-timeRange)} />
                                    </div>
                                    <div className="flex-1">
                                         <h5 className="text-center font-semibold text-sm mb-2">Packet Loss (%)</h5>
                                        <PacketLossChart history={target.history.slice(-timeRange)} />
                                    </div>
                                </div>
                            </div>
                        )}
                        {expandedTab === 'alerts' && <AlertsPanel targetId={target.id} />}
                        {expandedTab === 'logs' && <LogsPanel targetAddress={target.address} />}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TargetListItem;