# Backend Configuration Fix - Production vs Development

## 🔍 **Problem Identified**

You're getting the same recommendations in production because **only 1 out of 4 backend services is running**:

### ✅ **Currently Running**
- **Recommendation API** (port 8183) - ✅ Running and healthy
- **Frontend** (port 80) - ✅ Running and healthy

### ❌ **Missing Backend Services**
- **Theme API** (port 8020) - ❌ Not running
- **Strategy API** (port 8030) - ❌ Not running  
- **General API** (port 8002) - ❌ Not running

## 🚀 **Solution: Deploy Missing Backend Services**

### **Step 1: Deploy Theme API Service**

```bash
# Deploy Theme API on port 8020
docker run -d \
  --name theme-api-prod \
  --restart unless-stopped \
  -p 8020:8020 \
  -e NODE_ENV=production \
  -e PORT=8020 \
  -e LOG_LEVEL=info \
  stocks-general-service:local
```

### **Step 2: Deploy Strategy API Service**

```bash
# Deploy Strategy API on port 8030
docker run -d \
  --name strategy-api-prod \
  --restart unless-stopped \
  -p 8030:8030 \
  -e NODE_ENV=production \
  -e PORT=8030 \
  -e LOG_LEVEL=info \
  strategy-service:prod-v1.0.0
```

### **Step 3: Deploy General API Service**

```bash
# Deploy General API on port 8002
docker run -d \
  --name general-api-prod \
  --restart unless-stopped \
  -p 8002:8002 \
  -e NODE_ENV=production \
  -e PORT=8002 \
  -e LOG_LEVEL=info \
  st-general-service-stocks_api:latest
```

## 🔧 **Alternative: Single Command Deployment**

```bash
# Deploy all missing services at once
docker run -d --name theme-api-prod --restart unless-stopped -p 8020:8020 -e NODE_ENV=production -e PORT=8020 stocks-general-service:local && \
docker run -d --name strategy-api-prod --restart unless-stopped -p 8030:8030 -e NODE_ENV=production -e PORT=8030 strategy-service:prod-v1.0.0 && \
docker run -d --name general-api-prod --restart unless-stopped -p 8002:8002 -e NODE_ENV=production -e PORT=8002 st-general-service-stocks_api:latest
```

## 🧪 **Testing After Deployment**

### **1. Check All Services Are Running**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(theme|strategy|general|recommendation)"
```

### **2. Test Each API Endpoint**
```bash
# Test Theme API
curl http://algodiscovery.com/api/theme/health

# Test Strategy API  
curl http://algodiscovery.com/api/strategies/health

# Test General API
curl http://algodiscovery.com/api/health

# Test Recommendation API (already working)
curl http://algodiscovery.com/api/recommendations/health
```

### **3. Test Frontend Integration**
```bash
# Test unified recommendations endpoint
curl http://algodiscovery.com/api/recommendations/unified

# Test theme recommendations
curl http://algodiscovery.com/api/theme/recommendations

# Test strategy recommendations
curl http://algodiscovery.com/api/strategies/recommendations
```

## 📊 **Expected Results After Fix**

### **Before Fix (Current State)**
- **Recommendations**: Same static data (from recommendation API only)
- **Themes**: Not available (404 errors)
- **Strategies**: Not available (404 errors)
- **General API**: Not available (404 errors)

### **After Fix (Expected State)**
- **Recommendations**: Dynamic data from multiple sources
- **Themes**: Available with theme-based recommendations
- **Strategies**: Available with strategy-specific recommendations
- **General API**: Available with general stock data

## 🔍 **Why This Happens**

### **Frontend Configuration**
The frontend is configured to use different APIs for different features:
- **Unified Recommendations**: Uses recommendation API (port 8183) ✅
- **Theme Recommendations**: Uses theme API (port 8020) ❌
- **Strategy Recommendations**: Uses strategy api (port 8030) ❌
- **General Stock Data**: Uses general api (port 8002) ❌

### **Nginx Proxy Configuration**
The nginx configuration is set up to proxy to all services, but only the recommendation service is running.

## 🚨 **Quick Fix Commands**

### **Deploy All Missing Services**
```bash
# Theme API
docker run -d --name theme-api-prod --restart unless-stopped -p 8020:8020 -e NODE_ENV=production stocks-general-service:local

# Strategy API  
docker run -d --name strategy-api-prod --restart unless-stopped -p 8030:8030 -e NODE_ENV=production strategy-service:prod-v1.0.0

# General API
docker run -d --name general-api-prod --restart unless-stopped -p 8002:8002 -e NODE_ENV=production st-general-service-stocks_api:latest
```

### **Verify Deployment**
```bash
# Check all services
docker ps | grep -E "(theme|strategy|general|recommendation)"

# Test endpoints
curl http://algodiscovery.com/api/theme/health
curl http://algodiscovery.com/api/strategies/health  
curl http://algodiscovery.com/api/health
```

## 🎯 **Expected Behavior After Fix**

### **Frontend Features That Will Work**
- **Stock Recommendations**: Dynamic recommendations from multiple sources
- **Theme Recommendations**: Theme-based stock suggestions
- **Strategy Recommendations**: Strategy-specific recommendations
- **Real-time Data**: Live stock data and prices
- **Risk Analysis**: Dynamic risk assessment
- **Sector Analysis**: Sector-based recommendations

### **Data Sources That Will Be Available**
- **Recommendation API**: Core recommendation engine
- **Theme API**: Theme-based analysis
- **Strategy API**: Strategy-specific analysis
- **General API**: General stock data and utilities

## 🔧 **Troubleshooting**

### **If Services Don't Start**
```bash
# Check logs
docker logs theme-api-prod
docker logs strategy-api-prod
docker logs general-api-prod

# Check port conflicts
netstat -tulpn | grep -E "(8020|8030|8002)"
```

### **If APIs Return Errors**
```bash
# Check service health
curl http://localhost:8020/health
curl http://localhost:8030/health
curl http://localhost:8002/health

# Check nginx logs
docker logs algodiscovery-frontend-domain-prod
```

## 🎉 **Summary**

**The issue**: You're only running 1 out of 4 backend services, so the frontend can only get data from the recommendation API.

**The solution**: Deploy the missing backend services (Theme API, Strategy API, General API) to get full functionality.

**The result**: Dynamic recommendations from multiple sources instead of static data.

Run the deployment commands above and you'll have a fully functional production system with dynamic recommendations!
