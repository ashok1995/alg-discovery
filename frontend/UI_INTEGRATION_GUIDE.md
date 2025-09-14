# UI Integration Guide 🎨

## 📋 **Overview**

This guide provides comprehensive instructions for integrating the Stock Recommendation Service with frontend applications. It covers both the existing API endpoints and the new UI Models Package for optimal user experience.

## 🚀 **Quick Start**

### **1. Service Setup**
```bash
# Start the recommendation service
source .venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8010 --reload

# Service will be available at:
# - API: http://localhost:8010
# - Docs: http://localhost:8010/docs
```

### **2. Basic API Call**
```javascript
const response = await fetch('http://localhost:8010/api/v1/recommendations/dynamic', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    strategy: 'swing',
    risk_level: 'medium',
    min_score: 65.0,
    limit: 10
  })
});

const data = await response.json();
console.log(data);
```

## 🎯 **UI Models Package Integration**

### **Installation**
```bash
# Copy the UI models to your frontend project
cp ui_models_complete.py your-frontend-project/src/models/
cp UI_MODELS_API_REFERENCE.md your-frontend-project/docs/
```

### **TypeScript Definitions**
```typescript
// types/recommendation.ts
export enum StrategyType {
  SWING = 'swing',
  INTRADAY_BUY = 'intraday_buy',
  INTRADAY_SELL = 'intraday_sell',
  LONG_TERM = 'long_term',
  SHORT_TERM = 'short_term'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum MarketCondition {
  BULLISH = 'bullish',
  BEARISH = 'bearish',
  NEUTRAL = 'neutral',
  AUTO_DETECTED = 'auto_detected'
}

export enum Sector {
  IT = 'i.t',
  FINANCE = 'finance',
  FMCG = 'fmcg',
  AUTO = 'auto',
  PHARMA = 'pharma',
  METALS = 'metals',
  REALTY = 'realty',
  SERVICES = 'services',
  TEXTILES = 'textiles',
  INDUSTRIALS = 'industrials',
  MEDIA = 'media',
  ENERGY = 'energy',
  TELECOM = 'telecom',
  INDICES = 'indices'
}

export enum MarketCap {
  LARGECAP = 'largecap',
  MIDCAP = 'midcap',
  SMALLCAP = 'smallcap'
}

export interface UIQuickRecommendationRequest {
  strategy: StrategyType;
  risk_level: RiskLevel;
  min_score: number; // 0-100
  limit: number; // 1-100
}

export interface UIRecommendationRequest {
  strategy: StrategyType;
  risk_level: RiskLevel;
  market_condition?: MarketCondition;
  sectors?: Sector[];
  market_caps?: MarketCap[];
  rsi_range?: [number, number]; // [min, max]
  min_score: number; // 0-100
  max_score?: number; // 0-100
  limit: number; // 1-100
  loss_tightening?: 'conservative' | 'moderate' | 'aggressive';
  sort_by?: 'score' | 'price' | 'volume' | 'market_cap' | 'change_percent' | 'rsi';
  sort_direction?: 'asc' | 'desc';
}

export interface UIStockRecommendation {
  symbol: string;
  score: number; // 0-100
  price?: number;
  sector?: Sector;
  market_cap?: MarketCap;
  rsi?: number;
  trend?: string;
  volume?: number;
  change_percent?: number;
  market_cap_value?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  debt_to_equity?: number;
  roe?: number;
}

export interface UIRecommendationResponse {
  success: boolean;
  stocks: UIStockRecommendation[];
  total_count: number;
  avg_score?: number;
  score_range?: [number, number];
  market_condition?: MarketCondition;
  strategy_used?: StrategyType;
  execution_time?: number;
  error_message?: string;
}
```

## 🎨 **Frontend Components**

### **1. Strategy Selector**
```jsx
import React from 'react';

const StrategySelector = ({ value, onChange }) => {
  const strategies = [
    { value: 'swing', label: 'Swing Trading' },
    { value: 'intraday_buy', label: 'Intraday Buy' },
    { value: 'intraday_sell', label: 'Intraday Sell' },
    { value: 'long_term', label: 'Long Term' },
    { value: 'short_term', label: 'Short Term' }
  ];

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select Strategy</option>
      {strategies.map(strategy => (
        <option key={strategy.value} value={strategy.value}>
          {strategy.label}
        </option>
      ))}
    </select>
  );
};
```

### **2. Risk Level Selector**
```jsx
const RiskLevelSelector = ({ value, onChange }) => {
  const riskLevels = [
    { value: 'low', label: 'Low Risk', color: 'green' },
    { value: 'medium', label: 'Medium Risk', color: 'yellow' },
    { value: 'high', label: 'High Risk', color: 'red' }
  ];

  return (
    <div className="risk-selector">
      {riskLevels.map(level => (
        <button
          key={level.value}
          className={`risk-btn ${value === level.value ? 'active' : ''}`}
          style={{ borderColor: level.color }}
          onClick={() => onChange(level.value)}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
};
```

### **3. Sector Multi-Selector**
```jsx
const SectorSelector = ({ value, onChange }) => {
  const sectors = [
    { value: 'i.t', label: 'IT' },
    { value: 'finance', label: 'Finance' },
    { value: 'fmcg', label: 'FMCG' },
    { value: 'auto', label: 'Auto' },
    { value: 'pharma', label: 'Pharma' },
    { value: 'metals', label: 'Metals' },
    { value: 'realty', label: 'Realty' },
    { value: 'services', label: 'Services' },
    { value: 'textiles', label: 'Textiles' },
    { value: 'industrials', label: 'Industrials' },
    { value: 'media', label: 'Media' },
    { value: 'energy', label: 'Energy' },
    { value: 'telecom', label: 'Telecom' },
    { value: 'indices', label: 'Indices' }
  ];

  const handleToggle = (sector) => {
    const newValue = value.includes(sector)
      ? value.filter(s => s !== sector)
      : [...value, sector];
    onChange(newValue);
  };

  return (
    <div className="sector-selector">
      {sectors.map(sector => (
        <label key={sector.value} className="sector-checkbox">
          <input
            type="checkbox"
            checked={value.includes(sector.value)}
            onChange={() => handleToggle(sector.value)}
          />
          {sector.label}
        </label>
      ))}
    </div>
  );
};
```

### **4. Score Range Slider**
```jsx
const ScoreRangeSlider = ({ minScore, maxScore, onChange }) => {
  return (
    <div className="score-range">
      <label>Score Range: {minScore} - {maxScore}</label>
      <div className="slider-container">
        <input
          type="range"
          min="0"
          max="100"
          value={minScore}
          onChange={(e) => onChange({ minScore: parseInt(e.target.value), maxScore })}
        />
        <input
          type="range"
          min="0"
          max="100"
          value={maxScore}
          onChange={(e) => onChange({ minScore, maxScore: parseInt(e.target.value) })}
        />
      </div>
    </div>
  );
};
```

## 🔧 **API Service Layer**

### **Recommendation Service**
```javascript
class RecommendationService {
  constructor(baseUrl = 'http://localhost:8010') {
    this.baseUrl = baseUrl;
  }

  // Quick recommendation
  async getQuickRecommendations(request) {
    const response = await fetch(`${this.baseUrl}/api/v1/minimal/recommendations/quick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Full recommendation
  async getRecommendations(request) {
    const response = await fetch(`${this.baseUrl}/api/v1/minimal/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Preset recommendation
  async getPresetRecommendations(presetName, customizations = {}) {
    const response = await fetch(`${this.baseUrl}/api/v1/minimal/recommendations/preset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preset_name: presetName,
        customizations
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Get all options
  async getOptions() {
    const response = await fetch(`${this.baseUrl}/api/v1/minimal/options/all`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Legacy API support
  async getDynamicRecommendations(request) {
    const response = await fetch(`${this.baseUrl}/api/v1/recommendations/dynamic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}

export default RecommendationService;
```

## 📱 **React Hook Example**

```jsx
import { useState, useEffect } from 'react';
import RecommendationService from './services/RecommendationService';

const useRecommendations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [service] = useState(() => new RecommendationService());

  const fetchRecommendations = async (request) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await service.getRecommendations(request);
      setRecommendations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuickRecommendations = async (strategy, riskLevel, minScore = 65, limit = 10) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await service.getQuickRecommendations({
        strategy,
        risk_level: riskLevel,
        min_score: minScore,
        limit
      });
      setRecommendations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    recommendations,
    fetchRecommendations,
    fetchQuickRecommendations
  };
};

export default useRecommendations;
```

## 🎨 **Complete React Component**

```jsx
import React, { useState } from 'react';
import useRecommendations from './hooks/useRecommendations';
import StrategySelector from './components/StrategySelector';
import RiskLevelSelector from './components/RiskLevelSelector';
import SectorSelector from './components/SectorSelector';
import ScoreRangeSlider from './components/ScoreRangeSlider';

const RecommendationForm = () => {
  const { loading, error, recommendations, fetchRecommendations } = useRecommendations();
  
  const [formData, setFormData] = useState({
    strategy: 'swing',
    risk_level: 'medium',
    min_score: 65,
    max_score: 100,
    sectors: [],
    limit: 20
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchRecommendations(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="recommendation-form">
      <h2>Stock Recommendations</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Strategy</label>
          <StrategySelector
            value={formData.strategy}
            onChange={(value) => handleInputChange('strategy', value)}
          />
        </div>

        <div className="form-group">
          <label>Risk Level</label>
          <RiskLevelSelector
            value={formData.risk_level}
            onChange={(value) => handleInputChange('risk_level', value)}
          />
        </div>

        <div className="form-group">
          <label>Sectors</label>
          <SectorSelector
            value={formData.sectors}
            onChange={(value) => handleInputChange('sectors', value)}
          />
        </div>

        <div className="form-group">
          <ScoreRangeSlider
            minScore={formData.min_score}
            maxScore={formData.max_score}
            onChange={({ minScore, maxScore }) => {
              handleInputChange('min_score', minScore);
              handleInputChange('max_score', maxScore);
            }}
          />
        </div>

        <div className="form-group">
          <label>Limit</label>
          <input
            type="number"
            min="1"
            max="100"
            value={formData.limit}
            onChange={(e) => handleInputChange('limit', parseInt(e.target.value))}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Get Recommendations'}
        </button>
      </form>

      {error && (
        <div className="error">
          Error: {error}
        </div>
      )}

      {recommendations && (
        <div className="results">
          <h3>Recommendations ({recommendations.total_count})</h3>
          {recommendations.avg_score && (
            <p>Average Score: {recommendations.avg_score.toFixed(2)}</p>
          )}
          {recommendations.execution_time && (
            <p>Execution Time: {recommendations.execution_time.toFixed(3)}s</p>
          )}
          
          <div className="stocks-grid">
            {recommendations.stocks.map(stock => (
              <div key={stock.symbol} className="stock-card">
                <h4>{stock.symbol}</h4>
                <div className="score">Score: {stock.score.toFixed(1)}</div>
                {stock.price && <div className="price">Price: ₹{stock.price}</div>}
                {stock.sector && <div className="sector">Sector: {stock.sector}</div>}
                {stock.rsi && <div className="rsi">RSI: {stock.rsi.toFixed(1)}</div>}
                {stock.trend && <div className="trend">Trend: {stock.trend}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationForm;
```

## 🎨 **CSS Styles**

```css
/* Recommendation Form Styles */
.recommendation-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

/* Risk Level Selector */
.risk-selector {
  display: flex;
  gap: 10px;
}

.risk-btn {
  padding: 10px 20px;
  border: 2px solid #ccc;
  background: white;
  cursor: pointer;
  border-radius: 5px;
  transition: all 0.3s;
}

.risk-btn.active {
  background: #007bff;
  color: white;
}

.risk-btn:hover {
  transform: translateY(-2px);
}

/* Sector Selector */
.sector-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.sector-checkbox {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
}

.sector-checkbox:hover {
  background: #f5f5f5;
}

/* Score Range Slider */
.score-range {
  margin: 20px 0;
}

.slider-container {
  display: flex;
  gap: 20px;
  align-items: center;
}

.slider-container input[type="range"] {
  flex: 1;
}

/* Results */
.results {
  margin-top: 30px;
}

.stocks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.stock-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.stock-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.stock-card h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.stock-card .score {
  font-size: 18px;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 5px;
}

.stock-card .price {
  color: #28a745;
  font-weight: bold;
}

.stock-card .sector {
  color: #6c757d;
  font-size: 14px;
}

.stock-card .rsi {
  color: #fd7e14;
}

.stock-card .trend {
  color: #20c997;
  font-style: italic;
}

/* Error */
.error {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 5px;
  margin: 10px 0;
}

/* Loading */
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

## 🔍 **Form Validation**

```javascript
const validateRecommendationRequest = (request) => {
  const errors = [];

  // Required fields
  if (!request.strategy) {
    errors.push('Strategy is required');
  }
  if (!request.risk_level) {
    errors.push('Risk level is required');
  }

  // Score validation
  if (request.min_score < 0 || request.min_score > 100) {
    errors.push('Min score must be between 0 and 100');
  }
  if (request.max_score && request.max_score <= request.min_score) {
    errors.push('Max score must be greater than min score');
  }

  // Limit validation
  if (request.limit < 1 || request.limit > 100) {
    errors.push('Limit must be between 1 and 100');
  }

  // RSI range validation
  if (request.rsi_range) {
    if (request.rsi_range.length !== 2) {
      errors.push('RSI range must have exactly 2 values');
    } else if (request.rsi_range[0] >= request.rsi_range[1]) {
      errors.push('RSI min must be less than max');
    }
  }

  return errors;
};
```

## 📊 **Data Visualization**

```jsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RecommendationChart = ({ recommendations }) => {
  if (!recommendations || !recommendations.stocks) return null;

  const chartData = recommendations.stocks.map(stock => ({
    symbol: stock.symbol,
    score: stock.score,
    price: stock.price || 0
  }));

  return (
    <div className="chart-container">
      <h3>Recommendation Scores</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="symbol" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="score" fill="#007bff" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

## 🚀 **Deployment Considerations**

### **Environment Configuration**
```javascript
// config/environment.js
const config = {
  development: {
    apiUrl: 'http://localhost:8010',
    timeout: 30000
  },
  production: {
    apiUrl: 'https://api.yourdomain.com',
    timeout: 10000
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

### **Error Handling**
```javascript
const handleApiError = (error) => {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return 'Network error. Please check your connection.';
  }
  
  if (error.message.includes('500')) {
    return 'Server error. Please try again later.';
  }
  
  if (error.message.includes('404')) {
    return 'Service not found. Please check the API endpoint.';
  }
  
  return error.message || 'An unexpected error occurred.';
};
```

## 📱 **Mobile Responsiveness**

```css
/* Mobile Styles */
@media (max-width: 768px) {
  .recommendation-form {
    padding: 10px;
  }
  
  .risk-selector {
    flex-direction: column;
  }
  
  .sector-selector {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }
  
  .stocks-grid {
    grid-template-columns: 1fr;
  }
  
  .slider-container {
    flex-direction: column;
    gap: 10px;
  }
}
```

## 🎯 **Best Practices**

1. **Error Handling**: Always handle API errors gracefully
2. **Loading States**: Show loading indicators during API calls
3. **Validation**: Validate form inputs before submission
4. **Caching**: Consider caching options data
5. **Responsive Design**: Ensure mobile compatibility
6. **Accessibility**: Use proper ARIA labels and keyboard navigation
7. **Performance**: Debounce search inputs and optimize re-renders

## 🔗 **API Endpoints Summary**

| Endpoint | Method | Purpose | Request Model |
|----------|--------|---------|---------------|
| `/api/v1/minimal/recommendations/quick` | POST | Quick recommendations | UIQuickRecommendationRequest |
| `/api/v1/minimal/recommendations` | POST | Full recommendations | UIRecommendationRequest |
| `/api/v1/minimal/recommendations/preset` | POST | Preset recommendations | UIPresetRecommendationRequest |
| `/api/v1/minimal/options/all` | GET | Get all options | - |
| `/api/v1/recommendations/dynamic` | POST | Legacy dynamic endpoint | UniversalSeedRecommendationRequest |

## 🎨 **Advanced Features**

### **Real-time Updates**
```jsx
const useRealTimeRecommendations = (strategy, riskLevel) => {
  const [recommendations, setRecommendations] = useState([]);
  const [wsConnection, setWsConnection] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8010/ws/recommendations');
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ strategy, risk_level: riskLevel }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setRecommendations(data.stocks);
    };
    
    setWsConnection(ws);
    
    return () => ws.close();
  }, [strategy, riskLevel]);

  return recommendations;
};
```

### **Caching Strategy**
```javascript
class RecommendationCache {
  constructor(ttl = 300000) { // 5 minutes
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

### **Performance Optimization**
```jsx
import { useMemo, useCallback } from 'react';

const OptimizedRecommendationForm = () => {
  const [formData, setFormData] = useState(initialFormData);
  
  // Memoize expensive calculations
  const filteredSectors = useMemo(() => {
    return sectors.filter(sector => 
      sector.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Debounced API calls
  const debouncedFetch = useCallback(
    debounce((data) => {
      fetchRecommendations(data);
    }, 500),
    []
  );

  // Optimize re-renders
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    // Component JSX
  );
};
```

This guide provides everything you need to integrate the Stock Recommendation Service with your frontend application! 🚀
