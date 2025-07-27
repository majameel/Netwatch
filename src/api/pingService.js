
// api/pingService.js - Frontend service for making API calls
class PingService {
    constructor() {
        // Use relative URLs since frontend and backend are served from same container
        this.baseURL = '/api';
    }

    // Single ping
    async ping(target) {
        try {
            const response = await fetch(`${this.baseURL}/ping`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ target })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Ping API error:', error);
            return {
                target,
                alive: false,
                packetLoss: 100,
                responseTime: 0,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Bulk ping multiple targets
    async bulkPing(targets) {
        try {
            const response = await fetch(`${this.baseURL}/ping/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ targets })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.results;
        } catch (error) {
            console.error('Bulk ping API error:', error);
            // Return error results for all targets
            return targets.map(target => ({
                target,
                alive: false,
                packetLoss: 100,
                responseTime: 0,
                error: error.message,
                timestamp: new Date().toISOString()
            }));
        }
    }

    // Start continuous monitoring
    async startMonitoring(target, interval = 5000) {
        try {
            const response = await fetch(`${this.baseURL}/monitor/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ target, interval })
            });

            return await response.json();
        } catch (error) {
            console.error('Start monitoring error:', error);
            throw error;
        }
    }

    // Stop monitoring
    async stopMonitoring(target) {
        try {
            const response = await fetch(`${this.baseURL}/monitor/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ target })
            });

            return await response.json();
        } catch (error) {
            console.error('Stop monitoring error:', error);
            throw error;
        }
    }

    // Get active monitors
    async getActiveMonitors() {
        try {
            const response = await fetch(`${this.baseURL}/monitor/active`);
            return await response.json();
        } catch (error) {
            console.error('Get active monitors error:', error);
            return { activeMonitors: [] };
        }
    }

    // Health check
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return await response.json();
        } catch (error) {
            console.error('Health check error:', error);
            return { status: 'ERROR', error: error.message };
        }
    }
}

export default new PingService();
