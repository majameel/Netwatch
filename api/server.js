const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;
const cron = require('node-cron');

class NetPulseAPI {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.dataPath = process.env.DATA_PATH || '/app/data';
        this.configPath = process.env.CONFIG_PATH || '/app/config';
        this.dbPath = path.join(this.dataPath, 'netpulse.db');
        
        this.initDatabase();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupScheduledTasks();
    }
    
    initDatabase() {
        this.db = new sqlite3.Database(this.dbPath);
        
        // Create targets table if it doesn't exist
        this.db.run(`
            CREATE TABLE IF NOT EXISTS targets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                host TEXT NOT NULL,
                type TEXT DEFAULT 'ping',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('📊 Database initialized with targets table');
    }
    
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
        
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }
    
    setupRoutes() {
        // Get all targets
        this.app.get('/api/targets', (req, res) => {
            try {
                this.db.all('SELECT * FROM targets ORDER BY created_at DESC', (err, rows) => {
                    if (err) {
                        console.error('Error fetching targets:', err);
                        return res.status(500).json({ 
                            success: false, 
                            error: 'Failed to fetch targets' 
                        });
                    }
                    res.json({ success: true, targets: rows });
                });
            } catch (error) {
                console.error('Error fetching targets:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to fetch targets' 
                });
            }
        });

        // Add new target
        this.app.post('/api/targets', (req, res) => {
            try {
                const { name, host, type = 'ping' } = req.body;
                
                if (!name || !host) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Name and host are required' 
                    });
                }
                
                const stmt = this.db.prepare(`
                    INSERT INTO targets (name, host, type) 
                    VALUES (?, ?, ?)
                `);
                
                const result = stmt.run(name, host, type);
                
                console.log(`✅ New target added: ${name} (${host})`);
                res.json({ 
                    success: true, 
                    target: { 
                        id: result.lastID, 
                        name, 
                        host, 
                        type 
                    } 
                });
                
            } catch (error) {
                console.error('Error adding target:', error);
                res.status(500).json({ 
                    success: false, 
                    error: 'Failed to add target' 
                });
            }
        });

        // Delete target
        this.app.delete('/api/targets/:id', async (req, res) => {
            try {
                const targetId = req.params.id;
                console.log(`🗑️ Deleting target with ID: ${targetId}`);
                
                // Remove from database
                const deleteStmt = this.db.prepare('DELETE FROM targets WHERE id = ?');
                const result = deleteStmt.run(targetId);
                
                if (result.changes === 0) {
                    return res.status(404).json({ 
                        success: false, 
                        error: 'Target not found' 
                    });
                }
                
                console.log(`✅ Target ${targetId} deleted successfully`);
                res.json({ 
                    success: true, 
                    message: 'Target deleted successfully',
                    deletedId: targetId
                });
                
            } catch (error) {
                console.error('Error deleting target:', error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });
        
        // Get all targets with current status
        this.app.get('/api/targets', async (req, res) => {
            try {
                const targets = await this.getTargetsStatus();
                res.json({ success: true, data: targets });
            } catch (error) {
                console.error('Error fetching targets:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Get historical data for a specific target
        this.app.get('/api/targets/:targetName/history', async (req, res) => {
            try {
                const { targetName } = req.params;
                const { hours = 24, limit = 1000 } = req.query;
                
                const history = await this.getTargetHistory(targetName, parseInt(hours), parseInt(limit));
                res.json({ success: true, data: history });
            } catch (error) {
                console.error('Error fetching target history:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Get incidents for a specific target
        this.app.get('/api/targets/:targetName/incidents', async (req, res) => {
            try {
                const { targetName } = req.params;
                const { days = 7 } = req.query;
                
                const incidents = await this.getTargetIncidents(targetName, parseInt(days));
                res.json({ success: true, data: incidents });
            } catch (error) {
                console.error('Error fetching incidents:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Get daily reports for a target
        this.app.get('/api/targets/:targetName/reports/daily', async (req, res) => {
            try {
                const { targetName } = req.params;
                const { days = 30 } = req.query;
                
                const reports = await this.getDailyReports(targetName, parseInt(days));
                res.json({ success: true, data: reports });
            } catch (error) {
                console.error('Error fetching daily reports:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Get overall statistics
        this.app.get('/api/statistics', async (req, res) => {
            try {
                const stats = await this.getOverallStatistics();
                res.json({ success: true, data: stats });
            } catch (error) {
                console.error('Error fetching statistics:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Get configuration
        this.app.get('/api/config', async (req, res) => {
            try {
                const config = await this.getConfiguration();
                res.json({ success: true, data: config });
            } catch (error) {
                console.error('Error fetching configuration:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Update configuration
        this.app.post('/api/config', async (req, res) => {
            try {
                const updatedConfig = await this.updateConfiguration(req.body);
                res.json({ success: true, data: updatedConfig });
            } catch (error) {
                console.error('Error updating configuration:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Ping endpoint for real-time monitoring
        this.app.post('/api/ping', async (req, res) => {
            try {
                const { target } = req.body;
                
                if (!target) {
                    return res.status(400).json({ error: 'Target is required' });
                }

                console.log(`🏓 Pinging ${target}...`);
                
                // Use Node.js ping library for cross-platform compatibility
                const ping = require('ping');
                const isWindows = process.platform === 'win32';
                
                const pingConfig = {
                    timeout: 8,
                    extra: isWindows ? ['-n', '4', '-w', '8000'] : ['-c', '4', '-W', '8'],
                    numeric: false,
                    min_reply: 1
                };

                const result = await ping.promise.probe(target, pingConfig);
                console.log('📊 Ping result:', JSON.stringify(result, null, 2));
                
                // Parse packet loss
                let packetLoss = 0;
                if (result.output) {
                    const output = result.output.toString();
                    
                    if (isWindows) {
                        const lossMatch = output.match(/\((\d+(?:\.\d+)?)%\s*loss\)/i);
                        if (lossMatch) {
                            packetLoss = parseFloat(lossMatch[1]);
                        }
                    } else {
                        const lossMatch = output.match(/(\d+(?:\.\d+)?)%\s+packet\s+loss/i);
                        if (lossMatch) {
                            packetLoss = parseFloat(lossMatch[1]);
                        }
                    }
                }
                
                // If completely offline, set 100% loss
                if (!result.alive || result.time === 'unknown' || result.time === false) {
                    packetLoss = 100;
                }

                // Parse response time
                let responseTime = null;
                if (result.alive && result.time !== 'unknown' && result.time !== false) {
                    responseTime = parseFloat(result.time);
                    if (isNaN(responseTime)) {
                        responseTime = null;
                    }
                }

                const response = {
                    target,
                    alive: result.alive && responseTime !== null && packetLoss < 100,
                    responseTime: responseTime,
                    packetLoss: Math.round(packetLoss * 100) / 100,
                    timestamp: new Date().toISOString(),
                    min: result.min === 'unknown' ? null : parseFloat(result.min) || null,
                    max: result.max === 'unknown' ? null : parseFloat(result.max) || null,
                    avg: result.avg === 'unknown' ? null : parseFloat(result.avg) || null,
                    stddev: result.stddev === 'unknown' ? null : parseFloat(result.stddev) || null
                };

                console.log(`✅ Ping response for ${target}:`, JSON.stringify(response, null, 2));
                res.json(response);

            } catch (error) {
                console.error('Error pinging target:', error);
                res.status(500).json({ 
                    error: 'Ping failed',
                    message: error.message,
                    target: req.body.target,
                    alive: false,
                    responseTime: null,
                    packetLoss: 100,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        // Generate custom report
        this.app.post('/api/reports/custom', async (req, res) => {
            try {
                const { targetName, startDate, endDate, reportType } = req.body;
                const report = await this.generateCustomReport(targetName, startDate, endDate, reportType);
                res.json({ success: true, data: report });
            } catch (error) {
                console.error('Error generating custom report:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Export data
        this.app.get('/api/export/:format/:targetName?', async (req, res) => {
            try {
                const { format, targetName } = req.params;
                const { startDate, endDate } = req.query;
                
                const exportData = await this.exportData(format, targetName, startDate, endDate);
                
                res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="netpulse-export-${Date.now()}.${format}"`);
                res.send(exportData);
            } catch (error) {
                console.error('Error exporting data:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
    }
    
    setupWebSocket() {
        // WebSocket server for real-time updates
        this.wss = new WebSocket.Server({ port: 8765 });
        
        this.wss.on('connection', (ws) => {
            console.log('WebSocket client connected');
            
            ws.on('close', () => {
                console.log('WebSocket client disconnected');
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
        });
    }
    
    setupScheduledTasks() {
        // Generate reports every hour
        cron.schedule('0 * * * *', () => {
            console.log('Running scheduled report generation...');
            this.generateScheduledReports();
        });
        
        // Cleanup old data daily at 2 AM
        cron.schedule('0 2 * * *', () => {
            console.log('Running scheduled data cleanup...');
            this.cleanupOldData();
        });
    }
    
    async getTargetsStatus() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const query = `
                SELECT 
                    pr.target_name,
                    pr.target_ip,
                    pr.timestamp,
                    pr.latency,
                    pr.status,
                    pr.packet_loss,
                    COUNT(pr2.id) as total_checks_today,
                    COUNT(CASE WHEN pr2.packet_loss = 1 THEN 1 END) as packet_loss_today,
                    AVG(CASE WHEN pr2.latency IS NOT NULL THEN pr2.latency END) as avg_latency_today
                FROM ping_results pr
                INNER JOIN (
                    SELECT target_name, MAX(timestamp) as latest_timestamp
                    FROM ping_results
                    GROUP BY target_name
                ) latest ON pr.target_name = latest.target_name AND pr.timestamp = latest.latest_timestamp
                LEFT JOIN ping_results pr2 ON pr.target_name = pr2.target_name 
                    AND DATE(pr2.timestamp) = DATE('now')
                GROUP BY pr.target_name, pr.target_ip, pr.timestamp, pr.latency, pr.status, pr.packet_loss
            `;
            
            db.all(query, (err, rows) => {
                db.close();
                
                if (err) {
                    reject(err);
                    return;
                }
                
                const targets = rows.map(row => ({
                    name: row.target_name,
                    ip: row.target_ip,
                    lastCheck: row.timestamp,
                    latency: row.latency,
                    status: this.parseStatus(row.status, row.latency),
                    packetLoss: row.packet_loss === 1,
                    todayStats: {
                        totalChecks: row.total_checks_today || 0,
                        packetLossCount: row.packet_loss_today || 0,
                        avgLatency: Math.round(row.avg_latency_today || 0),
                        uptimePercentage: row.total_checks_today > 0 
                            ? Math.round(((row.total_checks_today - row.packet_loss_today) / row.total_checks_today) * 100)
                            : 0
                    }
                }));
                
                resolve(targets);
            });
        });
    }
    
    async getTargetHistory(targetName, hours = 24, limit = 1000) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const query = `
                SELECT timestamp, latency, status, packet_loss
                FROM ping_results
                WHERE target_name = ? 
                    AND timestamp >= datetime('now', '-${hours} hours')
                ORDER BY timestamp DESC
                LIMIT ?
            `;
            
            db.all(query, [targetName, limit], (err, rows) => {
                db.close();
                
                if (err) {
                    reject(err);
                    return;
                }
                
                const history = rows.map(row => ({
                    timestamp: row.timestamp,
                    latency: row.latency,
                    status: row.status,
                    packetLoss: row.packet_loss === 1
                })).reverse(); // Return chronological order
                
                resolve(history);
            });
        });
    }
    
    async getTargetIncidents(targetName, days = 7) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const query = `
                SELECT *
                FROM incidents
                WHERE target_name = ? 
                    AND start_time >= datetime('now', '-${days} days')
                ORDER BY start_time DESC
            `;
            
            db.all(query, [targetName], (err, rows) => {
                db.close();
                
                if (err) {
                    reject(err);
                    return;
                }
                
                const incidents = rows.map(row => ({
                    id: row.id,
                    targetName: row.target_name,
                    targetIp: row.target_ip,
                    startTime: row.start_time,
                    endTime: row.end_time,
                    duration: row.duration_minutes,
                    type: row.incident_type,
                    maxLatency: row.max_latency,
                    packetLossCount: row.packet_loss_count,
                    resolved: row.resolved === 1
                }));
                
                resolve(incidents);
            });
        });
    }
    
    async getDailyReports(targetName, days = 30) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const query = `
                SELECT *
                FROM daily_reports
                WHERE target_name = ? 
                    AND report_date >= date('now', '-${days} days')
                ORDER BY report_date DESC
            `;
            
            db.all(query, [targetName], (err, rows) => {
                db.close();
                
                if (err) {
                    reject(err);
                    return;
                }
                
                const reports = rows.map(row => ({
                    date: row.report_date,
                    totalChecks: row.total_checks,
                    successfulChecks: row.successful_checks,
                    packetLossCount: row.packet_loss_count,
                    avgLatency: Math.round(row.avg_latency),
                    maxLatency: Math.round(row.max_latency),
                    minLatency: Math.round(row.min_latency),
                    uptimePercentage: Math.round(row.uptime_percentage * 100) / 100,
                    incidentsCount: row.incidents_count
                }));
                
                resolve(reports);
            });
        });
    }
    
    async getOverallStatistics() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            // Get overall stats for the last 24 hours
            const query = `
                SELECT 
                    COUNT(DISTINCT target_name) as total_targets,
                    COUNT(*) as total_checks,
                    COUNT(CASE WHEN packet_loss = 1 THEN 1 END) as total_packet_loss,
                    AVG(CASE WHEN latency IS NOT NULL THEN latency END) as avg_latency,
                    MAX(latency) as max_latency,
                    MIN(CASE WHEN latency IS NOT NULL THEN latency END) as min_latency
                FROM ping_results
                WHERE timestamp >= datetime('now', '-24 hours')
            `;
            
            db.get(query, (err, row) => {
                if (err) {
                    db.close();
                    reject(err);
                    return;
                }
                
                // Get incident count for last 24 hours
                db.get(`
                    SELECT COUNT(*) as incident_count
                    FROM incidents
                    WHERE start_time >= datetime('now', '-24 hours')
                `, (err2, incidentRow) => {
                    db.close();
                    
                    if (err2) {
                        reject(err2);
                        return;
                    }
                    
                    const stats = {
                        totalTargets: row.total_targets || 0,
                        totalChecks: row.total_checks || 0,
                        totalPacketLoss: row.total_packet_loss || 0,
                        avgLatency: Math.round(row.avg_latency || 0),
                        maxLatency: Math.round(row.max_latency || 0),
                        minLatency: Math.round(row.min_latency || 0),
                        overallUptime: row.total_checks > 0 
                            ? Math.round(((row.total_checks - row.total_packet_loss) / row.total_checks) * 100 * 100) / 100
                            : 0,
                        incidentCount: incidentRow.incident_count || 0,
                        timeWindow: '24 hours'
                    };
                    
                    resolve(stats);
                });
            });
        });
    }
    
    async getConfiguration() {
        try {
            const configFile = path.join(this.configPath, 'netpulse_config.json');
            const configData = await fs.readFile(configFile, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            throw new Error('Failed to read configuration');
        }
    }
    
    async updateConfiguration(newConfig) {
        try {
            const configFile = path.join(this.configPath, 'netpulse_config.json');
            await fs.writeFile(configFile, JSON.stringify(newConfig, null, 2));
            return newConfig;
        } catch (error) {
            throw new Error('Failed to update configuration');
        }
    }
    
    async generateCustomReport(targetName, startDate, endDate, reportType) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            let query = '';
            let params = [];
            
            if (reportType === 'summary') {
                query = `
                    SELECT 
                        DATE(timestamp) as date,
                        COUNT(*) as total_checks,
                        COUNT(CASE WHEN packet_loss = 1 THEN 1 END) as packet_loss_count,
                        AVG(CASE WHEN latency IS NOT NULL THEN latency END) as avg_latency,
                        MAX(latency) as max_latency,
                        MIN(CASE WHEN latency IS NOT NULL THEN latency END) as min_latency
                    FROM ping_results
                    WHERE target_name = ? AND DATE(timestamp) BETWEEN ? AND ?
                    GROUP BY DATE(timestamp)
                    ORDER BY date
                `;
                params = [targetName, startDate, endDate];
            } else if (reportType === 'incidents') {
                query = `
                    SELECT *
                    FROM incidents
                    WHERE target_name = ? AND DATE(start_time) BETWEEN ? AND ?
                    ORDER BY start_time
                `;
                params = [targetName, startDate, endDate];
            }
            
            db.all(query, params, (err, rows) => {
                db.close();
                
                if (err) {
                    reject(err);
                    return;
                }
                
                resolve({
                    targetName,
                    reportType,
                    startDate,
                    endDate,
                    data: rows,
                    generatedAt: new Date().toISOString()
                });
            });
        });
    }
    
    async exportData(format, targetName, startDate, endDate) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            let query = `
                SELECT timestamp, target_name, target_ip, latency, status, packet_loss
                FROM ping_results
                WHERE 1=1
            `;
            const params = [];
            
            if (targetName) {
                query += ' AND target_name = ?';
                params.push(targetName);
            }
            
            if (startDate) {
                query += ' AND DATE(timestamp) >= ?';
                params.push(startDate);
            }
            
            if (endDate) {
                query += ' AND DATE(timestamp) <= ?';
                params.push(endDate);
            }
            
            query += ' ORDER BY timestamp';
            
            db.all(query, params, (err, rows) => {
                db.close();
                
                if (err) {
                    reject(err);
                    return;
                }
                
                if (format === 'csv') {
                    const headers = 'Timestamp,Target Name,Target IP,Latency,Status,Packet Loss\n';
                    const csvData = rows.map(row => 
                        `${row.timestamp},${row.target_name},${row.target_ip},${row.latency || ''},${row.status},${row.packet_loss}`
                    ).join('\n');
                    resolve(headers + csvData);
                } else {
                    resolve(JSON.stringify(rows, null, 2));
                }
            });
        });
    }
    
    parseStatus(statusString, latency) {
        if (statusString.includes('PACKET_LOSS')) {
            return 'down';
        } else if (statusString.includes('HIGH_LATENCY')) {
            return 'degraded';
        } else if (statusString.includes('OK')) {
            return 'up';
        }
        return 'unknown';
    }
    
    async generateScheduledReports() {
        // Implementation for scheduled report generation
        console.log('Generating scheduled reports...');
    }
    
    async cleanupOldData() {
        // Implementation for old data cleanup
        console.log('Cleaning up old data...');
    }
    
    start() {
        this.app.listen(this.port, '0.0.0.0', () => {
            console.log(`🚀 NetPulse API Server running on port ${this.port}`);
            console.log(`📊 WebSocket server running on port 8765`);
            console.log(`💾 Database path: ${this.dbPath}`);
            console.log(`⚙️  Config path: ${this.configPath}`);
        });
    }
}

// Start the API server
const api = new NetPulseAPI();
api.start();
