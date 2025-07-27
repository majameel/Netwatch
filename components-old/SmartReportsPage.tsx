import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Download, FileText, TrendingUp, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Target {
  name: string;
  ip: string;
  lastCheck: string;
  latency: number | null;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  packetLoss: boolean;
  todayStats: {
    totalChecks: number;
    packetLossCount: number;
    avgLatency: number;
    uptimePercentage: number;
  };
}

interface DailyReport {
  date: string;
  totalChecks: number;
  successfulChecks: number;
  packetLossCount: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  uptimePercentage: number;
  incidentsCount: number;
}

interface Incident {
  id: number;
  targetName: string;
  targetIp: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  type: string;
  maxLatency: number | null;
  packetLossCount: number;
  resolved: boolean;
}

interface SmartReportsPageProps {
  targets: Target[];
  selectedTarget: string | null;
  onTargetSelect: (targetName: string) => void;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const SmartReportsPage: React.FC<SmartReportsPageProps> = ({ targets, selectedTarget, onTargetSelect }) => {
  const [reportType, setReportType] = useState<'daily' | 'incidents' | 'summary'>('daily');
  const [timeRange, setTimeRange] = useState(30); // days
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Fetch daily reports
  const fetchDailyReports = async (targetName: string, days: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/targets/${encodeURIComponent(targetName)}/reports/daily?days=${days}`);
      const result = await response.json();
      
      if (result.success) {
        setDailyReports(result.data);
      }
    } catch (error) {
      console.error('Error fetching daily reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch incidents
  const fetchIncidents = async (targetName: string, days: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/targets/${encodeURIComponent(targetName)}/incidents?days=${days}`);
      const result = await response.json();
      
      if (result.success) {
        setIncidents(result.data);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export report
  const exportReport = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/export/${format}/${selectedTarget}?startDate=${customDateRange.startDate}&endDate=${customDateRange.endDate}`);
      const data = await response.text();
      
      // Create download
      const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `netpulse-report-${selectedTarget}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  useEffect(() => {
    if (selectedTarget) {
      if (reportType === 'daily') {
        fetchDailyReports(selectedTarget, timeRange);
      } else if (reportType === 'incidents') {
        fetchIncidents(selectedTarget, timeRange);
      }
    }
  }, [selectedTarget, reportType, timeRange]);

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    if (dailyReports.length === 0) return null;

    const totalChecks = dailyReports.reduce((sum, report) => sum + report.totalChecks, 0);
    const totalSuccessful = dailyReports.reduce((sum, report) => sum + report.successfulChecks, 0);
    const totalPacketLoss = dailyReports.reduce((sum, report) => sum + report.packetLossCount, 0);
    const avgLatency = dailyReports.reduce((sum, report) => sum + report.avgLatency, 0) / dailyReports.length;
    const maxLatency = Math.max(...dailyReports.map(r => r.maxLatency));
    const overallUptime = totalChecks > 0 ? (totalSuccessful / totalChecks) * 100 : 0;
    const totalIncidents = dailyReports.reduce((sum, report) => sum + report.incidentsCount, 0);

    return {
      totalChecks,
      totalSuccessful,
      totalPacketLoss,
      avgLatency: Math.round(avgLatency),
      maxLatency,
      overallUptime: Math.round(overallUptime * 100) / 100,
      totalIncidents,
      daysAnalyzed: dailyReports.length
    };
  }, [dailyReports]);

  // Prepare chart data
  const chartData = dailyReports.map(report => ({
    date: new Date(report.date).toLocaleDateString(),
    uptime: report.uptimePercentage,
    avgLatency: report.avgLatency,
    incidents: report.incidentsCount,
    packetLoss: report.packetLossCount
  }));

  if (!selectedTarget) {
    return (
      <div className="reports-page">
        <div className="no-target-selected">
          <FileText size={48} />
          <h3>Select a Target</h3>
          <p>Choose a target from the list to view its reports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="smart-reports-page">
      {/* Header */}
      <div className="reports-header">
        <div className="header-content">
          <h2>📊 Smart Reports - {selectedTarget}</h2>
          <p>Comprehensive network performance analysis and incident tracking</p>
        </div>
        
        <div className="header-controls">
          <select 
            value={selectedTarget} 
            onChange={(e) => onTargetSelect(e.target.value)}
            className="target-selector"
          >
            {targets.map(target => (
              <option key={target.name} value={target.name}>
                {target.name} ({target.ip})
              </option>
            ))}
          </select>
          
          <div className="export-controls">
            <button onClick={() => exportReport('csv')} className="export-btn">
              <Download size={16} />
              CSV
            </button>
            <button onClick={() => exportReport('json')} className="export-btn">
              <Download size={16} />
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Report Controls */}
      <div className="report-controls">
        <div className="report-type-tabs">
          <button 
            className={reportType === 'daily' ? 'active' : ''}
            onClick={() => setReportType('daily')}
          >
            📈 Daily Analysis
          </button>
          <button 
            className={reportType === 'incidents' ? 'active' : ''}
            onClick={() => setReportType('incidents')}
          >
            🚨 Incident Reports
          </button>
          <button 
            className={reportType === 'summary' ? 'active' : ''}
            onClick={() => setReportType('summary')}
          >
            📋 Summary View
          </button>
        </div>

        <div className="time-range-controls">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Generating reports...</p>
        </div>
      )}

      {/* Report Content */}
      <div className="report-content">
        {reportType === 'daily' && summaryStats && (
          <div className="daily-reports">
            {/* Summary Stats */}
            <div className="summary-stats">
              <div className="stat-card">
                <CheckCircle className="stat-icon green" />
                <div className="stat-content">
                  <h3>{summaryStats.overallUptime}%</h3>
                  <p>Overall Uptime</p>
                </div>
              </div>
              <div className="stat-card">
                <TrendingUp className="stat-icon blue" />
                <div className="stat-content">
                  <h3>{summaryStats.avgLatency}ms</h3>
                  <p>Average Latency</p>
                </div>
              </div>
              <div className="stat-card">
                <XCircle className="stat-icon red" />
                <div className="stat-content">
                  <h3>{summaryStats.totalPacketLoss}</h3>
                  <p>Packet Loss Events</p>
                </div>
              </div>
              <div className="stat-card">
                <AlertCircle className="stat-icon orange" />
                <div className="stat-content">
                  <h3>{summaryStats.totalIncidents}</h3>
                  <p>Total Incidents</p>
                </div>
              </div>
            </div>

            {/* Uptime Trend Chart */}
            <div className="chart-container">
              <h3>📈 Daily Uptime Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value, name) => [`${value}%`, 'Uptime']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="uptime" 
                    stroke="#6bcf7f" 
                    fill="#6bcf7f"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Latency Trend Chart */}
            <div className="chart-container">
              <h3>⚡ Average Latency Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [`${value}ms`, 'Avg Latency']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgLatency" 
                    stroke="#45b7d1" 
                    strokeWidth={2}
                    dot={{ fill: '#45b7d1', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {reportType === 'incidents' && (
          <div className="incident-reports">
            {/* Incidents List */}
            <div className="incidents-list">
              <h3>📋 Recent Incidents</h3>
              <div className="incidents-table">
                <div className="table-header">
                  <span>Type</span>
                  <span>Start Time</span>
                  <span>Duration</span>
                  <span>Status</span>
                  <span>Details</span>
                </div>
                {incidents.map(incident => (
                  <div key={incident.id} className="table-row">
                    <span className={`incident-type ${incident.type.toLowerCase()}`}>
                      {incident.type.replace('_', ' ')}
                    </span>
                    <span>{new Date(incident.startTime).toLocaleString()}</span>
                    <span>
                      {incident.duration 
                        ? `${Math.round(incident.duration)} min` 
                        : 'Ongoing'}
                    </span>
                    <span className={`status ${incident.resolved ? 'resolved' : 'active'}`}>
                      {incident.resolved ? '✅ Resolved' : '🔴 Active'}
                    </span>
                    <span>
                      {incident.maxLatency && `Max: ${Math.round(incident.maxLatency)}ms`}
                      {incident.packetLossCount > 0 && ` | Loss: ${incident.packetLossCount}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {reportType === 'summary' && summaryStats && (
          <div className="summary-report">
            <div className="summary-grid">
              <div className="summary-section">
                <h3>📊 Performance Overview</h3>
                <div className="summary-details">
                  <div className="detail-row">
                    <span>Analysis Period:</span>
                    <span>{summaryStats.daysAnalyzed} days</span>
                  </div>
                  <div className="detail-row">
                    <span>Total Checks:</span>
                    <span>{summaryStats.totalChecks.toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span>Overall Uptime:</span>
                    <span className="uptime-value">{summaryStats.overallUptime}%</span>
                  </div>
                </div>
              </div>

              <div className="summary-section">
                <h3>⚡ Latency Statistics</h3>
                <div className="summary-details">
                  <div className="detail-row">
                    <span>Average Latency:</span>
                    <span>{summaryStats.avgLatency}ms</span>
                  </div>
                  <div className="detail-row">
                    <span>Maximum Latency:</span>
                    <span>{summaryStats.maxLatency}ms</span>
                  </div>
                </div>
              </div>

              <div className="summary-section">
                <h3>🚨 Reliability Metrics</h3>
                <div className="summary-details">
                  <div className="detail-row">
                    <span>Packet Loss Events:</span>
                    <span className="packet-loss-value">{summaryStats.totalPacketLoss}</span>
                  </div>
                  <div className="detail-row">
                    <span>Total Incidents:</span>
                    <span>{summaryStats.totalIncidents}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartReportsPage;
