import React, { useState, useEffect } from 'react';
import { recommendationAPIService } from '../services/RecommendationAPIService';
import { API_CONFIG } from '../config/api';

const RecommendationServiceTest: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');
  const [swingRecommendations, setSwingRecommendations] = useState<any[]>([]);
  const [longBuyRecommendations, setLongBuyRecommendations] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkServiceHealth();
  }, []);

  const checkServiceHealth = async () => {
    try {
      setHealthStatus('Checking...');
      const health = await recommendationAPIService.healthCheck();
      setHealthStatus(`✅ Healthy - ${health.status}`);
      setError('');
    } catch (err: any) {
      setHealthStatus('❌ Unhealthy');
      setError(`Health check failed: ${err.message}`);
    }
  };

  const testSwingRecommendations = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await recommendationAPIService.getRecommendationsByType('swing', {
        max_recommendations: 5,
        min_score: 70.0,
        risk_profile: 'moderate'
      });
      
      if (response.success) {
        setSwingRecommendations(response.items || response.recommendations || []);
      } else {
        setError('API returned error');
      }
    } catch (err: any) {
      setError(`Failed to fetch swing recommendations: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testLongBuyRecommendations = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await recommendationAPIService.getRecommendationsByType('long-buy', {
        max_recommendations: 5,
        min_score: 80.0,
        risk_profile: 'conservative'
      });
      
      if (response.success) {
        setLongBuyRecommendations(response.items || response.recommendations || []);
      } else {
        setError('API returned error');
      }
    } catch (err: any) {
      setError(`Failed to fetch long-buy recommendations: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getServiceInfo = () => {
    const info = recommendationAPIService.getServiceInfo();
    return info;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Recommendation Service Test
      </h2>
      
      {/* Service Configuration */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Service Configuration</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Base URL:</span>
            <span className="ml-2 text-blue-600">{getServiceInfo().baseUrl}</span>
          </div>
          <div>
            <span className="font-medium">Timeout:</span>
            <span className="ml-2">{getServiceInfo().timeout}ms</span>
          </div>
          <div>
            <span className="font-medium">Retry Attempts:</span>
            <span className="ml-2">{getServiceInfo().retryAttempts}</span>
          </div>
          <div>
            <span className="font-medium">Retry Delay:</span>
            <span className="ml-2">{getServiceInfo().retryDelay}ms</span>
          </div>
        </div>
      </div>

      {/* Health Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Health Status</h3>
        <div className="flex items-center gap-4">
          <span className="text-lg">{healthStatus}</span>
          <button
            onClick={checkServiceHealth}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Refresh Health
          </button>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={testSwingRecommendations}
          disabled={isLoading}
          className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Testing...' : 'Test Swing Recommendations'}
        </button>
        
        <button
          onClick={testLongBuyRecommendations}
          disabled={isLoading}
          className="px-6 py-3 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Testing...' : 'Test Long-Buy Recommendations'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-red-800">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Swing Recommendations */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Swing Recommendations ({swingRecommendations.length})
          </h3>
          {swingRecommendations.length > 0 ? (
            <div className="space-y-2">
              {swingRecommendations.map((rec, index) => (
                <div key={index} className="p-3 bg-white rounded border">
                  <div className="font-medium">{rec.symbol}</div>
                  <div className="text-sm text-gray-600">{rec.name}</div>
                  <div className="text-sm">Score: {rec.score}</div>
                  <div className="text-sm">Price: ₹{rec.price}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recommendations yet. Click the test button above.</p>
          )}
        </div>

        {/* Long-Buy Recommendations */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            Long-Buy Recommendations ({longBuyRecommendations.length})
          </h3>
          {longBuyRecommendations.length > 0 ? (
            <div className="space-y-2">
              {longBuyRecommendations.map((rec, index) => (
                <div key={index} className="p-3 bg-white rounded border">
                  <div className="font-medium">{rec.symbol}</div>
                  <div className="text-sm text-gray-600">{rec.name}</div>
                  <div className="text-sm">Score: {rec.score}</div>
                  <div className="text-sm">Price: ₹{rec.price}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recommendations yet. Click the test button above.</p>
          )}
        </div>
      </div>

      {/* Environment Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">Environment Variables</h3>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div>
            <span className="font-medium">REACT_APP_RECOMMENDATION_API_BASE_URL:</span>
            <span className="ml-2 text-blue-600">
              {process.env.REACT_APP_RECOMMENDATION_API_BASE_URL || 'Not set (using default)'}
            </span>
          </div>
          <div>
            <span className="font-medium">REACT_APP_THEME_API_BASE_URL:</span>
            <span className="ml-2 text-blue-600">
              {process.env.REACT_APP_THEME_API_BASE_URL || 'Not set (using default)'}
            </span>
          </div>
          <div>
            <span className="font-medium">NODE_ENV:</span>
            <span className="ml-2 text-blue-600">{process.env.NODE_ENV}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationServiceTest;
