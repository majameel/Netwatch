import type { Dispatch, SetStateAction } from 'react';

export interface PingResult {
    targetName?: string;
    address: string;
    status: 'up' | 'down';
    latency: number | null;
    timestamp: string;
}

export interface Target {
    id: string;
    name: string;
    address: string;
    status: {
        latency: number | null;
        packetLoss: number;
    };
    isMonitoring: boolean;
    history: PingResult[];
    totalChecks: number;
    consecutiveFailures: number;
    latencyThreshold?: number;
    packetLossThreshold?: number;
    pingInterval?: number;
}

export interface Alert {
    id: string;
    targetId: string;
    targetName: string;
    timestamp: string;
    type: 'latency' | 'loss';
    value: number;
    proof: PingResult[];
    geminiAnalysis: string;
    consecutiveFailures: number;
    totalChecks: number;
    currentStatus: string;
}

export interface Settings {
    defaultLatencyThreshold: number;
    defaultPacketLossThreshold: number;
    emailWebhookUrl: string;
    slackWebhookUrl: string;
    isGeminiEnabled: boolean;
    theme: 'light' | 'dark';
    isSoundEnabled: boolean;
    defaultPingInterval: number;
}

export interface WebhookPayload {
    title: string;
    body: string;
}

export interface AppContextType {
    targets: Target[];
    alerts: Alert[];
    setAlerts: Dispatch<SetStateAction<Alert[]>>;
    settings: Settings;
    liveLogs: PingResult[];
    setSettings: Dispatch<SetStateAction<Settings>>;
    deleteTarget: (id: string) => void;
    toggleMonitoring: (id: string) => void;
    updateTargetSettings: (id: string, latencyThreshold: number | undefined, packetLossThreshold: number | undefined, pingInterval: number | undefined) => void;
    getHistoryForTarget: (id: string) => PingResult[];
    exportToCsv: (data: any[], filename: string) => void;
    view: 'dashboard' | 'reports';
    setView: Dispatch<SetStateAction<'dashboard' | 'reports'>>;
}