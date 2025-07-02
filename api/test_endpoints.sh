#!/bin/bash

echo "🎯 Testing AI Recommendation Endpoints"
echo "======================================"

# Test Swing Trading (8002)
echo ""
echo "1. Testing Swing Trading Recommendations..."
curl -X POST http://localhost:8002/api/swing/swing-buy-recommendations \
  -H "Content-Type: application/json" \
  -d '{"combination": "v1.0", "limit_per_query": 10, "min_score": 50.0, "top_recommendations": 5}' \
  --connect-timeout 10 --max-time 30 | head -20

echo ""
echo "2. Testing Short-term Trading Recommendations..."
curl -X POST http://localhost:8003/api/shortterm/shortterm-buy-recommendations \
  -H "Content-Type: application/json" \
  -d '{"combination": "v1.0", "limit_per_query": 10, "min_score": 55.0, "top_recommendations": 5}' \
  --connect-timeout 10 --max-time 30 | head -20

echo ""
echo "3. Testing Long-term Investment Recommendations..."
curl -X POST http://localhost:8001/api/longterm/long-buy-recommendations \
  -H "Content-Type: application/json" \
  -d '{"combination": {"fundamental": "v1.0", "momentum": "v1.0", "value": "v1.0", "quality": "v1.0"}, "limit_per_query": 10, "min_score": 60.0, "top_recommendations": 5}' \
  --connect-timeout 10 --max-time 30 | head -20

echo ""
echo "✅ Endpoint tests completed!"
