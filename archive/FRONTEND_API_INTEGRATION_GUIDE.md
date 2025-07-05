# 📈 Frontend API Integration Guide - AlgoDiscovery Trading System

A comprehensive guide for frontend developers to integrate with the AlgoDiscovery Trading API. This system provides advanced algorithmic trading signals with **multi-seed Chartink algorithm integration** for enhanced stock discovery and recommendation generation.

## 🌟 What's New

### Multi-Seed Chartink Algorithm Approach
- **Dynamic Algorithm Weighting**: Adjust algorithm weights for different strategies
- **Seed Algorithm Management**: Enable/disable specific Chartink themes and custom scanners
- **Real-time Configuration**: Update algorithm settings without server restart
- **Performance Monitoring**: Track algorithm performance and effectiveness
- **Experimental Features**: Test new algorithms with configurable parameters

### New Configuration Endpoints
- Strategy configuration management
- Algorithm weight adjustment
- Seed algorithm control
- Experimental feature toggles
- Real-time configuration reloading

## 🚀 Getting Started

### Base URLs
- **Development**: `http://localhost:8888`
- **Production**: Update with your production URL

### Quick Health Check
```javascript
const response = await fetch('http://localhost:8888/health');
const health = await response.json();
console.log('API Status:', health);
```

## 🔐 Authentication & Configuration

### Basic API Client
```javascript
class AlgoDiscoveryAPI {
    constructor(baseURL = 'http://localhost:8888') {
        this.baseURL = baseURL;
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.headers,
            ...options
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Health Check
    async checkHealth() {
        return this.request('/health');
    }

    // Stock Data
    async getStockData(symbol) {
        return this.request(`/api/stock/${symbol}`);
    }

    async getMultipleStocks(symbols) {
        const symbolsParam = symbols.join(',');
        return this.request(`/api/stocks?symbols=${symbolsParam}`);
    }

    // Yahoo Finance Integration
    async getYahooData(symbol) {
        return this.request(`/api/yahoo/${symbol}`);
    }

    // Technical Analysis
    async getTechnicalAnalysis(symbol, timeframe = '1d') {
        return this.request(`/api/technical/${symbol}?timeframe=${timeframe}`);
    }

    // Intraday Trading
    async getIntradayBuyRecommendations(limit = 10) {
        return this.request(`/api/intraday/buy-recommendations?limit=${limit}`);
    }

    async getIntradayGapStocks(minGap = 2.0, limit = 10) {
        return this.request(`/api/intraday/gap-stocks?min_gap=${minGap}&limit=${limit}`);
    }

    async screenStocks(criteria = 'momentum_breakout', symbols = null, limit = 20) {
        let url = `/api/intraday/screener/${criteria}?limit=${limit}`;
        if (symbols) {
            url += `&symbols=${symbols.join(',')}`;
        }
        return this.request(url);
    }

    // NEW: Swing Trading Endpoints
    async getSwingBuyRecommendations(limit = 10, confidenceThreshold = 60.0, strengthThreshold = 65.0) {
        return this.request(`/api/swing/buy-recommendations?limit=${limit}&confidence_threshold=${confidenceThreshold}&strength_threshold=${strengthThreshold}`);
    }

    async getShortTermBuyRecommendations(limit = 10, confidenceThreshold = 55.0, strengthThreshold = 60.0) {
        return this.request(`/api/short-term/buy-recommendations?limit=${limit}&confidence_threshold=${confidenceThreshold}&strength_threshold=${strengthThreshold}`);
    }

    async getLongTermBuyRecommendations(limit = 10, confidenceThreshold = 50.0, strengthThreshold = 55.0) {
        return this.request(`/api/long-term/buy-recommendations?limit=${limit}&confidence_threshold=${confidenceThreshold}&strength_threshold=${strengthThreshold}`);
    }

    async getAllTimeframeRecommendations(limitPerStrategy = 5) {
        return this.request(`/api/trading/all-timeframes?limit_per_strategy=${limitPerStrategy}`);
    }

    async getTradingStrategies() {
        return this.request('/api/trading/strategies');
    }

    // **NEW** Configuration Management APIs
    async getConfigStrategies() {
        return this.request('/api/config/strategies');
    }

    async getStrategyConfig(strategyName) {
        return this.request(`/api/config/strategy/${strategyName}`);
    }

    async updateAlgorithmWeight(strategyName, algorithmName, newWeight) {
        return this.request(`/api/config/strategy/${strategyName}/algorithm/${algorithmName}/weight`, {
            method: 'POST',
            body: JSON.stringify({ new_weight: newWeight })
        });
    }

    async toggleAlgorithm(strategyName, algorithmName) {
        return this.request(`/api/config/strategy/${strategyName}/algorithm/${algorithmName}/toggle`, {
            method: 'POST'
        });
    }

    async getSeedAlgorithms(strategyName) {
        return this.request(`/api/config/seed-algorithms/${strategyName}`);
    }

    async reloadConfig() {
        return this.request('/api/config/reload', {
            method: 'POST'
        });
    }

    async getExperimentalFeatures() {
        return this.request('/api/config/experimental-features');
    }

    // **NEW** Advanced Intraday with Chartink Integration
    async getIntradayBuyWithChartink(chartinkTheme = 'intraday_buy', limit = 10, minConfidence = 60) {
        return this.request('/api/intraday/buy', {
            method: 'POST',
            body: JSON.stringify({
                chartink_theme: chartinkTheme,
                limit: limit,
                min_confidence: minConfidence
            })
        });
    }

    async getIntradaySellWithChartink(chartinkTheme = 'intraday_sell', limit = 10, minConfidence = 60) {
        return this.request('/api/intraday/sell', {
            method: 'POST',
            body: JSON.stringify({
                chartink_theme: chartinkTheme,
                limit: limit,
                min_confidence: minConfidence
            })
        });
    }

    async getRealtimeBuyRecommendations(chartinkTheme = 'intraday_buy', limit = 10) {
        return this.request('/api/intraday/realtime-buy-recommendations', {
            method: 'POST',
            body: JSON.stringify({
                chartink_theme: chartinkTheme,
                limit: limit
            })
        });
    }

    async getRealtimeSellRecommendations(chartinkTheme = 'intraday_sell', limit = 10) {
        return this.request('/api/intraday/realtime-sell-recommendations', {
            method: 'POST',
            body: JSON.stringify({
                chartink_theme: chartinkTheme,
                limit: limit
            })
        });
    }

    async getRealtimeCombinedRecommendations(buyTheme = 'intraday_buy', sellTheme = 'intraday_sell', limit = 10) {
        return this.request('/api/intraday/realtime-combined', {
            method: 'POST',
            body: JSON.stringify({
                buy_theme: buyTheme,
                sell_theme: sellTheme,
                limit: limit
            })
        });
    }

    // WebSocket Connection
    connectWebSocket() {
        return new WebSocket(`ws://${this.baseURL.replace('http://', '')}/ws`);
    }
}
```

## 📊 Core API Endpoints

### 1. Health & System Status
```javascript
// Check API health
const health = await api.checkHealth();
console.log('Services:', health.services);
```

### 2. Stock Data Endpoints

#### Single Stock Data
```javascript
const stockData = await api.getStockData('RELIANCE');
console.log('Price:', stockData.current_price);
console.log('Change:', stockData.change_percent);
```

#### Multiple Stocks
```javascript
const stocks = await api.getMultipleStocks(['RELIANCE', 'TCS', 'INFY']);
stocks.forEach(stock => {
    console.log(`${stock.symbol}: ₹${stock.current_price}`);
});
```

### 3. Yahoo Finance Integration
```javascript
const yahooData = await api.getYahooData('RELIANCE.NS');
console.log('Market Cap:', yahooData.market_cap);
console.log('P/E Ratio:', yahooData.pe_ratio);
```

### 4. Technical Analysis
```javascript
const technicals = await api.getTechnicalAnalysis('RELIANCE', '1d');
console.log('RSI:', technicals.rsi);
console.log('MACD:', technicals.macd);
```

### 5. Intraday Trading Recommendations
```javascript
// Get intraday buy signals
const intradayBuys = await api.getIntradayBuyRecommendations(5);
intradayBuys.forEach(signal => {
    console.log(`${signal.symbol}: Entry ₹${signal.entry_price}, Target ₹${signal.target_price}`);
});

// Screen stocks by criteria
const breakoutStocks = await api.screenStocks('momentum_breakout', null, 10);
console.log('Breakout candidates:', breakoutStocks.length);
```

### 6. NEW: Swing Trading Recommendations

#### Swing Buy (3-10 days)
```javascript
const swingBuys = await api.getSwingBuyRecommendations(10, 60.0, 65.0);
swingBuys.forEach(signal => {
    console.log(`${signal.symbol}: ${signal.timeframe} - Confidence: ${signal.confidence}%`);
});
```

#### Short-Term Buy (1-4 weeks)
```javascript
const shortTermBuys = await api.getShortTermBuyRecommendations(10, 55.0, 60.0);
shortTermBuys.forEach(signal => {
    console.log(`${signal.symbol}: Target Return ${signal.target_return}%`);
});
```

#### Long-Term Buy (1-6 months)
```javascript
const longTermBuys = await api.getLongTermBuyRecommendations(10, 50.0, 55.0);
longTermBuys.forEach(signal => {
    console.log(`${signal.symbol}: ${signal.reasoning}`);
});
```

#### All Timeframes
```javascript
const allRecommendations = await api.getAllTimeframeRecommendations(5);
console.log('Swing Buy:', allRecommendations.recommendations.swing_buy.length);
console.log('Short-Term:', allRecommendations.recommendations.short_term_buy.length);
console.log('Long-Term:', allRecommendations.recommendations.long_term_buy.length);
console.log('Summary:', allRecommendations.summary);
```

#### Trading Strategy Information
```javascript
const strategies = await api.getTradingStrategies();
Object.keys(strategies.strategies).forEach(strategyKey => {
    const strategy = strategies.strategies[strategyKey];
    console.log(`${strategy.name}: ${strategy.timeframe} - Target: ${strategy.target_return}`);
});
```

### 7. Real-time WebSocket Connection
```javascript
const ws = api.connectWebSocket();
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Real-time update:', data);
};
```

### 8. **NEW** Algorithm Configuration Management

#### Get All Strategies Configuration
```javascript
const strategiesConfig = await api.getConfigStrategies();
console.log('Available strategies:', strategiesConfig);
```

#### Get Specific Strategy Configuration  
```javascript
const swingConfig = await api.getStrategyConfig('swing_buy');
console.log('Swing strategy config:', swingConfig);
```

#### Update Algorithm Weight
```javascript
// Adjust the weight of a specific algorithm in a strategy
const result = await api.updateAlgorithmWeight('swing_buy', 'momentum_breakout', 0.8);
console.log('Weight updated:', result);
```

#### Toggle Algorithm On/Off
```javascript
// Enable or disable a specific algorithm
const toggleResult = await api.toggleAlgorithm('swing_buy', 'volume_surge');
console.log('Algorithm toggled:', toggleResult);
```

#### Get Seed Algorithms Performance
```javascript
const seedAlgorithms = await api.getSeedAlgorithms('swing_buy');
console.log('Chartink themes:', seedAlgorithms.chartink_themes);
console.log('Custom scanners:', seedAlgorithms.custom_scanners);
```

#### Reload Configuration
```javascript
// Reload configuration without restarting server
const reloadResult = await api.reloadConfig();
console.log('Configuration reloaded:', reloadResult);
```

#### Get Experimental Features
```javascript
const experimentalFeatures = await api.getExperimentalFeatures();
console.log('Experimental features:', experimentalFeatures);
```

### 9. **NEW** Multi-Seed Chartink Integration

#### Get Recommendations with Specific Chartink Theme
```javascript
// Use specific Chartink theme for stock discovery
const momentumStocks = await api.getIntradayBuyWithChartink('momentum_breakout', 10, 65);
momentumStocks.forEach(stock => {
    console.log(`${stock.symbol}: ${stock.reasoning} (Theme: ${stock.chartink_source})`);
});
```

#### Real-time Recommendations with Chartink
```javascript
// Get real-time buy recommendations with Chartink integration
const realtimeBuys = await api.getRealtimeBuyRecommendations('volume_surge', 8);
console.log('Real-time buy signals:', realtimeBuys);

// Get real-time sell recommendations
const realtimeSells = await api.getRealtimeSellRecommendations('intraday_sell', 8);
console.log('Real-time sell signals:', realtimeSells);
```

#### Combined Buy/Sell Recommendations
```javascript
// Get combined recommendations using different themes
const combinedSignals = await api.getRealtimeCombinedRecommendations(
    'momentum_breakout',  // buy theme
    'intraday_sell',      // sell theme
    10                    // limit
);
console.log('Combined signals:', combinedSignals);
```

#### Available Chartink Themes
```javascript
const availableThemes = [
    'intraday_buy',
    'intraday_sell',
    'momentum_breakout',
    'volume_surge',
    'gap_up_stocks',
    'oversold_bounce',
    'bullish_engulfing',
    'hammer_pattern',
    'macd_crossover',
    'rsi_oversold'
];

// Get recommendations for multiple themes
const multiThemeResults = await Promise.all(
    availableThemes.slice(0, 3).map(theme =>
        api.getIntradayBuyWithChartink(theme, 5, 60)
    )
);

multiThemeResults.forEach((results, index) => {
    console.log(`Theme ${availableThemes[index]}:`, results.length, 'recommendations');
});
```

### 10. Real-time WebSocket Connection
```javascript
const ws = api.connectWebSocket();
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Real-time update:', data);
};
```

## 🔌 Real-time Data Integration

### WebSocket Connection Class
```javascript
class TradingWebSocket {
    constructor(apiBaseURL = 'http://localhost:8888') {
        this.wsURL = `ws://${apiBaseURL.replace('http://', '')}/ws`;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.listeners = new Map();
    }

    connect() {
        try {
            this.ws = new WebSocket(this.wsURL);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };

            this.ws.onclose = () => {
                console.log('❌ WebSocket disconnected');
                this.handleReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
        }
    }

    handleMessage(data) {
        const { type, payload } = data;
        if (this.listeners.has(type)) {
            this.listeners.get(type).forEach(callback => callback(payload));
        }
    }

    subscribe(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }

    unsubscribe(eventType, callback) {
        if (this.listeners.has(eventType)) {
            const callbacks = this.listeners.get(eventType);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.connect();
            }, 3000 * this.reconnectAttempts);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}
```

## ⚛️ Frontend Framework Integration

### React Integration
```jsx
import React, { useState, useEffect } from 'react';

// Custom Hook for AlgoDiscovery API
const useAlgoDiscovery = () => {
    const [api] = useState(() => new AlgoDiscoveryAPI());
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const checkConnection = async () => {
            try {
                await api.checkHealth();
                setIsConnected(true);
            } catch (error) {
                setIsConnected(false);
            }
        };
        checkConnection();
    }, [api]);

    return { api, isConnected };
};

// Trading Dashboard Component
const TradingDashboard = () => {
    const { api, isConnected } = useAlgoDiscovery();
    const [recommendations, setRecommendations] = useState({
        swing: [],
        shortTerm: [],
        longTerm: []
    });
    const [loading, setLoading] = useState(false);

    const fetchAllRecommendations = async () => {
        setLoading(true);
        try {
            const [swing, shortTerm, longTerm] = await Promise.all([
                api.getSwingBuyRecommendations(5),
                api.getShortTermBuyRecommendations(5),
                api.getLongTermBuyRecommendations(5)
            ]);

            setRecommendations({
                swing,
                shortTerm,
                longTerm
            });
        } catch (error) {
            console.error('Failed to fetch recommendations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isConnected) {
            fetchAllRecommendations();
        }
    }, [isConnected]);

    if (!isConnected) {
        return <div>Connecting to AlgoDiscovery API...</div>;
    }

    if (loading) {
        return <div>Loading recommendations...</div>;
    }

    return (
        <div className="trading-dashboard">
            <h1>Trading Recommendations</h1>
            
            <div className="recommendations-grid">
                <RecommendationCard 
                    title="Swing Trading (3-10 days)" 
                    recommendations={recommendations.swing}
                    type="swing"
                />
                <RecommendationCard 
                    title="Short-Term (1-4 weeks)" 
                    recommendations={recommendations.shortTerm}
                    type="short-term"
                />
                <RecommendationCard 
                    title="Long-Term (1-6 months)" 
                    recommendations={recommendations.longTerm}
                    type="long-term"
                />
            </div>
            
            <button onClick={fetchAllRecommendations}>
                Refresh Recommendations
            </button>
        </div>
    );
};

const RecommendationCard = ({ title, recommendations, type }) => (
    <div className={`recommendation-card ${type}`}>
        <h3>{title}</h3>
        {recommendations.map((rec, index) => (
            <div key={index} className="recommendation-item">
                <div className="symbol">{rec.symbol}</div>
                <div className="price">₹{rec.entry_price}</div>
                <div className="target">Target: ₹{rec.target_price}</div>
                <div className="confidence">Confidence: {rec.confidence}%</div>
            </div>
        ))}
    </div>
);
```

### Vue.js Integration
```vue
<template>
  <div class="trading-app">
    <div v-if="!isConnected" class="loading">
      Connecting to AlgoDiscovery API...
    </div>
    
    <div v-else>
      <h1>Multi-Timeframe Trading Recommendations</h1>
      
      <div class="strategy-selector">
        <button 
          v-for="strategy in strategies" 
          :key="strategy.key"
          @click="activeStrategy = strategy.key"
          :class="{ active: activeStrategy === strategy.key }"
        >
          {{ strategy.name }}
        </button>
      </div>

      <div class="recommendations">
        <div v-if="loading" class="loading">Loading...</div>
        <div v-else>
          <div 
            v-for="rec in currentRecommendations" 
            :key="rec.symbol"
            class="recommendation-card"
          >
            <h3>{{ rec.symbol }}</h3>
            <p>Entry: ₹{{ rec.entry_price }}</p>
            <p>Target: ₹{{ rec.target_price }}</p>
            <p>Stop Loss: ₹{{ rec.stop_loss }}</p>
            <p>Confidence: {{ rec.confidence }}%</p>
            <p class="reasoning">{{ rec.reasoning }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';

export default {
  name: 'TradingApp',
  setup() {
    const api = new AlgoDiscoveryAPI();
    const isConnected = ref(false);
    const loading = ref(false);
    const activeStrategy = ref('swing');
    
    const recommendations = ref({
      swing: [],
      shortTerm: [],
      longTerm: []
    });

    const strategies = [
      { key: 'swing', name: 'Swing (3-10 days)' },
      { key: 'shortTerm', name: 'Short-Term (1-4 weeks)' },
      { key: 'longTerm', name: 'Long-Term (1-6 months)' }
    ];

    const currentRecommendations = computed(() => {
      return recommendations.value[activeStrategy.value] || [];
    });

    const checkConnection = async () => {
      try {
        await api.checkHealth();
        isConnected.value = true;
      } catch (error) {
        console.error('Connection failed:', error);
      }
    };

    const fetchRecommendations = async () => {
      loading.value = true;
      try {
        const [swing, shortTerm, longTerm] = await Promise.all([
          api.getSwingBuyRecommendations(10),
          api.getShortTermBuyRecommendations(10),
          api.getLongTermBuyRecommendations(10)
        ]);

        recommendations.value = {
          swing,
          shortTerm,
          longTerm
        };
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      await checkConnection();
      if (isConnected.value) {
        await fetchRecommendations();
      }
    });

    return {
      isConnected,
      loading,
      activeStrategy,
      strategies,
      currentRecommendations,
      fetchRecommendations
    };
  }
};
</script>
```

### Vanilla JavaScript Integration
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    const api = new AlgoDiscoveryAPI();
    let tradingStrategies = null;

    // Initialize the application
    await initializeApp();

    async function initializeApp() {
        try {
            // Check API health
            const health = await api.checkHealth();
            console.log('✅ API Connected:', health);

            // Load trading strategies information
            tradingStrategies = await api.getTradingStrategies();
            renderStrategyInfo();

            // Load initial recommendations
            await loadAllRecommendations();

            // Set up auto-refresh
            setInterval(loadAllRecommendations, 300000); // Refresh every 5 minutes

        } catch (error) {
            console.error('❌ Failed to initialize:', error);
            document.getElementById('app').innerHTML = '<div class="error">Failed to connect to AlgoDiscovery API</div>';
        }
    }

    async function loadAllRecommendations() {
        const loadingDiv = document.getElementById('loading');
        loadingDiv.style.display = 'block';

        try {
            const allTimeframes = await api.getAllTimeframeRecommendations(8);
            renderRecommendations(allTimeframes);
        } catch (error) {
            console.error('Failed to load recommendations:', error);
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    function renderStrategyInfo() {
        const strategiesDiv = document.getElementById('strategies');
        const strategiesHTML = Object.entries(tradingStrategies.strategies)
            .map(([key, strategy]) => `
                <div class="strategy-card">
                    <h3>${strategy.name}</h3>
                    <p><strong>Timeframe:</strong> ${strategy.timeframe}</p>
                    <p><strong>Target Return:</strong> ${strategy.target_return}</p>
                    <p><strong>Stop Loss:</strong> ${strategy.stop_loss}</p>
                    <p><strong>Risk Level:</strong> ${strategy.risk_level}</p>
                    <p><em>${strategy.best_for}</em></p>
                </div>
            `).join('');
        
        strategiesDiv.innerHTML = strategiesHTML;
    }

    function renderRecommendations(data) {
        const { recommendations, summary } = data;
        
        // Update summary
        document.getElementById('summary').innerHTML = `
            <div class="summary-stats">
                <div class="stat">
                    <span class="label">Total Recommendations:</span>
                    <span class="value">${summary.total_recommendations}</span>
                </div>
                <div class="stat">
                    <span class="label">Last Updated:</span>
                    <span class="value">${new Date(summary.timestamp).toLocaleString()}</span>
                </div>
            </div>
        `;

        // Render each timeframe
        renderTimeframeRecommendations('swing-recommendations', 'Swing Trading', recommendations.swing_buy);
        renderTimeframeRecommendations('short-term-recommendations', 'Short-Term', recommendations.short_term_buy);
        renderTimeframeRecommendations('long-term-recommendations', 'Long-Term', recommendations.long_term_buy);
    }

    function renderTimeframeRecommendations(containerId, title, recommendations) {
        const container = document.getElementById(containerId);
        
        const html = `
            <h3>${title} (${recommendations.length} recommendations)</h3>
            <div class="recommendations-grid">
                ${recommendations.map(rec => `
                    <div class="recommendation-item">
                        <div class="symbol">${rec.symbol}</div>
                        <div class="price-info">
                            <div>Entry: ₹${rec.entry_price}</div>
                            <div>Target: ₹${rec.target_price}</div>
                            <div>Stop Loss: ₹${rec.stop_loss}</div>
                        </div>
                        <div class="confidence-bar">
                            <div class="confidence-fill" style="width: ${rec.confidence}%"></div>
                            <span class="confidence-text">${rec.confidence}%</span>
                        </div>
                        <div class="reasoning">${rec.reasoning}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = html;
    }

    // Add refresh button functionality
    document.getElementById('refresh-btn').addEventListener('click', loadAllRecommendations);
});
```

## 🚨 Error Handling

### Comprehensive Error Management
```javascript
class APIError extends Error {
    constructor(message, status, response) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.response = response;
    }
}

// Enhanced API Client with Error Handling
class AlgoDiscoveryAPI {
    // ... previous code ...

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.headers,
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                
                // Try to get detailed error from response
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch (e) {
                    // Response is not JSON, use status text
                }
                
                throw new APIError(errorMessage, response.status, response);
            }
            
            return await response.json();
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            
            // Network or other errors
            console.error('API Request failed:', error);
            throw new APIError(`Network error: ${error.message}`, 0, null);
        }
    }

    // Retry wrapper for important operations
    async requestWithRetry(endpoint, options = {}, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.request(endpoint, options);
            } catch (error) {
                lastError = error;
                
                // Don't retry 4xx errors (client errors)
                if (error.status >= 400 && error.status < 500) {
                    throw error;
                }
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Wait before retrying (exponential backoff)
                const delay = Math.pow(2, attempt - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                
                console.log(`Retrying request (attempt ${attempt + 1}/${maxRetries})...`);
            }
        }
        
        throw lastError;
    }
}

// Error handling in components
const handleAPIError = (error) => {
    if (error instanceof APIError) {
        switch (error.status) {
            case 503:
                return 'Service temporarily unavailable. Please try again later.';
            case 500:
                return 'Internal server error. Please contact support.';
            case 404:
                return 'Requested data not found.';
            case 400:
                return 'Invalid request. Please check your parameters.';
            default:
                return error.message;
        }
    }
    
    return 'Network error. Please check your connection.';
};
```

## ⚡ Performance Optimization

### Caching Strategy
```javascript
class CachedAlgoDiscoveryAPI extends AlgoDiscoveryAPI {
    constructor(baseURL) {
        super(baseURL);
        this.cache = new Map();
        this.cacheExpiry = new Map();
    }

    async cachedRequest(endpoint, options = {}, cacheMinutes = 5) {
        const cacheKey = `${endpoint}${JSON.stringify(options)}`;
        const now = Date.now();
        
        // Check cache
        if (this.cache.has(cacheKey)) {
            const expiry = this.cacheExpiry.get(cacheKey);
            if (now < expiry) {
                console.log(`📋 Cache hit for ${endpoint}`);
                return this.cache.get(cacheKey);
            }
        }
        
        // Fetch fresh data
        console.log(`🌐 Fetching fresh data for ${endpoint}`);
        const data = await this.request(endpoint, options);
        
        // Cache the result
        this.cache.set(cacheKey, data);
        this.cacheExpiry.set(cacheKey, now + (cacheMinutes * 60 * 1000));
        
        return data;
    }

    // Override methods to use caching
    async getStockData(symbol) {
        return this.cachedRequest(`/api/stock/${symbol}`, {}, 2); // 2 minutes cache
    }

    async getTechnicalAnalysis(symbol, timeframe = '1d') {
        return this.cachedRequest(`/api/technical/${symbol}?timeframe=${timeframe}`, {}, 5);
    }

    async getTradingStrategies() {
        return this.cachedRequest('/api/trading/strategies', {}, 60); // 1 hour cache
    }

    clearCache() {
        this.cache.clear();
        this.cacheExpiry.clear();
    }
}
```

### Batch Operations
```javascript
// Efficient batch processing
class BatchProcessor {
    constructor(api, batchSize = 10, delayMs = 100) {
        this.api = api;
        this.batchSize = batchSize;
        this.delayMs = delayMs;
    }

    async processSymbolsBatch(symbols, processor) {
        const results = [];
        
        for (let i = 0; i < symbols.length; i += this.batchSize) {
            const batch = symbols.slice(i, i + this.batchSize);
            
            const batchPromises = batch.map(async (symbol) => {
                try {
                    return await processor(symbol);
                } catch (error) {
                    console.error(`Error processing ${symbol}:`, error);
                    return null;
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults.filter(result => result !== null));
            
            // Rate limiting
            if (i + this.batchSize < symbols.length) {
                await new Promise(resolve => setTimeout(resolve, this.delayMs));
            }
        }
        
        return results;
    }

    async getMultipleStockData(symbols) {
        return this.processSymbolsBatch(symbols, 
            symbol => this.api.getStockData(symbol)
        );
    }

    async getMultipleTechnicalAnalysis(symbols, timeframe = '1d') {
        return this.processSymbolsBatch(symbols, 
            symbol => this.api.getTechnicalAnalysis(symbol, timeframe)
        );
    }
}
```

## 📝 TypeScript Definitions

```typescript
// types/algoDiscovery.ts
export interface HealthStatus {
    status: string;
    timestamp: string;
    services: {
        [serviceName: string]: string;
    };
}

export interface StockData {
    symbol: string;
    name: string;
    current_price: number;
    change: number;
    change_percent: number;
    volume: number;
    market_cap?: number;
    indicators?: TechnicalIndicators;
}

export interface TechnicalIndicators {
    rsi?: number;
    macd?: number;
    sma_20?: number;
    ema_20?: number;
    bollinger_upper?: number;
    bollinger_lower?: number;
    volume_sma?: number;
}

export interface TradingSignal {
    id: string;
    symbol: string;
    signal_type: 'BUY' | 'SELL' | 'HOLD';
    entry_price: number;
    target_price: number;
    stop_loss: number;
    confidence: number;
    strength: number;
    reasoning: string;
    timeframe: string;
    indicators: TechnicalIndicators;
    created_at: string;
}

export interface SwingTradingStrategy {
    name: string;
    timeframe: string;
    holding_period: string;
    target_return: string;
    stop_loss: string;
    risk_level: string;
    best_for: string;
    characteristics: string[];
}

export interface TradingStrategiesResponse {
    strategies: {
        swing_buy: SwingTradingStrategy;
        short_term_buy: SwingTradingStrategy;
        long_term_buy: SwingTradingStrategy;
    };
    risk_management: {
        position_sizing: string;
        stop_losses: string;
        risk_reward_ratios: string;
        diversification: string;
    };
    technical_analysis: {
        indicators_used: string[];
        confirmation_signals: string;
        trend_analysis: string;
        volume_analysis: string;
    };
}

export interface AllTimeframeRecommendations {
    recommendations: {
        swing_buy: TradingSignal[];
        short_term_buy: TradingSignal[];
        long_term_buy: TradingSignal[];
    };
    summary: {
        swing_buy_count: number;
        short_term_buy_count: number;
        long_term_buy_count: number;
        total_recommendations: number;
        timestamp: string;
    };
}

// API Client TypeScript Class
export class TypedAlgoDiscoveryAPI {
    private baseURL: string;
    private headers: Record<string, string>;

    constructor(baseURL: string = 'http://localhost:8888') {
        this.baseURL = baseURL;
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    async checkHealth(): Promise<HealthStatus> {
        return this.request<HealthStatus>('/health');
    }

    async getStockData(symbol: string): Promise<StockData> {
        return this.request<StockData>(`/api/stock/${symbol}`);
    }

    async getSwingBuyRecommendations(
        limit: number = 10,
        confidenceThreshold: number = 60.0,
        strengthThreshold: number = 65.0
    ): Promise<TradingSignal[]> {
        return this.request<TradingSignal[]>(
            `/api/swing/buy-recommendations?limit=${limit}&confidence_threshold=${confidenceThreshold}&strength_threshold=${strengthThreshold}`
        );
    }

    async getAllTimeframeRecommendations(
        limitPerStrategy: number = 5
    ): Promise<AllTimeframeRecommendations> {
        return this.request<AllTimeframeRecommendations>(
            `/api/trading/all-timeframes?limit_per_strategy=${limitPerStrategy}`
        );
    }

    async getTradingStrategies(): Promise<TradingStrategiesResponse> {
        return this.request<TradingStrategiesResponse>('/api/trading/strategies');
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;
        const config: RequestInit = {
            headers: this.headers,
            ...options
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json() as T;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }
}
```

## 📋 Quick Reference

### Available Endpoints

#### System & Health
- `GET /health` - System health check
- `GET /api/version` - API version information
- `GET /api/market-status` - Current market status

#### Stock Data & Analysis
- `GET /api/stock/{symbol}` - Single stock data with technical indicators
- `GET /api/stocks/multiple?symbols=...` - Multiple stocks data
- `GET /api/stock/{symbol}/historical` - Historical price data
- `GET /api/stock/{symbol}/technical` - Technical analysis indicators
- `GET /api/yahoo/{symbol}` - Yahoo Finance data
- `GET /api/yahoo/{symbol}/price` - Yahoo Finance price only
- `GET /api/yahoo/{symbol}/history` - Yahoo Finance historical data
- `GET /api/yahoo/batch?symbols=...` - Batch Yahoo Finance data

#### Intraday Trading
- `GET /api/intraday/buy-recommendations` - Intraday buy signals
- `GET /api/intraday/sell-recommendations` - Intraday sell signals
- `GET /api/intraday/signals` - All intraday signals
- `GET /api/intraday/gap-stocks` - Gap trading opportunities
- `GET /api/intraday/momentum/{symbol}` - Momentum analysis for symbol
- `GET /api/intraday/vwap/{symbol}` - VWAP data for symbol
- `GET /api/intraday/top-movers` - Top moving stocks
- `GET /api/intraday/breakout-candidates` - Breakout candidates
- `GET /api/intraday/volume-leaders` - Volume leaders
- `GET /api/intraday/screener/{criteria}` - Stock screening by criteria
- `GET /api/intraday/screening-criteria` - Available screening criteria

#### **NEW** Advanced Intraday with Chartink Integration
- `POST /api/intraday/buy` - Buy recommendations with Chartink theme
- `POST /api/intraday/sell` - Sell recommendations with Chartink theme
- `POST /api/intraday/realtime-buy-recommendations` - Real-time buy with Chartink
- `POST /api/intraday/realtime-sell-recommendations` - Real-time sell with Chartink
- `POST /api/intraday/realtime-combined` - Combined real-time recommendations

#### Swing Trading
- `GET /api/swing/buy-recommendations` - Swing trading signals (3-10 days)
- `GET /api/short-term/buy-recommendations` - Short-term signals (1-4 weeks)
- `GET /api/long-term/buy-recommendations` - Long-term signals (1-6 months)
- `GET /api/trading/all-timeframes` - All timeframe recommendations
- `GET /api/trading/strategies` - Strategy information

#### **NEW** Configuration Management
- `GET /api/config/strategies` - All strategy configurations
- `GET /api/config/strategy/{strategy_name}` - Specific strategy config
- `POST /api/config/strategy/{strategy_name}/algorithm/{algorithm_name}/weight` - Update algorithm weight
- `POST /api/config/strategy/{strategy_name}/algorithm/{algorithm_name}/toggle` - Toggle algorithm
- `GET /api/config/seed-algorithms/{strategy_name}` - Get seed algorithms with performance
- `POST /api/config/reload` - Reload configuration
- `GET /api/config/experimental-features` - Get experimental features

#### Trading Signals & Portfolio
- `GET /api/signals/{symbol}` - Trading signals for specific symbol
- `GET /api/signals` - All trading signals
- `GET /api/portfolio` - Portfolio information

#### Admin Functions
- `POST /api/admin/start-background-jobs` - Start background processing
- `POST /api/admin/stop-background-jobs` - Stop background processing

#### Real-time Data
- `WebSocket /ws` - Live market data and signals

### **NEW** Request Body Examples

#### Chartink Integration Requests
```javascript
// POST /api/intraday/buy
{
    "chartink_theme": "momentum_breakout",
    "limit": 10,
    "min_confidence": 60
}

// POST /api/intraday/realtime-combined
{
    "buy_theme": "momentum_breakout",
    "sell_theme": "intraday_sell",
    "limit": 10
}

// POST /api/config/strategy/{strategy_name}/algorithm/{algorithm_name}/weight
{
    "new_weight": 0.8
}
```

### Common Parameters
- `limit`: Number of results (default: 10)
- `confidence_threshold`: Minimum confidence (0-100)
- `strength_threshold`: Minimum signal strength (0-100)
- `symbols`: Comma-separated stock symbols
- `timeframe`: Chart timeframe (1m, 5m, 15m, 1h, 1d)
- `chartink_theme`: Chartink discovery theme
- `min_confidence`: Minimum confidence for Chartink recommendations

### **NEW** Available Chartink Themes
- `intraday_buy` - General intraday buy signals
- `intraday_sell` - General intraday sell signals
- `momentum_breakout` - Momentum-based breakouts
- `volume_surge` - Volume surge patterns
- `gap_up_stocks` - Gap-up opportunities
- `oversold_bounce` - Oversold bounce plays
- `bullish_engulfing` - Bullish engulfing patterns
- `hammer_pattern` - Hammer candlestick patterns
- `macd_crossover` - MACD crossover signals
- `rsi_oversold` - RSI oversold conditions

## 📋 Quick Reference

### Available Endpoints

#### System & Health
- `GET /health` - System health check
- `GET /api/version` - API version information
- `GET /api/market-status` - Current market status

#### Stock Data & Analysis
- `GET /api/stock/{symbol}` - Single stock data with technical indicators
- `GET /api/stocks/multiple?symbols=...` - Multiple stocks data
- `GET /api/stock/{symbol}/historical` - Historical price data
- `GET /api/stock/{symbol}/technical` - Technical analysis indicators
- `GET /api/yahoo/{symbol}` - Yahoo Finance data
- `GET /api/yahoo/{symbol}/price` - Yahoo Finance price only
- `GET /api/yahoo/{symbol}/history` - Yahoo Finance historical data
- `GET /api/yahoo/batch?symbols=...` - Batch Yahoo Finance data

#### Intraday Trading
- `GET /api/intraday/buy-recommendations` - Intraday buy signals
- `GET /api/intraday/sell-recommendations` - Intraday sell signals
- `GET /api/intraday/signals` - All intraday signals
- `GET /api/intraday/gap-stocks` - Gap trading opportunities
- `GET /api/intraday/momentum/{symbol}` - Momentum analysis for symbol
- `GET /api/intraday/vwap/{symbol}` - VWAP data for symbol
- `GET /api/intraday/top-movers` - Top moving stocks
- `GET /api/intraday/breakout-candidates` - Breakout candidates
- `GET /api/intraday/volume-leaders` - Volume leaders
- `GET /api/intraday/screener/{criteria}` - Stock screening by criteria
- `GET /api/intraday/screening-criteria` - Available screening criteria

#### **NEW** Advanced Intraday with Chartink Integration
- `POST /api/intraday/buy` - Buy recommendations with Chartink theme
- `POST /api/intraday/sell` - Sell recommendations with Chartink theme
- `POST /api/intraday/realtime-buy-recommendations` - Real-time buy with Chartink
- `POST /api/intraday/realtime-sell-recommendations` - Real-time sell with Chartink
- `POST /api/intraday/realtime-combined` - Combined real-time recommendations

#### Swing Trading
- `GET /api/swing/buy-recommendations` - Swing trading signals (3-10 days)
- `GET /api/short-term/buy-recommendations` - Short-term signals (1-4 weeks)
- `GET /api/long-term/buy-recommendations` - Long-term signals (1-6 months)
- `GET /api/trading/all-timeframes` - All timeframe recommendations
- `GET /api/trading/strategies` - Strategy information

#### **NEW** Configuration Management
- `GET /api/config/strategies` - All strategy configurations
- `GET /api/config/strategy/{strategy_name}` - Specific strategy config
- `POST /api/config/strategy/{strategy_name}/algorithm/{algorithm_name}/weight` - Update algorithm weight
- `POST /api/config/strategy/{strategy_name}/algorithm/{algorithm_name}/toggle` - Toggle algorithm
- `GET /api/config/seed-algorithms/{strategy_name}` - Get seed algorithms with performance
- `POST /api/config/reload` - Reload configuration
- `GET /api/config/experimental-features` - Get experimental features

#### Trading Signals & Portfolio
- `GET /api/signals/{symbol}` - Trading signals for specific symbol
- `GET /api/signals` - All trading signals
- `GET /api/portfolio` - Portfolio information

#### Admin Functions
- `POST /api/admin/start-background-jobs` - Start background processing
- `POST /api/admin/stop-background-jobs` - Stop background processing

#### Real-time Data
- `WebSocket /ws` - Live market data and signals

### **NEW** Request Body Examples

#### Chartink Integration Requests
```javascript
// POST /api/intraday/buy
{
    "chartink_theme": "momentum_breakout",
    "limit": 10,
    "min_confidence": 60
}

// POST /api/intraday/realtime-combined
{
    "buy_theme": "momentum_breakout",
    "sell_theme": "intraday_sell",
    "limit": 10
}

// POST /api/config/strategy/{strategy_name}/algorithm/{algorithm_name}/weight
{
    "new_weight": 0.8
}
```

### Common Parameters
- `limit`: Number of results (default: 10)
- `confidence_threshold`: Minimum confidence (0-100)
- `strength_threshold`: Minimum signal strength (0-100)
- `symbols`: Comma-separated stock symbols
- `timeframe`: Chart timeframe (1m, 5m, 15m, 1h, 1d)
- `chartink_theme`: Chartink discovery theme
- `min_confidence`: Minimum confidence for Chartink recommendations

### **NEW** Available Chartink Themes
- `intraday_buy` - General intraday buy signals
- `intraday_sell` - General intraday sell signals
- `momentum_breakout` - Momentum-based breakouts
- `volume_surge` - Volume surge patterns
- `gap_up_stocks` - Gap-up opportunities
- `oversold_bounce` - Oversold bounce plays
- `bullish_engulfing` - Bullish engulfing patterns
- `hammer_pattern` - Hammer candlestick patterns
- `macd_crossover` - MACD crossover signals
- `rsi_oversold` - RSI oversold conditions

## 🔧 Algorithm Configuration Management

### Strategy Configuration Manager Class
```javascript
class StrategyConfigManager {
    constructor(api) {
        this.api = api;
    }

    async loadStrategies() {
        try {
            const strategies = await this.api.getConfigStrategies();
            return strategies;
        } catch (error) {
            console.error('Failed to load strategies:', error);
            throw error;
        }
    }

    async loadStrategyDetails(strategyName) {
        try {
            const config = await this.api.getStrategyConfig(strategyName);
            return config;
        } catch (error) {
            console.error(`Failed to load ${strategyName} config:`, error);
            throw error;
        }
    }

    async updateAlgorithmWeight(strategyName, algorithmName, weight) {
        try {
            const result = await this.api.updateAlgorithmWeight(strategyName, algorithmName, weight);
            console.log(`✅ Updated ${algorithmName} weight to ${weight}`);
            return result;
        } catch (error) {
            console.error(`Failed to update ${algorithmName} weight:`, error);
            throw error;
        }
    }

    async toggleAlgorithm(strategyName, algorithmName) {
        try {
            const result = await this.api.toggleAlgorithm(strategyName, algorithmName);
            console.log(`🔄 Toggled ${algorithmName} status`);
            return result;
        } catch (error) {
            console.error(`Failed to toggle ${algorithmName}:`, error);
            throw error;
        }
    }

    async loadSeedAlgorithms(strategyName) {
        try {
            const algorithms = await this.api.getSeedAlgorithms(strategyName);
            return algorithms;
        } catch (error) {
            console.error(`Failed to load seed algorithms for ${strategyName}:`, error);
            throw error;
        }
    }

    async reloadConfiguration() {
        try {
            const result = await this.api.reloadConfig();
            console.log('🔄 Configuration reloaded successfully');
            return result;
        } catch (error) {
            console.error('Failed to reload configuration:', error);
            throw error;
        }
    }
}

// Usage Example
const configManager = new StrategyConfigManager(api);

// Load and display strategies
configManager.loadStrategies().then(strategies => {
    console.log('Available strategies:', strategies);
});

// Update algorithm weight
configManager.updateAlgorithmWeight('swing_buy', 'momentum_breakout', 0.8);

// Toggle algorithm
configManager.toggleAlgorithm('swing_buy', 'volume_surge');
```

### Multi-Seed Chartink Integration Manager
```javascript
class ChartinkThemeManager {
    constructor(api) {
        this.api = api;
        this.availableThemes = [
            'intraday_buy',
            'intraday_sell', 
            'momentum_breakout',
            'volume_surge',
            'gap_up_stocks',
            'oversold_bounce',
            'bullish_engulfing',
            'hammer_pattern',
            'macd_crossover',
            'rsi_oversold'
        ];
    }

    async getRecommendationsWithTheme(theme, limit = 10) {
        try {
            const recommendations = await this.api.getIntradayBuyWithChartink(theme, limit);
            return {
                theme,
                recommendations,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`Failed to get recommendations for theme ${theme}:`, error);
            throw error;
        }
    }

    async getMultiThemeRecommendations(themes, limitPerTheme = 5) {
        try {
            const promises = themes.map(theme => 
                this.getRecommendationsWithTheme(theme, limitPerTheme)
            );
            
            const results = await Promise.all(promises);
            
            return {
                multi_theme_results: results,
                summary: {
                    total_themes: themes.length,
                    total_recommendations: results.reduce((sum, result) => 
                        sum + result.recommendations.length, 0
                    ),
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Failed to get multi-theme recommendations:', error);
            throw error;
        }
    }

    async getOptimalThemeWeights(strategyName) {
        try {
            const seedAlgorithms = await this.api.getSeedAlgorithms(strategyName);
            
            // Extract theme weights from chartink_themes
            const themeWeights = {};
            if (seedAlgorithms.chartink_themes) {
                seedAlgorithms.chartink_themes.forEach(theme => {
                    themeWeights[theme.name] = {
                        weight: theme.weight,
                        enabled: theme.enabled,
                        performance: theme.performance_metrics
                    };
                });
            }
            
            return themeWeights;
        } catch (error) {
            console.error(`Failed to get theme weights for ${strategyName}:`, error);
            throw error;
        }
    }

    async getBestPerformingThemes(strategyName, topN = 3) {
        try {
            const seedAlgorithms = await this.api.getSeedAlgorithms(strategyName);
            
            if (!seedAlgorithms.chartink_themes) {
                return [];
            }

            // Sort by performance metrics (assuming success_rate exists)
            const sortedThemes = seedAlgorithms.chartink_themes
                .filter(theme => theme.enabled)
                .sort((a, b) => {
                    const aPerf = a.performance_metrics?.success_rate || 0;
                    const bPerf = b.performance_metrics?.success_rate || 0;
                    return bPerf - aPerf;
                })
                .slice(0, topN);

            return sortedThemes;
        } catch (error) {
            console.error(`Failed to get best performing themes for ${strategyName}:`, error);
            throw error;
        }
    }
}

// Usage Example
const chartinkManager = new ChartinkThemeManager(api);

// Get recommendations with specific theme
chartinkManager.getRecommendationsWithTheme('momentum_breakout', 8)
    .then(result => {
        console.log('Momentum breakout recommendations:', result);
    });

// Get multi-theme recommendations
const themes = ['intraday_buy', 'volume_surge', 'gap_up_stocks'];
chartinkManager.getMultiThemeRecommendations(themes, 5)
    .then(results => {
        console.log('Multi-theme results:', results);
    });

// Get best performing themes for a strategy
chartinkManager.getBestPerformingThemes('swing_buy', 3)
    .then(bestThemes => {
        console.log('Best performing themes:', bestThemes);
    });
```

## 🔧 Best Practices

1. **Rate Limiting**: Implement request throttling to avoid overwhelming the API
2. **Error Handling**: Always wrap API calls in try-catch blocks
3. **Caching**: Cache frequently accessed data like strategy information
4. **WebSocket Management**: Properly handle WebSocket connections and reconnections
5. **Loading States**: Show loading indicators during API requests
6. **Offline Handling**: Implement graceful degradation when API is unavailable
7. **Type Safety**: Use TypeScript for better development experience
8. **Performance**: Batch requests when possible and implement pagination
9. **Security**: Never expose API keys in frontend code
10. **Testing**: Write unit tests for API integration functions

---

🚀 **Happy Trading with AlgoDiscovery!** 

For questions or support, check the API documentation at `http://localhost:8888/docs` when your server is running. 