import React from 'react';
import { Trash2, Globe, Wifi, WifiOff } from 'lucide-react';

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
  intervalId?: number;
}

interface TargetListItemProps {
    target: Target;
    onDelete: (id: string) => void;
}

const TargetListItem: React.FC<TargetListItemProps> = ({ target, onDelete }) => {
    
    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to delete target "${target.name}"?`)) {
            onDelete(target.id);
        }
    };

    const getStatusColor = () => {
        switch (target.status) {
            case 'online': return 'text-green-500';
            case 'offline': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    const getStatusIcon = () => {
        switch (target.status) {
            case 'online': return <Wifi className="w-5 h-5 text-green-500" />;
            case 'offline': return <WifiOff className="w-5 h-5 text-red-500" />;
            default: return <Globe className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusText = () => {
        switch (target.status) {
            case 'online': return 'Online';
            case 'offline': return 'Offline';
            default: return 'Unknown';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        {getStatusIcon()}
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{target.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{target.address}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        <div className="text-center">
                            <p className={`text-sm font-medium ${getStatusColor()}`}>
                                {getStatusText()}
                            </p>
                        </div>
                        
                        {target.status === 'online' && (
                            <>
                                <div className="text-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Response Time</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {target.responseTime ? `${target.responseTime}ms` : 'N/A'}
                                    </p>
                                </div>
                                
                                <div className="text-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Packet Loss</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {target.packetLoss}%
                                    </p>
                                </div>
                            </>
                        )}
                        
                        <div className="text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Checks</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                                {target.totalChecks}
                            </p>
                        </div>
                    </div>
                </div>
                
                <button
                    onClick={handleDelete}
                    className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    title="Delete target"
                >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Delete</span>
                </button>
            </div>
        </div>
    );
};

export default TargetListItem;
