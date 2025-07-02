# 📊 Algorithm Discovery API Integration Guide

## 🚀 Overview

This guide provides complete documentation for integrating with the Algorithm Discovery recommendation system. The system provides intelligent stock recommendations across different trading timeframes using advanced pattern analysis and machine learning.

## 🏗️ Architecture

The system consists of three main recommendation services:

- **Swing Trading** (Port 8002): 3-10 day holding periods
- **Short-Term Trading** (Port 8003): 1-4 week holding periods  
- **Long-Term Investing** (Port 8001): 3-12 month holding periods

## 🔧 Server Setup

### Starting Servers

```bash
# Start all servers
cd /path/to/alg-discovery/api

# Swing Trading Server (Port 8002)
python swing_server.py &

# Short-Term Trading Server (Port 8003)
python shortterm_server.py &

# Long-Term Investing Server (Port 8001)
python longterm_server.py &
```

### Health Checks

```bash
# Check server status
curl http://localhost:8002/health  # Swing
curl http://localhost:8003/health  # Short-term
curl http://localhost:8001/health  # Long-term
```

## 📋 API Endpoints

### 1. Swing Trading Recommendations

**🎯 Best for: Day traders and swing traders (3-10 days)**

#### POST `/api/swing/swing-buy-recommendations`

**Request Body:**
```json
{
  "combination": {
    "breakout": "v1.0",
    "momentum": "v1.0", 
    "pattern": "v1.0",
    "reversal": "v1.0"
  },
  "limit_per_query": 30,
  "min_score": 25.0,
  "top_recommendations": 20
}
```

**Parameters:**
- `combination` (optional): Algorithm variants to use
- `limit_per_query` (optional): Max stocks per category (default: 30)
- `min_score` (optional): Minimum score 0-100 (default: 25.0)
- `top_recommendations` (optional): Max results (default: 20)

**Response:**
```json
{
  "status": "success",
  "recommendations": [
    {
      "symbol": "RELIANCE",
      "name": "Reliance Industries Limited",
      "price": 2485.50,
      "score": 78.5,
      "per_change": 2.3,
      "volume": 1250000,
      "appearances": 3,
      "category_count": 3,
      "recommendation_type": "Strong Swing",
      "breakout": true,
      "momentum": true,
      "pattern": false,
      "reversal": true,
      "categories": ["breakout", "momentum", "reversal"]
    }
  ],
  "metadata": {
    "combination_used": {
      "breakout": "v1.0",
      "momentum": "v1.0",
      "pattern": "v1.0", 
      "reversal": "v1.0"
    },
    "performance_metrics": {
      "unique_stocks": 15,
      "total_stocks_across_categories": 45,
      "avg_score": 65.2,
      "performance_score": 85.0
    },
    "total_recommendations": 15,
    "processing_time_seconds": 2.45,
    "timestamp": "2025-01-15T10:30:00"
  }
}
```

### 2. Short-Term Trading Recommendations

**🎯 Best for: Active traders (1-4 weeks)**

#### POST `/api/shortterm/shortterm-buy-recommendations`

**Request Body:**
```json
{
  "combination": {
    "momentum": "v1.0",
    "sector_rotation": "v1.0",
    "breakout": "v1.0",
    "reversal": "v1.0"
  },
  "limit_per_query": 40,
  "min_score": 35.0,
  "top_recommendations": 20
}
```

**Parameters:**
- `combination` (optional): Algorithm variants
- `limit_per_query` (optional): Max stocks per category (default: 40)
- `min_score` (optional): Minimum score 0-100 (default: 35.0)
- `top_recommendations` (optional): Max results (default: 20)

**Response:**
```json
{
  "status": "success",
  "recommendations": [
    {
      "symbol": "TCS",
      "name": "Tata Consultancy Services",
      "price": 3845.75,
      "score": 82.1,
      "per_change": 1.8,
      "volume": 890000,
      "sector": "Information Technology",
      "appearances": 2,
      "category_count": 2,
      "recommendation_type": "Strong Short-Term",
      "momentum": true,
      "sector_rotation": false,
      "breakout": true,
      "reversal": false,
      "categories": ["momentum", "breakout"]
    }
  ],
  "metadata": {
    "combination_used": {
      "momentum": "v1.0",
      "sector_rotation": "v1.0",
      "breakout": "v1.0",
      "reversal": "v1.0"
    },
    "performance_metrics": {
      "unique_stocks": 18,
      "re_ranking_applied": true
    },
    "algorithm_info": {
      "re_ranking_factors": [
        "trend_persistence",
        "volume_profile", 
        "sector_strength",
        "volatility_filter"
      ]
    }
  }
}
```

### 3. Long-Term Investment Recommendations

**🎯 Best for: Long-term investors (3-12 months)**

#### GET `/api/longterm/recommendations`

**Query Parameters:**
- `limit`: Maximum recommendations (default: 10)
- `min_score`: Minimum score (default: 60.0)

```bash
curl "http://localhost:8001/api/longterm/recommendations?limit=15&min_score=65.0"
```

#### POST `/api/longterm/realtime-recommendations`

**Request Body:**
```json
{
  "combination": {
    "fundamental": "v1.0",
    "momentum": "v1.0", 
    "value": "v1.0",
    "quality": "v1.0"
  },
  "limit_per_query": 30,
  "min_score": 25.0,
  "top_recommendations": 20
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "symbol": "HDFC",
      "name": "HDFC Bank Limited",
      "fundamental_score": 85.2,
      "technical_score": 72.8,
      "combined_score": 79.0,
      "sector": "Banking",
      "recommendation_type": "Strong Buy"
    }
  ],
  "market_context": {
    "sentiment": "Bullish",
    "average_score": 68.5,
    "investment_advice": "Good time for long-term investments"
  },
  "filtering_summary": {
    "total_stocks_screened": 150,
    "final_recommendations": 12,
    "filter_success_rate": 8.0
  }
}
```

## 💻 Code Examples

### Python Integration

```python
import requests
import json

class AlgorithmDiscoveryAPI:
    def __init__(self, base_url="http://localhost"):
        self.swing_url = f"{base_url}:8002"
        self.shortterm_url = f"{base_url}:8003"
        self.longterm_url = f"{base_url}:8001"
    
    def get_swing_recommendations(self, min_score=25.0, limit=10):
        """Get swing trading recommendations"""
        url = f"{self.swing_url}/api/swing/swing-buy-recommendations"
        payload = {
            "combination": {
                "breakout": "v1.0",
                "momentum": "v1.0",
                "pattern": "v1.0", 
                "reversal": "v1.0"
            },
            "min_score": min_score,
            "top_recommendations": limit
        }
        
        response = requests.post(url, json=payload)
        return response.json()
    
    def get_shortterm_recommendations(self, min_score=35.0, limit=10):
        """Get short-term trading recommendations"""
        url = f"{self.shortterm_url}/api/shortterm/shortterm-buy-recommendations"
        payload = {
            "combination": {
                "momentum": "v1.0",
                "sector_rotation": "v1.0",
                "breakout": "v1.0",
                "reversal": "v1.0"
            },
            "min_score": min_score,
            "top_recommendations": limit
        }
        
        response = requests.post(url, json=payload)
        return response.json()
    
    def get_longterm_recommendations(self, min_score=60.0, limit=10):
        """Get long-term investment recommendations"""
        url = f"{self.longterm_url}/api/longterm/recommendations"
        params = {"min_score": min_score, "limit": limit}
        
        response = requests.get(url, params=params)
        return response.json()

# Usage Example
api = AlgorithmDiscoveryAPI()

# Get recommendations for different timeframes
swing_recs = api.get_swing_recommendations(min_score=30.0, limit=5)
shortterm_recs = api.get_shortterm_recommendations(min_score=40.0, limit=5)
longterm_recs = api.get_longterm_recommendations(min_score=65.0, limit=5)

print("Swing Trading Recommendations:")
for rec in swing_recs.get('recommendations', []):
    print(f"  {rec['symbol']}: {rec['score']:.1f} - {rec['recommendation_type']}")

print("\nShort-Term Trading Recommendations:")
for rec in shortterm_recs.get('recommendations', []):
    print(f"  {rec['symbol']}: {rec['score']:.1f} - {rec['recommendation_type']}")

print("\nLong-Term Investment Recommendations:")
for rec in longterm_recs.get('recommendations', []):
    print(f"  {rec['symbol']}: {rec.get('combined_score', 0):.1f}")
```

### JavaScript/Node.js Integration

```javascript
class AlgorithmDiscoveryAPI {
    constructor(baseUrl = 'http://localhost') {
        this.swingUrl = `${baseUrl}:8002`;
        this.shorttermUrl = `${baseUrl}:8003`;
        this.longtermUrl = `${baseUrl}:8001`;
    }
    
    async getSwingRecommendations(minScore = 25.0, limit = 10) {
        const url = `${this.swingUrl}/api/swing/swing-buy-recommendations`;
        const payload = {
            combination: {
                breakout: "v1.0",
                momentum: "v1.0",
                pattern: "v1.0",
                reversal: "v1.0"
            },
            min_score: minScore,
            top_recommendations: limit
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        return await response.json();
    }
    
    async getShorttermRecommendations(minScore = 35.0, limit = 10) {
        const url = `${this.shorttermUrl}/api/shortterm/shortterm-buy-recommendations`;
        const payload = {
            combination: {
                momentum: "v1.0",
                sector_rotation: "v1.0",
                breakout: "v1.0",
                reversal: "v1.0"
            },
            min_score: minScore,
            top_recommendations: limit
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        return await response.json();
    }
    
    async getLongtermRecommendations(minScore = 60.0, limit = 10) {
        const url = `${this.longtermUrl}/api/longterm/recommendations?min_score=${minScore}&limit=${limit}`;
        const response = await fetch(url);
        return await response.json();
    }
}

// Usage Example
const api = new AlgorithmDiscoveryAPI();

async function getAllRecommendations() {
    try {
        const [swing, shortterm, longterm] = await Promise.all([
            api.getSwingRecommendations(30.0, 5),
            api.getShorttermRecommendations(40.0, 5),
            api.getLongtermRecommendations(65.0, 5)
        ]);
        
        console.log('Swing Recommendations:', swing.recommendations);
        console.log('Short-term Recommendations:', shortterm.recommendations);
        console.log('Long-term Recommendations:', longterm.recommendations);
        
    } catch (error) {
        console.error('Error fetching recommendations:', error);
    }
}

getAllRecommendations();
```

### cURL Examples

```bash
# Swing Trading Recommendations
curl -X POST http://localhost:8002/api/swing/swing-buy-recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "combination": {
      "breakout": "v1.0",
      "momentum": "v1.0",
      "pattern": "v1.0",
      "reversal": "v1.0"
    },
    "min_score": 30.0,
    "top_recommendations": 5
  }'

# Short-term Trading Recommendations  
curl -X POST http://localhost:8003/api/shortterm/shortterm-buy-recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "combination": {
      "momentum": "v1.0",
      "sector_rotation": "v1.0", 
      "breakout": "v1.0",
      "reversal": "v1.0"
    },
    "min_score": 40.0,
    "top_recommendations": 5
  }'

# Long-term Investment Recommendations
curl "http://localhost:8001/api/longterm/recommendations?min_score=65.0&limit=5"
```

## 🎛️ Algorithm Variants

### Available Variants

Each recommendation type supports different algorithm variants:

**Swing Trading:**
- `breakout`: v1.0 (basic), v1.1 (multi-timeframe), v1.2 (volume-confirmed)
- `momentum`: v1.0 (basic), v1.1 (RSI combo), v1.2 (acceleration)
- `pattern`: v1.0 (support bounce), v1.1 (flag pattern), v1.2 (cup & handle)
- `reversal`: v1.0 (basic), v1.1 (hammer), v1.2 (double bottom)

**Short-term Trading:**
- `momentum`: v1.0 (simple), v1.1 (RSI + volume), v1.2 (acceleration + institutional)
- `sector_rotation`: v1.0 (sector leaders), v1.1 (relative strength), v1.2 (large cap rotation)
- `breakout`: v1.0 (consolidation), v1.1 (strong volume), v1.2 (multi-timeframe)
- `reversal`: v1.0 (oversold), v1.1 (pullback), v1.2 (support zones)

**Recommendation:** Use v1.0 variants for best results, as v1.1 and v1.2 may be too restrictive.

## 📊 Response Fields

### Common Fields

| Field | Type | Description |
|-------|------|-------------|
| `symbol` | string | Stock ticker symbol |
| `name` | string | Company name |
| `price` | float | Current price |
| `score` | float | Recommendation score (0-100) |
| `per_change` | float | Percentage change |
| `volume` | int | Trading volume |
| `recommendation_type` | string | Recommendation strength |

### Swing/Short-term Specific

| Field | Type | Description |
|-------|------|-------------|
| `appearances` | int | Number of categories matched |
| `category_count` | int | Same as appearances |
| `categories` | array | List of matching categories |
| `breakout` | boolean | Matches breakout criteria |
| `momentum` | boolean | Matches momentum criteria |
| `pattern` | boolean | Matches pattern criteria |
| `reversal` | boolean | Matches reversal criteria |

### Short-term Specific

| Field | Type | Description |
|-------|------|-------------|
| `sector` | string | Stock sector |
| `sector_rotation` | boolean | Matches sector rotation |

## 🔍 Scoring System

### Score Ranges

- **90-100**: Exceptional opportunity
- **80-89**: Strong recommendation  
- **70-79**: Good opportunity
- **60-69**: Moderate recommendation
- **50-59**: Watch list candidate
- **Below 50**: Generally filtered out

### Recommendation Types

**Swing Trading:**
- `Strong Swing`: Score ≥ 70
- `Swing Buy`: Score ≥ 50
- `Watch`: Score < 50

**Short-term Trading:**
- `Strong Short-Term`: Score ≥ 75
- `Short-Term Buy`: Score ≥ 55
- `Watch`: Score < 55

## ⚠️ Error Handling

### Common Error Responses

```json
{
  "status": "error",
  "error": "Server unavailable",
  "detail": "Service is temporarily down",
  "timestamp": "2025-01-15T10:30:00"
}
```

### HTTP Status Codes

- `200`: Success
- `400`: Bad request (invalid parameters)
- `500`: Internal server error
- `503`: Service unavailable

### Best Practices

1. **Always check response status** before processing recommendations
2. **Implement retry logic** for failed requests
3. **Handle empty recommendations** gracefully
4. **Cache results** appropriately (recommendations valid for 15-30 minutes)
5. **Monitor API health** using health check endpoints

## 🚀 Performance & Rate Limits

### Response Times
- Swing: ~2-4 seconds
- Short-term: ~3-5 seconds  
- Long-term: ~5-8 seconds

### Rate Limits
- No strict rate limits currently
- Recommended: Max 1 request per minute per endpoint
- API includes built-in rate limiting between ChartInk queries

### Optimization Tips

1. **Use appropriate min_score** to filter results
2. **Limit top_recommendations** to needed amount
3. **Cache results** for at least 15 minutes
4. **Batch requests** when possible
5. **Use health checks** before making requests

## 🛠️ Troubleshooting

### Common Issues

1. **Empty Recommendations**
   - Lower `min_score` parameter
   - Check if servers are using correct algorithm variants
   - Verify server configurations

2. **Slow Responses**
   - Reduce `limit_per_query` parameter
   - Check server load and network connectivity

3. **Connection Errors**
   - Verify servers are running on correct ports
   - Check firewall settings
   - Use health check endpoints

### Debug Endpoints

```bash
# Check server configuration
curl http://localhost:8002/api/swing/config
curl http://localhost:8003/api/shortterm/config

# Health checks
curl http://localhost:8002/health
curl http://localhost:8003/health  
curl http://localhost:8001/health
```

## 📈 Production Deployment

### Environment Variables

```bash
export CHARTINK_API_BASE_URL="https://chartink.com"
export LOG_LEVEL="INFO"
export CORS_ORIGINS="https://yourdomain.com"
```

### Docker Deployment

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8001 8002 8003

CMD ["python", "swing_server.py"]
```

### Load Balancing

For high-traffic applications, consider:
- Running multiple instances per server type
- Using nginx for load balancing
- Implementing health check-based routing

## 📞 Support

For integration support or questions:
- Check server logs for detailed error information
- Use debug endpoints for configuration verification
- Monitor API performance and response times

---

**📝 Note:** This API is designed for Indian equity markets (BSE/NSE). Recommendations are generated using real-time market data and should be used in conjunction with your own analysis and risk management strategies. 