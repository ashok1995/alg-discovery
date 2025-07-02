# Indian Long-Term Investment API Integration Guide

## Overview
This API provides advanced stock recommendations for Indian equity markets (BSE/NSE) using combination query variants and multi-factor analysis.

**Base URL**: `http://localhost:8001`  
**API Version**: 2.0.0  
**Market Focus**: BSE/NSE Indian Equities  
**Default Results**: Top 20 recommendations  

---

## 🚀 Quick Start

### Health Check
```javascript
// Check if API is running
const response = await fetch('http://localhost:8001/health');
const health = await response.json();
console.log(health.status); // "healthy"
```

### Get Stock Recommendations
```javascript
// Get top 20 stock recommendations with default settings
const response = await fetch('http://localhost:8001/api/longterm/long-buy-recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        limit_per_query: 30,
        min_score: 0.6,
        top_recommendations: 20
    })
});
const recommendations = await response.json();
```

---

## 📖 Core Endpoints

### 1. Long Buy Recommendations (Main Endpoint)

**POST** `/api/longterm/long-buy-recommendations`

Get stock recommendations using combination of query variants.

#### Request Body
```typescript
interface LongBuyRequest {
    combination?: {
        fundamental: "v1.0" | "v1.1" | "v2.0";
        momentum: "v1.0" | "v1.1" | "v2.0";
        value: "v1.0" | "v1.1" | "v1.2";
        quality: "v1.0" | "v1.1" | "v1.2";
    };
    limit_per_query?: number;  // Default: 30
    min_score?: number;        // Default: 0.6
    top_recommendations?: number; // Default: 20
}
```

#### Example Request
```javascript
const getRecommendations = async (customCombination = null) => {
    const payload = {
        limit_per_query: 30,
        min_score: 0.5,
        top_recommendations: 20
    };
    
    if (customCombination) {
        payload.combination = customCombination;
    }
    
    const response = await fetch('http://localhost:8001/api/longterm/long-buy-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
};

// Usage examples:
// Default combination
const defaultRecs = await getRecommendations();

// Custom combination
const customRecs = await getRecommendations({
    fundamental: "v2.0",
    momentum: "v2.0", 
    value: "v1.2",
    quality: "v1.2"
});
```

#### Response Format
```typescript
interface RecommendationResponse {
    status: "success" | "error";
    long_buy_recommendations: Array<{
        symbol: string;
        price: string;
        score: number;
        categories: string[];
        appearances: number;
        volume: number | string;
    }>;
    combination_used: {
        fundamental: string;
        momentum: string;
        value: string;
        quality: string;
    };
    performance_metrics: {
        unique_stocks: number;
        total_stocks_found: number;
        multi_category_stocks: number;
        diversity_score: number;
        performance_score: number;
    };
    total_recommendations: number;
    timestamp: string;
}
```

---

### 2. Available Query Variants

**GET** `/api/longterm/available-variants`

Get all available query variants for building custom combinations.

#### Example Request
```javascript
const getAvailableVariants = async () => {
    const response = await fetch('http://localhost:8001/api/longterm/available-variants');
    return await response.json();
};

const variants = await getAvailableVariants();
console.log(variants.total_combinations); // 81 possible combinations
```

#### Response Format
```typescript
interface VariantsResponse {
    status: "success";
    variants: {
        [category: string]: {
            [version: string]: {
                name: string;
                description: string;
                weight: number;
                expected_results: number | string;
            };
        };
    };
    total_categories: number;
    total_combinations: number;
}
```

---

### 3. Test Custom Combinations

**POST** `/api/longterm/test-combination`

Test specific combinations and get detailed performance metrics.

#### Request Body
```typescript
interface CombinationTestRequest {
    fundamental_version: string;
    momentum_version: string;
    value_version: string;
    quality_version: string;
    limit_per_query?: number; // Default: 30
}
```

#### Example Request
```javascript
const testCombination = async (fundamental, momentum, value, quality) => {
    const response = await fetch('http://localhost:8001/api/longterm/test-combination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fundamental_version: fundamental,
            momentum_version: momentum,
            value_version: value,
            quality_version: quality,
            limit_per_query: 30
        })
    });
    
    return await response.json();
};

const testResults = await testCombination("v2.0", "v2.0", "v1.2", "v1.2");
```

---

## 🔧 Utility Endpoints

### Health Check
**GET** `/health`
```javascript
const checkHealth = async () => {
    const response = await fetch('http://localhost:8001/health');
    return await response.json();
};
```

### Fundamental Analysis
**POST** `/api/longterm/fundamental-analysis?symbol=RELIANCE`
```javascript
const analyzeStock = async (symbol) => {
    const response = await fetch(`http://localhost:8001/api/longterm/fundamental-analysis?symbol=${symbol}`, {
        method: 'POST'
    });
    return await response.json();
};
```

---

## 🎨 Frontend Integration Examples

### React Hook Example
```typescript
import { useState, useEffect } from 'react';

interface Stock {
    symbol: string;
    price: string;
    score: number;
    categories: string[];
    appearances: number;
    volume: number | string;
}

const useStockRecommendations = () => {
    const [recommendations, setRecommendations] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRecommendations = async (combination?: any) => {
        setLoading(true);
        setError(null);
        
        try {
            const payload = {
                limit_per_query: 30,
                min_score: 0.6,
                top_recommendations: 20,
                ...(combination && { combination })
            };
            
            const response = await fetch('http://localhost:8001/api/longterm/long-buy-recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            
            const data = await response.json();
            setRecommendations(data.long_buy_recommendations || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    return { recommendations, loading, error, fetchRecommendations };
};

// Usage in component:
const StockList = () => {
    const { recommendations, loading, error, fetchRecommendations } = useStockRecommendations();
    
    useEffect(() => {
        fetchRecommendations(); // Fetch on mount
    }, []);

    if (loading) return <div>Loading recommendations...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <h2>Top {recommendations.length} Stock Recommendations</h2>
            {recommendations.map(stock => (
                <div key={stock.symbol} className="stock-card">
                    <h3>{stock.symbol}</h3>
                    <p>Price: ₹{stock.price}</p>
                    <p>Score: {stock.score.toFixed(2)}</p>
                    <p>Categories: {stock.categories.join(', ')}</p>
                    <p>Appears in {stock.appearances} categories</p>
                </div>
            ))}
        </div>
    );
};
```

### Vue.js Composition API Example
```typescript
import { ref, onMounted } from 'vue';

export const useStockApi = () => {
    const recommendations = ref([]);
    const loading = ref(false);
    const variants = ref({});

    const fetchRecommendations = async (combination = null) => {
        loading.value = true;
        try {
            const response = await fetch('http://localhost:8001/api/longterm/long-buy-recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    combination,
                    limit_per_query: 30,
                    min_score: 0.6,
                    top_recommendations: 20
                })
            });
            
            const data = await response.json();
            recommendations.value = data.long_buy_recommendations || [];
        } catch (error) {
            console.error('Error fetching recommendations:', error);
        } finally {
            loading.value = false;
        }
    };

    const fetchVariants = async () => {
        try {
            const response = await fetch('http://localhost:8001/api/longterm/available-variants');
            const data = await response.json();
            variants.value = data.variants || {};
        } catch (error) {
            console.error('Error fetching variants:', error);
        }
    };

    onMounted(() => {
        fetchVariants();
        fetchRecommendations();
    });

    return {
        recommendations,
        loading,
        variants,
        fetchRecommendations,
        fetchVariants
    };
};
```

### Vanilla JavaScript Example
```javascript
class StockRecommendationAPI {
    constructor(baseUrl = 'http://localhost:8001') {
        this.baseUrl = baseUrl;
    }

    async healthCheck() {
        const response = await fetch(`${this.baseUrl}/health`);
        return await response.json();
    }

    async getRecommendations(options = {}) {
        const defaultOptions = {
            limit_per_query: 30,
            min_score: 0.6,
            top_recommendations: 20
        };

        const payload = { ...defaultOptions, ...options };

        const response = await fetch(`${this.baseUrl}/api/longterm/long-buy-recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    async getVariants() {
        const response = await fetch(`${this.baseUrl}/api/longterm/available-variants`);
        return await response.json();
    }

    async testCombination(fundamental, momentum, value, quality) {
        const response = await fetch(`${this.baseUrl}/api/longterm/test-combination`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fundamental_version: fundamental,
                momentum_version: momentum,
                value_version: value,
                quality_version: quality
            })
        });

        return await response.json();
    }
}

// Usage:
const api = new StockRecommendationAPI();

// Get default recommendations
api.getRecommendations()
    .then(data => console.log('Recommendations:', data.long_buy_recommendations))
    .catch(error => console.error('Error:', error));

// Get custom recommendations
api.getRecommendations({
    combination: {
        fundamental: "v2.0",
        momentum: "v2.0",
        value: "v1.2", 
        quality: "v1.2"
    },
    top_recommendations: 15
}).then(data => console.log('Custom recommendations:', data));
```

---

## 🎯 Strategy Combinations

### Pre-defined Strategies

#### Conservative (Lower Risk)
```javascript
const conservativeStrategy = {
    fundamental: "v2.0",  // Advanced fundamental screening
    momentum: "v1.0",     // Basic momentum 
    value: "v1.0",        // Traditional value
    quality: "v1.2"       // Dividend quality focus
};
```

#### Balanced (Moderate Risk)
```javascript
const balancedStrategy = {
    fundamental: "v1.1",  // Enhanced fundamental quality
    momentum: "v1.1",     // Enhanced volume momentum
    value: "v1.1",        // Modern value with quality
    quality: "v1.1"       // Enhanced quality assessment
};
```

#### Aggressive (Higher Risk/Return)
```javascript
const aggressiveStrategy = {
    fundamental: "v2.0",  // Advanced fundamental screening
    momentum: "v2.0",     // Multi-timeframe momentum
    value: "v1.2",        // Growth at reasonable price
    quality: "v1.1"       // Enhanced quality assessment
};
```

#### Growth Focused
```javascript
const growthStrategy = {
    fundamental: "v1.1",  // Enhanced fundamental quality
    momentum: "v2.0",     // Multi-timeframe momentum
    value: "v1.2",        // Growth at reasonable price
    quality: "v1.0"       // Basic quality metrics
};
```

---

## ⚡ Performance Optimization

### Caching Recommendations
```javascript
class CachedStockAPI {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async getRecommendations(options = {}) {
        const cacheKey = JSON.stringify(options);
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        const data = await this.fetchRecommendations(options);
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        return data;
    }

    async fetchRecommendations(options) {
        // ... actual API call
    }
}
```

### Rate Limiting
```javascript
class RateLimitedAPI {
    constructor(maxRequestsPerMinute = 20) {
        this.requests = [];
        this.maxRequests = maxRequestsPerMinute;
    }

    async makeRequest(url, options) {
        // Clean old requests
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < 60000);

        // Check rate limit
        if (this.requests.length >= this.maxRequests) {
            const waitTime = 60000 - (now - this.requests[0]);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.requests.push(now);
        return fetch(url, options);
    }
}
```

---

## 🔒 Error Handling

### Comprehensive Error Handling
```javascript
const handleAPIError = (error, response) => {
    if (response?.status === 503) {
        return "Service temporarily unavailable. Please try again later.";
    } else if (response?.status === 500) {
        return "Internal server error. Please contact support.";
    } else if (response?.status === 404) {
        return "Endpoint not found. Please check the API documentation.";
    } else if (response?.status === 400) {
        return "Invalid request. Please check your parameters.";
    } else {
        return `Network error: ${error.message}`;
    }
};

const safeAPICall = async (apiFunction, ...args) => {
    try {
        const response = await apiFunction(...args);
        if (!response.ok) {
            throw new Error(handleAPIError(null, response));
        }
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        return { error: error.message, success: false };
    }
};
```

---

## 🎮 Testing

### Unit Tests Example (Jest)
```javascript
// api.test.js
import { StockRecommendationAPI } from './api';

describe('Stock Recommendation API', () => {
    let api;

    beforeEach(() => {
        api = new StockRecommendationAPI('http://localhost:8001');
    });

    test('should fetch health status', async () => {
        const health = await api.healthCheck();
        expect(health.status).toBe('healthy');
    });

    test('should get recommendations with default parameters', async () => {
        const recommendations = await api.getRecommendations();
        expect(recommendations.status).toBe('success');
        expect(recommendations.long_buy_recommendations).toBeInstanceOf(Array);
        expect(recommendations.long_buy_recommendations.length).toBeLessThanOrEqual(20);
    });

    test('should respect custom parameters', async () => {
        const recommendations = await api.getRecommendations({
            top_recommendations: 5,
            min_score: 0.8
        });
        
        expect(recommendations.long_buy_recommendations.length).toBeLessThanOrEqual(5);
        recommendations.long_buy_recommendations.forEach(stock => {
            expect(stock.score).toBeGreaterThanOrEqual(0.8);
        });
    });
});
```

---

## 📋 Response Schemas

### Stock Recommendation Object
```typescript
interface StockRecommendation {
    symbol: string;           // "RELIANCE", "TCS", etc.
    price: string;           // "2450.50" (always string format)
    score: number;           // 0.85 (0.0 to 1.0+ scale)
    categories: string[];    // ["fundamental", "momentum"]
    appearances: number;     // 2 (how many categories)
    volume: number | string; // 1567953 or "N/A"
}
```

### Performance Metrics Object
```typescript
interface PerformanceMetrics {
    unique_stocks: number;         // Total unique stocks found
    total_stocks_found: number;    // Total across all categories
    multi_category_stocks: number; // Stocks in multiple categories
    diversity_score: number;       // Percentage (0-100)
    performance_score: number;     // Overall score (0-100)
}
```

---

## 🚀 Production Deployment

### Environment Configuration
```javascript
const API_CONFIG = {
    development: 'http://localhost:8001',
    staging: 'https://api-staging.yourcompany.com',
    production: 'https://api.yourcompany.com'
};

const getBaseURL = () => {
    return API_CONFIG[process.env.NODE_ENV] || API_CONFIG.development;
};
```

### CORS Configuration
The API already includes CORS middleware allowing all origins. For production, consider restricting to specific domains.

---

## 🔗 Integration Patterns

### Webhook Integration
```javascript
// For real-time updates
const subscribeToUpdates = async (webhookUrl, eventTypes) => {
    const response = await fetch(`${baseUrl}/api/webhooks/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url: webhookUrl,
            events: eventTypes // ['recommendations_updated', 'market_alert']
        })
    });
    return await response.json();
};
```

### Server-Sent Events (Future)
```javascript
const subscribeToSSE = () => {
    const eventSource = new EventSource(`${baseUrl}/api/stream/recommendations`);
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateRecommendations(data);
    };
    
    return eventSource;
};
```

---

## 📞 Support

- **API Documentation**: Available at `http://localhost:8001/docs`
- **Status Page**: `http://localhost:8001/health`
- **Rate Limits**: 20 requests per minute
- **Timeout**: 30 seconds per request

For additional support or feature requests, please refer to the project documentation or contact the development team. 