import React, { useContext, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PingResult, AppContextType } from '../types';
import { AppContext } from '../App';

interface PacketLossChartProps {
    history: PingResult[];
}

const PacketLossChart: React.FC<PacketLossChartProps> = ({ history }) => {
    const { settings } = useContext(AppContext) as AppContextType;
    const isDark = settings.theme === 'dark';

    const data = useMemo(() => {
        // Map each ping result directly to a 0% or 100% loss.
        // This provides an immediate, non-averaged view of packet drops.
        return history.map(point => ({
            time: new Date(point.timestamp).toLocaleTimeString(),
            loss: point.status === 'down' ? 100 : 0
        }));
    }, [history]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e5e7eb"} />
                <XAxis dataKey="time" stroke={isDark ? "#94a3b8" : "#6b7280"} tick={{ fontSize: 12 }} />
                <YAxis
                    stroke={isDark ? "#94a3b8" : "#6b7280"}
                    tick={{ fontSize: 12 }}
                    unit="%"
                    domain={[0, 100]}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
                        color: isDark ? '#e2e8f0' : '#111827'
                    }}
                    labelStyle={{ color: isDark ? '#e2e8f0' : '#111827' }}
                    formatter={(value: number) => [`${value.toFixed(0)}%`, 'loss']}
                />
                <Line type="stepAfter" dataKey="loss" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default PacketLossChart;