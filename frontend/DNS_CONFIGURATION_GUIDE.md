# DNS Configuration Guide for algodiscovery.com

## Server Information
- **Domain**: `algodiscovery.com`
- **Server IP**: `49.207.227.136`
- **Port**: 80 (HTTP)
- **Container**: `algodiscovery-frontend-domain-prod`

## DNS Configuration Steps

### 1. Access Your DNS Provider
You need to access your DNS provider's control panel. Common providers include:
- **Cloudflare**: https://dash.cloudflare.com
- **GoDaddy**: https://dcc.godaddy.com
- **Namecheap**: https://ap.www.namecheap.com
- **AWS Route 53**: https://console.aws.amazon.com/route53
- **Google Cloud DNS**: https://console.cloud.google.com/net-services/dns

### 2. Create DNS Records

#### A Record (Primary)
```
Type: A
Name: @ (or algodiscovery.com)
Value: 49.207.227.136
TTL: 300 (5 minutes) or 3600 (1 hour)
```

#### A Record (www subdomain)
```
Type: A
Name: www
Value: 49.207.227.136
TTL: 300 (5 minutes) or 3600 (1 hour)
```

#### Optional: CNAME Record
```
Type: CNAME
Name: www
Value: algodiscovery.com
TTL: 300 (5 minutes) or 3600 (1 hour)
```

### 3. DNS Provider Specific Instructions

#### Cloudflare
1. Login to Cloudflare dashboard
2. Select your domain `algodiscovery.com`
3. Go to "DNS" tab
4. Click "Add record"
5. Set Type: A, Name: @, IPv4 address: 49.207.227.136
6. Click "Save"
7. Add another A record for www subdomain

#### GoDaddy
1. Login to GoDaddy account
2. Go to "My Products" → "DNS"
3. Click "Manage" next to your domain
4. Click "Add" in the Records section
5. Set Type: A, Host: @, Points to: 49.207.227.136
6. Click "Save"
7. Add another A record for www subdomain

#### Namecheap
1. Login to Namecheap account
2. Go to "Domain List" → "Manage" next to your domain
3. Go to "Advanced DNS" tab
4. Click "Add New Record"
5. Set Type: A Record, Host: @, Value: 49.207.227.136
6. Click "Save All Changes"
7. Add another A record for www subdomain

### 4. Verify DNS Configuration

#### Check DNS Propagation
```bash
# Check A record
nslookup algodiscovery.com

# Check with specific DNS server
nslookup algodiscovery.com 8.8.8.8

# Check www subdomain
nslookup www.algodiscovery.com
```

#### Test Domain Access
```bash
# Test HTTP access
curl -I http://algodiscovery.com

# Test health endpoint
curl http://algodiscovery.com/health

# Test frontend
curl http://algodiscovery.com/
```

### 5. DNS Propagation Time
- **TTL 300**: 5 minutes
- **TTL 3600**: 1 hour
- **Global propagation**: 24-48 hours (usually much faster)

### 6. Troubleshooting

#### If DNS Not Working
1. **Check DNS propagation**: Use online tools like:
   - https://www.whatsmydns.net/
   - https://dnschecker.org/
   - https://www.dnswatch.info/

2. **Clear DNS cache**:
   ```bash
   # macOS
   sudo dscacheutil -flushcache
   
   # Linux
   sudo systemctl restart systemd-resolved
   
   # Windows
   ipconfig /flushdns
   ```

3. **Check firewall**: Ensure port 80 is open
   ```bash
   # Check if port 80 is open
   netstat -tulpn | grep :80
   
   # Test from external
   telnet 49.207.227.136 80
   ```

#### Common Issues
- **Wrong IP**: Double-check the IP address
- **TTL too high**: Lower TTL for faster updates
- **DNS cache**: Clear local DNS cache
- **Firewall**: Ensure port 80 is accessible

### 7. Testing Commands

#### Local Testing
```bash
# Test localhost (should work immediately)
curl http://localhost/health

# Test with IP (should work if firewall allows)
curl http://49.207.227.136/health
```

#### Domain Testing
```bash
# Test domain (after DNS propagation)
curl http://algodiscovery.com/health

# Test www subdomain
curl http://www.algodiscovery.com/health

# Test with verbose output
curl -v http://algodiscovery.com/health
```

### 8. Expected Results

#### Before DNS Configuration
```bash
curl http://algodiscovery.com/health
# Expected: Connection refused or timeout
```

#### After DNS Configuration
```bash
curl http://algodiscovery.com/health
# Expected: "healthy"
```

### 9. Security Considerations

#### Firewall Configuration
```bash
# Allow HTTP traffic
sudo ufw allow 80/tcp

# Allow HTTPS traffic (for future SSL)
sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status
```

#### Nginx Security
- ✅ Security headers already configured
- ✅ CORS properly set up
- ✅ Rate limiting (can be added)
- ✅ SSL ready (for future HTTPS)

### 10. Monitoring

#### Check Container Status
```bash
# Check if container is running
docker ps | grep algodiscovery-frontend-domain-prod

# Check container logs
docker logs algodiscovery-frontend-domain-prod

# Check container health
docker inspect algodiscovery-frontend-domain-prod --format='{{.State.Health.Status}}'
```

#### Check Nginx Status
```bash
# Check nginx configuration
docker exec algodiscovery-frontend-domain-prod nginx -t

# Check nginx logs
docker exec algodiscovery-frontend-domain-prod tail -f /var/log/nginx/access.log
```

## Quick Start Commands

### 1. Configure DNS Records
Add these records to your DNS provider:
```
A    @    49.207.227.136
A    www  49.207.227.136
```

### 2. Wait for Propagation
```bash
# Check DNS propagation
nslookup algodiscovery.com
```

### 3. Test Domain Access
```bash
# Test health endpoint
curl http://algodiscovery.com/health

# Test frontend
curl http://algodiscovery.com/
```

### 4. Verify Everything Works
```bash
# Check container status
docker ps | grep algodiscovery-frontend-domain-prod

# Check logs
docker logs algodiscovery-frontend-domain-prod
```

## Next Steps After DNS Configuration

1. **Test domain access**: `curl http://algodiscovery.com/health`
2. **Deploy backend services**: On ports 8183, 8020, 8030, 8002
3. **Update backend CORS**: Allow `algodiscovery.com`
4. **Test full functionality**: Frontend + Backend integration
5. **Consider SSL/HTTPS**: For production security

Your frontend is ready and waiting for DNS configuration!
