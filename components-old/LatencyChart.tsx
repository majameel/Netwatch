import React, { useContext } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PingResult, AppContextType } from '../types';
import { AppContext } from '../App';

interface LatencyChartProps {
    history: PingResult[];
}

const LatencyChart: React.FC<LatencyChartProps> = ({ history }) => {
    const { settings } = useContext(AppContext) as AppContextType;
    const isDark = settings.theme === 'dark';

    const data = history.map(p => ({
        time: new Date(p.timestamp).toLocaleTimeString(),
        latency: p.status === 'up' ? p.latency : null,
        status: p.status
    }));

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e5e7eb"} />
                <XAxis dataKey="time" stroke={isDark ? "#94a3b8" : "#6b7280"} tick={{ fontSize: 12 }} />
                <YAxis stroke={isDark ? "#94a3b8" : "#6b7280"} tick={{ fontSize: 12 }} unit="ms" />
                <Tooltip
                    contentStyle={{
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                        color: isDark ? '#e2e8f0' : '#111827'
                    }}
                    labelStyle={{ color: isDark ? '#e2e8f0' : '#111827' }}
                    formatter={(value, name, props) => {
                         if(props.payload.status === 'down') return ['Packet Lost', 'status'];
                         return [`${value}ms`, 'latency'];
                    }}
                />
                <Line type="monotone" dataKey="latency" stroke="#06b6d4" strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default LatencyChart;