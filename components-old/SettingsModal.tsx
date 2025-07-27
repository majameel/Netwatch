import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { Settings, AppContextType } from '../types';
import { X } from 'lucide-react';

interface SettingsModalProps {
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const { settings, setSettings } = useContext(AppContext) as AppContextType;
    const [currentSettings, setCurrentSettings] = useState<Settings>(settings);
    const [isApiKeyAvailable, setIsApiKeyAvailable] = useState(false);

    useEffect(() => {
        // Check for the API key after the component mounts, ensuring window.process is available
        const key = (window as any).process?.env?.API_KEY;
        setIsApiKeyAvailable(!!key);
    }, []);


    const handleSave = () => {
        setSettings(currentSettings);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
            <div className="bg-primary-light dark:bg-secondary-dark rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-text-light-primary dark:text-text-dark-primary">
                <div className="p-6 border-b border-border-light dark:border-border-dark flex justify-between items-center sticky top-0 bg-primary-light dark:bg-secondary-dark z-10">
                    <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">Settings</h2>
                    <button onClick={onClose} className="text-text-light-secondary hover:text-text-light-primary dark:text-text-dark-secondary dark:hover:text-text-dark-primary"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-8">
                    
                    <div>
                        <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400 mb-3">Appearance</h3>
                         <div className="flex items-center justify-between bg-secondary-light dark:bg-tertiary-dark p-3 rounded-md">
                            <span className="font-medium text-text-light-primary dark:text-text-dark-primary">Theme</span>
                            <div className="flex items-center gap-1 rounded-md bg-tertiary-light dark:bg-primary-dark p-1">
                                <button onClick={() => setCurrentSettings(s => ({...s, theme: 'light'}))} className={`px-3 py-1 text-sm rounded-md transition-colors ${currentSettings.theme === 'light' ? 'bg-white shadow text-cyan-600 font-semibold' : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-tertiary-light/80 dark:hover:bg-tertiary-dark'}`}>Light</button>
                                <button onClick={() => setCurrentSettings(s => ({...s, theme: 'dark'}))} className={`px-3 py-1 text-sm rounded-md transition-colors ${currentSettings.theme === 'dark' ? 'bg-secondary-dark shadow text-cyan-400 font-semibold' : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-tertiary-light/80 dark:hover:bg-tertiary-dark'}`}>Dark</button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400 mb-3">Alerts & Notifications</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Default Latency Threshold (ms)</label>
                                    <input type="number" value={currentSettings.defaultLatencyThreshold} onChange={(e) => setCurrentSettings({...currentSettings, defaultLatencyThreshold: Number(e.target.value)})} className="w-full bg-secondary-light dark:bg-tertiary-dark rounded p-2 text-text-light-primary dark:text-text-dark-primary border border-border-light dark:border-border-dark" />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Default Packet Loss (%)</label>
                                    <input type="number" value={currentSettings.defaultPacketLossThreshold} onChange={(e) => setCurrentSettings({...currentSettings, defaultPacketLossThreshold: Number(e.target.value)})} className="w-full bg-secondary-light dark:bg-tertiary-dark rounded p-2 text-text-light-primary dark:text-text-dark-primary border border-border-light dark:border-border-dark" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Default Ping Interval (seconds)</label>
                                <input 
                                    type="number" 
                                    value={currentSettings.defaultPingInterval} 
                                    onChange={(e) => setCurrentSettings({...currentSettings, defaultPingInterval: Number(e.target.value)})} 
                                    className="w-full bg-secondary-light dark:bg-tertiary-dark rounded p-2 text-text-light-primary dark:text-text-dark-primary border border-border-light dark:border-border-dark"
                                    min="2"
                                    max="60"
                                />
                                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">How often to ping targets (2-60s). Can be overridden per target.</p>
                            </div>
                            <div className="flex items-center justify-between bg-secondary-light dark:bg-tertiary-dark p-3 rounded-md">
                                <span className="font-medium text-text-light-primary dark:text-text-dark-primary">Enable alert sound</span>
                                 <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={currentSettings.isSoundEnabled} onChange={(e) => setCurrentSettings({...currentSettings, isSoundEnabled: e.target.checked})} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-tertiary-light dark:bg-border-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                     <div>
                        <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400 mb-3">Integrations</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-secondary-light dark:bg-tertiary-dark p-3 rounded-md">
                                <div>
                                   <span className="font-medium text-text-light-primary dark:text-text-dark-primary">Gemini AI Analysis</span>
                                   {!isApiKeyAvailable && <p className="text-xs text-yellow-500 mt-1">API key is missing. Required for this feature.</p>}
                                </div>
                                 <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={currentSettings.isGeminiEnabled} onChange={(e) => setCurrentSettings({...currentSettings, isGeminiEnabled: e.target.checked})} className="sr-only peer" disabled={!isApiKeyAvailable} />
                                    <div className="w-11 h-6 bg-tertiary-light dark:bg-border-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 peer-disabled:opacity-50"></div>
                                </label>
                            </div>
                            <div>
                                <label htmlFor="email-webhook" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Email Alert Webhook URL</label>
                                <input 
                                    id="email-webhook"
                                    type="text" 
                                    value={currentSettings.emailWebhookUrl} 
                                    onChange={(e) => setCurrentSettings({...currentSettings, emailWebhookUrl: e.target.value})} 
                                    placeholder="https://your-backend.com/email-alert"
                                    className="w-full bg-secondary-light dark:bg-tertiary-dark rounded p-2 text-text-light-primary dark:text-text-dark-primary border border-border-light dark:border-border-dark" />
                                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">The URL of your secure backend service that handles sending emails.</p>
                            </div>
                            <div>
                                <label htmlFor="slack-webhook" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">Slack Alert Webhook URL</label>
                                <input 
                                    id="slack-webhook"
                                    type="text" 
                                    value={currentSettings.slackWebhookUrl} 
                                    onChange={(e) => setCurrentSettings({...currentSettings, slackWebhookUrl: e.target.value})}
                                    placeholder="https://hooks.slack.com/services/..." 
                                    className="w-full bg-secondary-light dark:bg-tertiary-dark rounded p-2 text-text-light-primary dark:text-text-dark-primary border border-border-light dark:border-border-dark" />
                                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">Your Slack Incoming Webhook URL. See HELP.md for instructions.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-secondary-light/50 dark:bg-primary-dark/50 border-t border-border-light dark:border-border-dark flex justify-end sticky bottom-0">
                    <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-md transition-colors">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;