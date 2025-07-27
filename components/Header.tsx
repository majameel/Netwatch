import React, { useContext } from 'react';
import { Settings, BarChart3, Sun, Moon, FileText, LayoutDashboard } from 'lucide-react';
// import { AppContext } from '../src/App';
// import { AppContextType } from '../types';

interface HeaderProps {
    onSettingsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
    const { settings, setSettings, setView } = useContext(AppContext) as AppContextType;

    const toggleTheme = () => {
        setSettings(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
    };

    return (
        <header className="bg-primary-light/80 dark:bg-secondary-dark/80 backdrop-blur-sm sticky top-0 z-20 shadow-lg border-b border-border-light dark:border-tertiary-dark">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <button onClick={() => setView('dashboard')} className="flex items-center" aria-label="Go to dashboard">
                        <BarChart3 className="h-8 w-8 text-cyan-500" />
                        <h1 className="ml-3 text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">NetPulse</h1>
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setView('dashboard')}
                            aria-label="View dashboard"
                            className="p-2 rounded-full text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary hover:bg-tertiary-light dark:hover:bg-tertiary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-light dark:focus:ring-offset-secondary-dark focus:ring-cyan-500"
                        >
                            <LayoutDashboard className="h-6 w-6" />
                            <span className="sr-only">View Dashboard</span>
                        </button>
                        <button
                            onClick={() => setView('reports')}
                            aria-label="View reports"
                            className="p-2 rounded-full text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary hover:bg-tertiary-light dark:hover:bg-tertiary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-light dark:focus:ring-offset-secondary-dark focus:ring-cyan-500"
                        >
                            <FileText className="h-6 w-6" />
                            <span className="sr-only">View Reports</span>
                        </button>
                        <button
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            className="p-2 rounded-full text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary hover:bg-tertiary-light dark:hover:bg-tertiary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-light dark:focus:ring-offset-secondary-dark focus:ring-cyan-500"
                        >
                            {settings.theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
                            <span className="sr-only">Toggle theme</span>
                        </button>
                        <button
                            onClick={onSettingsClick}
                            aria-label="Open settings"
                            className="p-2 rounded-full text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary hover:bg-tertiary-light dark:hover:bg-tertiary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-light dark:focus:ring-offset-secondary-dark focus:ring-cyan-500"
                        >
                            <Settings className="h-6 w-6" />
                            <span className="sr-only">Open Settings</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;