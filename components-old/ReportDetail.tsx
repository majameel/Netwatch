import React, { useContext } from 'react';
import { AppContext } from '../App';
import { AppContextType, PingResult } from '../types';
import { Download } from 'lucide-react';

interface ReportDetailProps {
    targetId: string;
}

const ReportDetail: React.FC<ReportDetailProps> = ({ targetId }) => {
    const { targets, alerts, getHistoryForTarget, exportToCsv } = useContext(AppContext) as AppContextType;
    const target = targets.find(t => t.id === targetId);
    const history = getHistoryForTarget(targetId);
    const incidents = alerts.filter(a => a.targetId === targetId);

    if (!target) {
        return <div>Target not found.</div>;
    }

    const formatLogForDisplay = (log: PingResult) => {
        if (log.status === 'up') {
            return `Reply from ${log.address}: bytes=32 time=${log.latency}ms`;
        }
        return 'Request timed out.';
    };
    
    const handleExport = () => {
        const dataToExport = history.map(log => ({
            timestamp: log.timestamp,
            address: log.address,
            status: log.status,
            latency_ms: log.latency,
            output: formatLogForDisplay(log)
        }));
        exportToCsv(dataToExport, `report_${target.name.replace(/\s+/g, '_')}.csv`)
    }

    return (
        <div className="bg-primary-light dark:bg-secondary-dark p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center border-b border-border-light dark:border-tertiary-dark pb-4 mb-4 flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">{target.name}</h2>
                    <p className="text-text-light-secondary dark:text-text-dark-secondary">{target.address}</p>
                </div>
                <button 
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={history.length === 0}
                    aria-label="Export full report to CSV"
                >
                    <Download size={16} />
                    Export Full Report
                </button>
            </div>

            <h3 className="text-lg font-semibold mb-3">Incident History</h3>
            <div className="font-mono text-sm max-h-[40vh] overflow-y-auto pr-2 space-y-1 bg-primary-dark text-white p-4 rounded-md mb-6">
                 {incidents.length > 0 ? incidents.map((incident) => (
                    <div key={incident.id} className="flex gap-4 items-baseline">
                        <span className="text-text-dark-secondary shrink-0">{new Date(incident.timestamp).toLocaleString()}</span>
                        <p className={'text-red-400'}>
                            <span className="font-bold mr-2">
                                [{incident.type.toUpperCase()} ALERT: {incident.value.toFixed(0)}{incident.type === 'latency' ? 'ms' : '%'}]
                            </span>
                            {incident.currentStatus}
                        </p>
                    </div>
                )) : (
                    <p className="text-text-dark-secondary text-center py-4">No incidents recorded for this target yet.</p>
                )}
            </div>

            <h3 className="text-lg font-semibold mb-3">Complete Ping History</h3>
            <div className="font-mono text-sm max-h-[60vh] overflow-y-auto pr-2 space-y-1 bg-primary-dark text-white p-4 rounded-md">
                 {history.length > 0 ? history.map((log, index) => (
                    <div key={index} className="flex gap-4 items-baseline">
                        <span className="text-text-dark-secondary shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
                        <p className={log.status === 'up' ? 'text-green-400' : 'text-red-400'}>
                            {formatLogForDisplay(log)}
                        </p>
                    </div>
                )).reverse() : (
                    <p className="text-text-dark-secondary text-center py-4">No history recorded for this target yet.</p>
                )}
            </div>
        </div>
    )
}

export default ReportDetail;