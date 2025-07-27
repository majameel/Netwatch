import React, { useState } from 'react';
import { Target } from '../types';

interface TargetFormProps {
    onAddTarget: (target: Omit<Target, 'id' | 'status' | 'history' | 'isMonitoring' | 'totalChecks' | 'consecutiveFailures'>) => void;
}

const TargetForm: React.FC<TargetFormProps> = ({ onAddTarget }) => {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !address.trim()) return;
        onAddTarget({ name, address });
        setName('');
        setAddress('');
    };

    return (
        <div className="bg-primary-light dark:bg-secondary-dark p-4 sm:p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">Add New Monitoring Target</h2>
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-3 gap-4">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Google DNS"
                    className="sm:col-span-1 bg-secondary-light dark:bg-tertiary-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary rounded-md p-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    required
                />
                <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g., 8.8.8.8"
                    className="sm:col-span-1 bg-secondary-light dark:bg-tertiary-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary rounded-md p-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    required
                />
                <button
                    type="submit"
                    className="sm:col-span-1 w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out"
                >
                    Add Target
                </button>
            </form>
        </div>
    );
};

export default TargetForm;