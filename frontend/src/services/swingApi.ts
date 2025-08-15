import axios from 'axios';
import { SwingRecommendationsResponse } from '../types/swingRecommendations';

// API base URL - using proxy configuration from package.json
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const swingApi = {
  /**
   * Fetch swing recommendations from cache
   */
  async getSwingRecommendations(): Promise<SwingRecommendationsResponse> {
    try {
      const response = await api.post('/api/strategy/recommendations', { 
        strategy_type: 'swing-buy', 
        limit: 20 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching swing recommendations:', error);
      throw new Error('Failed to fetch swing recommendations');
    }
  },

  /**
   * Check if the API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await api.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  },
};

export default api; 