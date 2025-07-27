import React, { useContext } from 'react';
import { AppContext } from '../App';
import { AppContextType, Alert as AlertType } from '../types';
import { AlertTriangle, Bot, Clock, Download } from 'lucide-react';

const Alert: React.FC<{ alert: AlertType }> = ({ alert }) => {
    return (
        <div className="bg-secondary-light dark:bg-tertiary-dark/50 rounded-lg p-4 border border-red-500/30">
            <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="text-red-400" size={20} />
                        <span className="font-bold text-red-400">High {alert.type} on {alert.targetName}</span>
                    </div>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary ml-7">
                        Value: {alert.value.toFixed(0)}{alert.type === 'latency' ? 'ms' : '%'}
                    </p>
                </div>
                 <div className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary/80">
                    <Clock size={14} />
                    <span>{new Date(alert.timestamp).toLocaleString()}</span>
                </div>
            </div>
            <div className="mt-4 pl-4 border-l-2 border-cyan-500/50">
                <div className="flex items-center gap-2 text-cyan-500 dark:text-cyan-400 mb-2">
                    <Bot size={16}/>
                    <h5 className="font-semibold">Gemini Analysis</h5>
                </div>
                <p className="text-sm text-text-light-primary dark:text-text-dark-primary whitespace-pre-wrap font-mono">{alert.geminiAnalysis}</p>
            </div>
        </div>
    )
}

interface AlertsPanelProps {
    targetId?: string;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ targetId }) => {
    const { alerts, exportToCsv } = useContext(AppContext) as AppContextType;
    
    const filteredAlerts = targetId ? alerts.filter(a => a.targetId === targetId) : alerts;

    if (filteredAlerts.length === 0) {
        return <div className="text-center py-6 text-text-light-secondary dark:text-text-dark-secondary">No alerts triggered for this target.</div>;
    }

    return (
        <div>
            <div className="flex justify-end mb-4">
                <button 
                    onClick={() => exportToCsv(filteredAlerts, 'netpulse_alerts.csv')}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={filteredAlerts.length === 0}
                    aria-label="Export alerts to CSV"
                >
                    <Download size={14} />
                    Export Alerts
                </button>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {filteredAlerts.map(alert => (
                    <Alert key={alert.id} alert={alert} />
                ))}
            </div>
        </div>
    );
};

export default AlertsPanel;