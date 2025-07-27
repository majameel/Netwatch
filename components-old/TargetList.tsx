import React, { useContext } from 'react';
import { AppContext } from '../src/App';
import TargetListItem from './TargetListItem';
import { AppContextType } from '../types';

const TargetList: React.FC = () => {
    const { targets } = useContext(AppContext) as AppContextType;

    if (targets.length === 0) {
        return (
            <div className="text-center py-10 px-4 bg-primary-light dark:bg-secondary-dark rounded-lg">
                <h3 className="text-lg font-medium text-text-light-secondary dark:text-text-dark-secondary">No targets added yet.</h3>
                <p className="text-text-light-secondary dark:text-text-dark-secondary/80">Use the form above to start monitoring a host.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {targets.map(target => (
                <TargetListItem key={target.id} target={target} />
            ))}
        </div>
    );
};

export default TargetList;