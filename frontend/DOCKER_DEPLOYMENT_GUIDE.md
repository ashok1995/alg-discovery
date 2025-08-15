# 🐳 Docker Deployment Guide for AlgoDiscovery Frontend

This guide explains how to deploy the AlgoDiscovery frontend using Docker containers for production.

## 🎯 **What We've Built**

✅ **Production-ready Docker container** running on port 8080  
✅ **Nginx-based serving** with optimized configuration  
✅ **Health checks** and monitoring  
✅ **Automated deployment scripts**  
✅ **Parallel development** while production runs  

## 🚀 **Quick Deployment**

### **Option 1: Automated Deployment (Recommended)**
```bash
cd frontend
./docker-deploy.sh
```

### **Option 2: Manual Docker Commands**
```bash
cd frontend
docker-compose up -d
```

### **Option 3: Direct Docker Commands**
```bash
cd frontend
docker build -t algodiscovery-frontend .
docker run -d -p 8080:8080 --name algodiscovery-frontend-prod algodiscovery-frontend
```

## 🌍 **Environment Architecture**

### **Production (Port 8080)**
- **Frontend**: Docker container on port 8080
- **Recommendation Service**: Port 8010 (external)
- **Main API**: Port 8002 (external)
- **Theme API**: Port 8020 (external)

### **Development (Port 3000)**
- **Frontend**: Local development server on port 3000
- **Same backend services** as production

## 📋 **Deployment Checklist**

### **Pre-deployment**
- [ ] Docker is running locally
- [ ] Recommendation service is running on port 8010
- [ ] All backend services are healthy
- [ ] Frontend builds successfully

### **Deployment**
- [ ] Run `./docker-deploy.sh`
- [ ] Container starts successfully
- [ ] Health check passes
- [ ] Main page loads
- [ ] Recommendation test page accessible

### **Post-deployment**
- [ ] Test all major features
- [ ] Verify API connectivity
- [ ] Check logs for errors
- [ ] Monitor performance

## 🔧 **Docker Configuration Files**

### **Dockerfile**
- Multi-stage build (Node.js + Nginx)
- Production-optimized build
- Non-root user for security
- Health checks included

### **nginx.conf**
- Optimized for React SPA
- Gzip compression enabled
- Security headers configured
- API proxy to backend services

### **docker-compose.yml**
- Production service definition
- Health check configuration
- Log volume mounting
- Network isolation

## 📱 **Testing Your Deployment**

### **Health Check**
```bash
curl http://localhost:8080/health
# Expected: "healthy"
```

### **Main Application**
```bash
curl http://localhost:8080/
# Expected: HTML content
```

### **Recommendation Service Test**
```bash
# Open in browser: http://localhost:8080/test/recommendation-service
```

### **API Connectivity**
```bash
# Check browser console for API calls to port 8010
```

## 🛠️ **Management Commands**

### **View Container Status**
```bash
docker-compose ps
docker ps | grep algodiscovery
```

### **View Logs**
```bash
# Follow logs in real-time
docker-compose logs -f algodiscovery-frontend

# View recent logs
docker-compose logs algodiscovery-frontend
```

### **Stop/Start Services**
```bash
# Stop production
docker-compose down

# Start production
docker-compose up -d

# Restart production
docker-compose restart
```

### **Update Deployment**
```bash
# Rebuild and redeploy
./docker-deploy.sh

# Or manually
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🔄 **Development Workflow**

### **Scenario: Working on improvements while keeping production running**

1. **Keep Production Running** (Port 8080)
   ```bash
   # Production continues running in Docker
   # Access via: http://localhost:8080
   ```

2. **Start Development** (Port 3000)
   ```bash
   # In another terminal
   npm run start:local    # With DNS naming
   # or
   npm run start:dev      # Standard development
   ```

3. **Both environments run simultaneously**
   - Production: `http://localhost:8080` (stable)
   - Development: `http://localhost:3000` (new features)

## 🚨 **Troubleshooting**

### **Container Won't Start**
```bash
# Check logs
docker logs algodiscovery-frontend-prod

# Check container status
docker ps -a | grep algodiscovery

# Common issues:
# - Port 8080 already in use
# - Network conflicts
# - Permission issues
```

### **Health Check Failing**
```bash
# Check nginx configuration
docker exec -it algodiscovery-frontend-prod nginx -t

# Check nginx logs
docker exec -it algodiscovery-frontend-prod cat /var/log/nginx/error.log
```

### **API Connectivity Issues**
```bash
# Verify backend services are running
docker ps | grep 8010
docker ps | grep 8002

# Check network connectivity
docker exec -it algodiscovery-frontend-prod curl http://host.docker.internal:8010/health
```

### **Port Conflicts**
```bash
# Check what's using port 8080
lsof -i :8080

# Kill conflicting process
kill -9 <PID>
```

## 📊 **Monitoring & Logs**

### **Container Metrics**
```bash
# Resource usage
docker stats algodiscovery-frontend-prod

# Container info
docker inspect algodiscovery-frontend-prod
```

### **Nginx Logs**
```bash
# Access logs
docker exec -it algodiscovery-frontend-prod tail -f /var/log/nginx/access.log

# Error logs
docker exec -it algodiscovery-frontend-prod tail -f /var/log/nginx/error.log
```

### **Application Logs**
```bash
# Container logs
docker logs -f algodiscovery-frontend-prod

# Follow logs with timestamps
docker logs -f --timestamps algodiscovery-frontend-prod
```

## 🔒 **Security Features**

### **Container Security**
- Non-root user execution
- Minimal attack surface
- Read-only filesystem where possible
- Health check monitoring

### **Nginx Security**
- Security headers configured
- CORS properly configured
- Request size limits
- Error page handling

## 🚀 **Scaling & Production**

### **For Production Deployment**
1. **Use proper domain names** instead of localhost
2. **Configure SSL certificates** for HTTPS
3. **Set up load balancing** if needed
4. **Configure monitoring** and alerting
5. **Set up backup** and recovery procedures

### **Environment Variables**
```bash
# Production environment
NODE_ENV=production
PORT=8080
LOG_LEVEL=warn
```

## 📚 **Useful Commands Reference**

| Command | Description |
|---------|-------------|
| `./docker-deploy.sh` | Full automated deployment |
| `docker-compose up -d` | Start production services |
| `docker-compose down` | Stop production services |
| `docker-compose logs -f` | Follow logs in real-time |
| `docker-compose restart` | Restart production services |
| `docker-compose ps` | View service status |
| `docker exec -it algodiscovery-frontend-prod bash` | Access container shell |

## 🎉 **Success Indicators**

✅ **Container Status**: `Up (healthy)`  
✅ **Health Check**: `curl http://localhost:8080/health` returns "healthy"  
✅ **Main Page**: `curl http://localhost:8080/` returns HTML  
✅ **Recommendation Test**: Page loads without errors  
✅ **API Connectivity**: No CORS or connection errors in browser console  

---

**🎯 Your production environment is now running on port 8080 while you can continue development on port 3000!**
