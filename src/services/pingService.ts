import axios from 'axios';

const API_BASE_URL = '/api';

export interface PingResult {
  target: string;
  alive: boolean;
  responseTime: number | null;
  packetLoss: number;
  timestamp: string;
  min?: number;
  max?: number;
  avg?: number;
  stddev?: number;
}

export interface Target {
  target: string;
  lastCheck?: string;
  status: 'up' | 'down';
  latency?: number;
}

class PingService {
  async ping(target: string): Promise<PingResult> {
    try {
      const response = await axios.post(`${API_BASE_URL}/ping`, { target });
      return response.data;
    } catch (error) {
      console.error('Ping service error:', error);
      throw error;
    }
  }

  async getHistory(target: string): Promise<PingResult[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/history/${target}`);
      return response.data;
    } catch (error) {
      console.error('History service error:', error);
      throw error;
    }
  }

  async getTargets(): Promise<Target[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/targets`);
      return response.data;
    } catch (error) {
      console.error('Targets service error:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data;
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }
}

export const pingService = new PingService();
export default pingService;