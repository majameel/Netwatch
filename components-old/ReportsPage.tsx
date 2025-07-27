import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { AppContextType } from '../types';
import ReportDetail from './ReportDetail';
import { Target } from 'lucide-react';

const ReportsPage: React.FC = () => {
    const { targets } = useContext(AppContext) as AppContextType;
    const [selectedTargetId, setSelectedTargetId] = useState<string | null>(targets.length > 0 ? targets[0].id : null);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className="lg:col-span-1 bg-primary-light dark:bg-secondary-dark p-4 rounded-lg shadow-lg self-start">
                <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary mb-4 border-b border-border-light dark:border-tertiary-dark pb-3">Targets</h2>
                <ul className="space-y-2">
                    {targets.map(target => (
                        <li key={target.id}>
                            <button
                                onClick={() => setSelectedTargetId(target.id)}
                                className={`w-full text-left p-3 rounded-md transition-colors text-sm ${selectedTargetId === target.id
                                    ? 'bg-cyan-500 text-white font-bold shadow'
                                    : 'bg-secondary-light dark:bg-tertiary-dark/50 hover:bg-tertiary-light dark:hover:bg-tertiary-dark'
                                    }`}
                            >
                                <p className="font-semibold">{target.name}</p>
                                <p className="text-xs opacity-80">{target.address}</p>
                            </button>
                        </li>
                    ))}
                </ul>
                {targets.length === 0 && <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">No targets to report on.</p>}
            </aside>
            <main className="lg:col-span-3">
                {selectedTargetId ? (
                    <ReportDetail targetId={selectedTargetId} />
                ) : (
                    <div className="bg-primary-light dark:bg-secondary-dark p-8 rounded-lg shadow-lg text-center">
                        <Target size={48} className="mx-auto text-text-light-secondary dark:text-text-dark-secondary mb-4" />
                        <h3 className="text-xl font-semibold">Select a Target</h3>
                        <p className="text-text-light-secondary dark:text-text-dark-secondary">Choose a target from the list to view its detailed report.</p>
                    </div>
                )}
            </main>
        </div>
    )
};

export default ReportsPage;