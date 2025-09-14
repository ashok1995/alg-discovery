# Mock Data Removal - Production Configuration Fix

## 🔍 **Problem Identified**

You're getting **mock stocks as fallback** in production, which is not allowed. The system is configured with a fallback hierarchy that includes mock data.

### **Current Data Source Hierarchy**
1. **Kite Connect** (port 8183) - ❌ Not implemented ("Implementation pending")
2. **Seed Stocks Service** (port 8182) - ✅ Running but not properly connected
3. **Mock Data** - ❌ **ACTIVE** (This is the problem!)

## 🚨 **Issue Analysis**

### **Health Check Shows Mock Data is Active**
```json
{
  "sources": {
    "kite": {"status": "planned", "message": "Implementation pending"},
    "seed_stocks": {"status": "healthy", "base_url": "http://host.docker.internal:8182"},
    "mock": {"status": "healthy", "message": "Always available"}  // ❌ THIS IS THE PROBLEM
  },
  "fallback_system": "operational"
}
```

### **Real Data is Available**
The seed stocks service (port 8182) is running and has real data:
- **Endpoint**: `POST /api/v1/recommendations`
- **Status**: ✅ Healthy and responding
- **Data**: Real stock data with technical analysis

## 🚀 **Solution: Remove Mock Data and Configure Real Sources**

### **Step 1: Check Current Recommendation Service Configuration**

The recommendation service needs to be reconfigured to:
1. **Remove mock data fallback**
2. **Properly connect to seed stocks service**
3. **Use real data only**

### **Step 2: Fix API Endpoint Configuration**

The recommendation service is trying to access `/api/recommendations/unified` but the seed service provides `/api/v1/recommendations` with POST method.

### **Step 3: Update Recommendation Service**

The recommendation service needs to be updated to:
- Remove mock data source
- Use correct seed service endpoints
- Handle POST requests properly

## 🔧 **Immediate Fix Commands**

### **1. Check Current Recommendation Service Configuration**
```bash
# Check what's running
docker ps | grep recommendation

# Check logs for configuration issues
docker logs recommendation-api-prod --tail 20
```

### **2. Test Real Data Source**
```bash
# Test seed service directly (this works)
curl -X POST http://localhost:8182/api/v1/recommendations \
  -H "Content-Type: application/json" \
  -d '{"strategy": "swing", "risk_level": "low", "min_score": 70, "limit": 5}'
```

### **3. Check Recommendation Service Configuration**
```bash
# Check if recommendation service can access seed service
curl -s http://localhost:8183/api/recommendations/sources
```

## 🎯 **Root Cause Analysis**

### **Why Mock Data is Being Used**
1. **Kite Connect**: Not implemented (status: "planned")
2. **Seed Service**: Not properly connected (wrong endpoint)
3. **Fallback Logic**: Falls back to mock data when real sources fail

### **Why Seed Service Connection Fails**
- **Wrong Endpoint**: Recommendation service tries `/api/recommendations/unified` (GET)
- **Correct Endpoint**: Seed service provides `/api/v1/recommendations` (POST)
- **Method Mismatch**: GET vs POST request

## 🚀 **Complete Fix Strategy**

### **Option 1: Update Recommendation Service (Recommended)**
Update the recommendation service to:
1. Remove mock data source
2. Use correct seed service endpoints
3. Handle POST requests properly

### **Option 2: Direct Frontend Connection**
Configure frontend to connect directly to seed service:
1. Update API configuration
2. Handle POST requests in frontend
3. Remove recommendation service dependency

### **Option 3: Add API Gateway**
Create a proper API gateway that:
1. Translates GET requests to POST
2. Routes to correct services
3. Removes mock data fallback

## 🔧 **Recommended Fix: Update Recommendation Service**

### **1. Check Recommendation Service Source Code**
```bash
# Check if we can access the service configuration
docker exec recommendation-api-prod ls -la /app
```

### **2. Update Service Configuration**
The recommendation service needs to be updated to:
- Remove mock data source
- Use correct seed service endpoints
- Handle POST requests properly

### **3. Restart Service with New Configuration**
```bash
# Stop current service
docker stop recommendation-api-prod

# Start with updated configuration
docker run -d --name recommendation-api-prod-new \
  --restart unless-stopped \
  -p 8183:8183 \
  -e NODE_ENV=production \
  -e REMOVE_MOCK_DATA=true \
  -e SEED_SERVICE_URL=http://host.docker.internal:8182 \
  recommendation-api-prod
```

## 🧪 **Testing After Fix**

### **1. Verify Mock Data is Removed**
```bash
# Check health status
curl -s http://localhost:8183/api/recommendations/health | jq '.sources.mock'
# Expected: Should not exist or be disabled
```

### **2. Test Real Data Only**
```bash
# Test recommendations endpoint
curl -s http://localhost:8183/api/recommendations/unified
# Expected: Real data from seed service only
```

### **3. Verify Data Source**
```bash
# Check data source in response
curl -s http://localhost:8183/api/recommendations/unified | jq '.data[0].source'
# Expected: "seed_stocks" or similar, NOT "mock"
```

## 📊 **Expected Results After Fix**

### **Before Fix (Current State)**
- **Data Source**: Mock data (fallback)
- **Data Quality**: Static/sample data
- **Source Tracking**: Mock data identified
- **Production Ready**: ❌ No (mock data not allowed)

### **After Fix (Expected State)**
- **Data Source**: Seed stocks service (real data)
- **Data Quality**: Dynamic, real-time data
- **Source Tracking**: Real data source identified
- **Production Ready**: ✅ Yes (real data only)

## 🚨 **Critical Actions Required**

### **1. Immediate Action**
- **Remove mock data fallback** from recommendation service
- **Configure proper seed service connection**
- **Test real data only**

### **2. Configuration Changes**
- **Update API endpoints** to use correct seed service paths
- **Handle POST requests** properly
- **Remove mock data source** from fallback hierarchy

### **3. Testing**
- **Verify mock data is removed**
- **Test real data only**
- **Confirm production readiness**

## 🎉 **Summary**

**The issue**: Mock data is being used as fallback in production, which is not allowed.

**The cause**: Recommendation service is not properly connected to seed service, so it falls back to mock data.

**The solution**: Update recommendation service to remove mock data and properly connect to seed service.

**The result**: Real data only, no mock data, production-ready system.

The seed service has real data available - we just need to properly connect it and remove the mock data fallback!
