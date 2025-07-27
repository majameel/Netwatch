import React, { useContext } from 'react';
import { PingResult, AppContextType } from '../types';
import { AppContext } from '../App';
import { Download } from 'lucide-react';

interface LogsPanelProps {
    targetAddress?: string;
}

const LogsPanel: React.FC<LogsPanelProps> = ({ targetAddress }) => {
    const { liveLogs, exportToCsv } = useContext(AppContext) as AppContextType;

    const filteredLogs = targetAddress ? liveLogs.filter(log => log.address === targetAddress) : liveLogs;

    if (filteredLogs.length === 0) {
        return <div className="text-center py-6 text-text-light-secondary dark:text-text-dark-secondary">No logs for this target. Monitoring may be paused.</div>;
    }

    const formatLogForDisplay = (log: PingResult) => {
        if (log.status === 'up') {
            return `Reply from ${log.address}: bytes=32 time=${log.latency}ms`;
        }
        return 'Request timed out.';
    };

    return (
        <div>
            <div className="flex justify-end mb-4">
                 <button 
                    onClick={() => exportToCsv(filteredLogs, 'netpulse_logs.csv')}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={filteredLogs.length === 0}
                    aria-label="Export logs to CSV"
                >
                    <Download size={14} />
                    Export Logs
                </button>
            </div>
            <div className="font-mono text-sm max-h-[500px] overflow-y-auto pr-2 space-y-1 bg-primary-dark text-white p-4 rounded-md">
                {filteredLogs.map((log, index) => (
                    <div key={index} className="flex gap-4 items-baseline">
                        <span className="text-text-dark-secondary shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <p className={log.status === 'up' ? 'text-green-400' : 'text-red-400'}>
                            {formatLogForDisplay(log)}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LogsPanel;