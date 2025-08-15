# 🌐 DNS Strategy for AlgoDiscovery Environments

## 🎯 **Overview**

We've implemented a **hybrid DNS strategy** that gives you the best of both worlds:

- **🚀 PRODUCTION**: Frontend uses DNS (`algodiscovery.prod:8080`) for clear identification
- **🛠️ DEVELOPMENT**: Everything uses localhost (`localhost:3000`) for simple access
- **🔧 BACKEND**: All services stay on localhost (no configuration changes needed)

## 🔍 **Why This Hybrid Strategy?**

### **Problem Solved**
- **Before**: Both environments used localhost, making it confusing to know which one you're testing
- **After**: Production frontend uses DNS names, backend stays on localhost - clear visual distinction without complexity

### **Benefits**
✅ **Clear Environment Identification**: You'll know immediately when you're testing production  
✅ **No Backend Changes**: All your existing backend services work exactly as they are  
✅ **Professional Testing**: Production environment looks more like real production  
✅ **Easy Development**: Development stays simple with localhost  
✅ **Zero Backend Complexity**: No need to update any backend configurations  

## 🌍 **Environment Configuration**

### **🚀 PRODUCTION (Port 8080) - Hybrid Approach**
```
Frontend:     http://algodiscovery.prod:8080  ← DNS for identification
API:          http://localhost:8002           ← Localhost (no changes)
Recommendations: http://localhost:8010       ← Localhost (no changes)
Theme:        http://localhost:8020           ← Localhost (no changes)
Strategies:   http://localhost:8030           ← Localhost (no changes)
```

### **🛠️ DEVELOPMENT (Port 3000) - All Localhost**
```
Frontend:     http://localhost:3000
API:          http://localhost:8002
Recommendations: http://localhost:8010
Theme:        http://localhost:8020
Strategies:   http://localhost:8030
```

## 🚀 **How to Use**

### **1. Setup DNS (One-time, minimal)**
```bash
cd frontend
./setup-local-dns.sh
# Only adds: 127.0.0.1 algodiscovery.prod
```

### **2. Start Development**
```bash
npm run start:local
# Access: http://localhost:3000
```

### **3. Deploy Production**
```bash
./docker-deploy.sh
# Access: http://algodiscovery.prod:8080
```

### **4. Both Run Simultaneously**
- **Development**: `http://localhost:3000` (new features)
- **Production**: `http://algodiscovery.prod:8080` (stable, clearly identified)

## 🔧 **Technical Implementation**

### **DNS Entries Added to /etc/hosts**
```
# Only ONE entry needed:
127.0.0.1 algodiscovery.prod
```

### **What You DON'T Need to Change**
❌ **Backend services** - Keep running on their current ports  
❌ **Backend configurations** - No updates required  
❌ **Network settings** - Everything stays localhost  
❌ **Service discovery** - All services work as before  

### **What Changes**
✅ **Frontend URL**: `http://algodiscovery.prod:8080` for production  
✅ **Environment variables**: Backend APIs point to localhost  
✅ **Visual identification**: Clear distinction between environments  

## 🧪 **Testing Scenarios**

### **Scenario 1: Testing Production**
```
1. Deploy: ./docker-deploy.sh
2. Open: http://algodiscovery.prod:8080
3. Clear indication: You're testing PRODUCTION
4. All backend APIs work on localhost (no changes needed)
5. Test all features and APIs
```

### **Scenario 2: Development Work**
```
1. Start: npm run start:local
2. Open: http://localhost:3000
3. Clear indication: You're in DEVELOPMENT
4. Work on new features
```

### **Scenario 3: Parallel Testing**
```
Terminal 1: ./docker-deploy.sh          # Production on algodiscovery.prod:8080
Terminal 2: npm run start:local         # Development on localhost:3000

Test Production: http://algodiscovery.prod:8080
Test Development: http://localhost:3000
```

## 💡 **Best Practices**

### **For Production Testing**
- Always use `http://algodiscovery.prod:8080`
- This clearly indicates you're testing production
- Backend services work exactly as before
- Use the recommendation service test page

### **For Development**
- Use `http://localhost:3000`
- Simple and fast access
- No DNS setup required
- Perfect for rapid iteration

### **For Backend Services**
- **No changes needed** - keep everything as is
- All services continue running on localhost
- No configuration updates required
- No network changes needed

## 🚨 **Troubleshooting**

### **DNS Not Working**
```bash
# Check if entry exists
grep "algodiscovery.prod" /etc/hosts

# Re-run DNS setup
./setup-local-dns.sh

# Flush DNS cache (macOS)
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### **Backend Services Not Working**
```bash
# Check if services are running on localhost
curl http://localhost:8010/health  # Recommendations
curl http://localhost:8002/health  # Main API
curl http://localhost:8020/health  # Theme API

# If not working, start your backend services as usual
# No DNS changes needed for backend
```

## 📊 **Environment Comparison**

| Aspect | Development | Production |
|--------|-------------|------------|
| **Frontend URL** | `localhost:3000` | `algodiscovery.prod:8080` |
| **Backend APIs** | `localhost:8002, 8010, 8020` | `localhost:8002, 8010, 8020` |
| **DNS Setup** | None required | One entry: `algodiscovery.prod` |
| **Backend Changes** | None | None |
| **Identification** | Simple localhost | Clear DNS naming |
| **Complexity** | Minimal | Minimal |

## 🎉 **Success Indicators**

✅ **Production Frontend**: `http://algodiscovery.prod:8080` works  
✅ **Development**: `http://localhost:3000` works  
✅ **Backend Services**: All work on localhost (no changes)  
✅ **Clear Distinction**: You can easily tell which environment you're using  
✅ **Zero Backend Complexity**: No backend configuration updates needed  

## 🔒 **What You're Protected From**

- ❌ **No backend service updates** required
- ❌ **No network configuration** changes
- ❌ **No service discovery** modifications
- ❌ **No port changes** for existing services
- ❌ **No complex DNS** setup for backend

---

**🎯 Result: You get crystal-clear environment identification with ZERO backend complexity!**
- **Production Frontend**: `algodiscovery.prod:8080` (DNS for identification)
- **Production Backend**: `localhost:8002, 8010, 8020` (no changes needed)
- **Development**: `localhost:3000` (simple access)
