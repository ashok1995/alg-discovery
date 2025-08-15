# Swing Trading Frontend

Frontend for Swing Trading System with real-time data integration.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
# Start development server
npm start

# Start with specific environment
npm run start:dev      # Development config
npm run start:local    # Local DNS config  
npm run start:prod     # Production config
```

### Production Deployment
```bash
# Deploy to port 8080
./deploy-production.sh

# Or manual deployment
npm run build:prod:8080
npm run serve:prod
```

## 🌍 Environment Configuration

We support **4 different environments** for parallel development and production:

- **Local Development**: `algodiscovery.local:3000` (with DNS naming)
- **Development**: `localhost:3000` (standard dev)
- **Production Testing**: `localhost:3000` (prod config on dev port)
- **Production Live**: `localhost:8080` (actual production)

### Setup Local DNS (One-time)
```bash
chmod +x setup-local-dns.sh
./setup-local-dns.sh
```

📖 **Full Environment Guide**: See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed configuration.

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start development server (port 3000) |
| `npm run start:dev` | Start with development config |
| `npm run start:local` | Start with local DNS config |
| `npm run start:prod` | Start production on port 8080 |
| `npm run start:prod:3000` | Test production on port 3000 |
| `npm run build` | Build for production |
| `npm run build:dev` | Build with development config |
| `npm run build:prod` | Build with production config |
| `npm run build:prod:8080` | Build for port 8080 deployment |
| `npm run serve:prod` | Serve production build on port 8080 |
| `npm run serve:dev` | Serve production build on port 3000 |

## 🧪 Testing

### Recommendation Service Test
Navigate to `/test/recommendation-service` to test the recommendation API connection.

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
├── services/           # API services
├── hooks/              # Custom React hooks
├── config/             # Configuration files
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## 🔗 API Integration

- **Recommendation Service**: Port 8010
- **Main API**: Port 8002  
- **Theme API**: Port 8020
- **Strategies API**: Port 8030

## 🚀 Deployment

### Production (Port 8080)
```bash
./deploy-production.sh
```

### Development (Port 3000)
```bash
npm run start:local    # With DNS naming
npm run start:dev      # Standard development
```

## 📚 Documentation

- [Environment Setup Guide](./ENVIRONMENT_SETUP.md)
- [API Integration Guide](./API_INTEGRATION_GUIDE.md)
- [Configuration Guide](./CONFIGURATION_CLEANUP_SUMMARY.md)

## 🤝 Contributing

1. Use appropriate environment for your work
2. Test on development port before production
3. Follow the environment configuration guide
4. Use the recommendation service test page

---

**For detailed environment setup, see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)**
