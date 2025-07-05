# Long-Term Investment Platform

A comprehensive microservices-based platform for long-term investment analysis, portfolio management, and automated trading. The system is designed specifically for investments with a horizon of 1+ years, focusing on fundamental analysis, risk management, and strategic portfolio optimization.

## 🏗️ Architecture Overview

The platform consists of 4 main microservices, each running on different ports:

```
┌─────────────────────────────────────────────────────────────┐
│                    Main Orchestrator                         │
│                     (Port 8000)                             │
│              API Gateway & Coordination                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┼───────────────────────────┐
          │           │                           │
    ┌─────▼─────┐ ┌───▼────┐              ┌─────▼─────┐
    │ Long-Term │ │Analytics│              │   Order   │
    │Investment │ │& Backtest│             │Management │
    │(Port 8001)│ │(Port 8002)│            │(Port 8003)│
    │           │ │         │              │           │
    └───────────┘ └─────────┘              └───────────┘
```

### Service Details

| Service | Port | Purpose | Key Features |
|---------|------|---------|-------------|
| **Main Orchestrator** | 8000 | API Gateway & Coordination | • Unified API endpoints<br>• Service orchestration<br>• Dashboard aggregation<br>• Investment workflows |
| **Long-Term Investment** | 8001 | Stock Analysis & Recommendations | • Fundamental analysis<br>• Long-term scoring<br>• Sector analysis<br>• Market outlook |
| **Analytics & Backtesting** | 8002 | Performance Analysis | • Strategy backtesting<br>• Portfolio optimization<br>• Risk analysis<br>• Performance metrics |
| **Order Management** | 8003 | Trading & Portfolio Management | • Order execution<br>• Portfolio tracking<br>• Risk management<br>• Position monitoring |

## 🚀 Quick Start

### Prerequisites

```bash
# Python 3.8+
python --version

# Install required dependencies
pip install fastapi uvicorn httpx requests numpy pandas yfinance
```

### Starting the Platform

#### Option 1: Start All Services (Recommended)
```bash
# Start all services with monitoring
python start_services.py --monitor

# Or start all services without monitoring
python start_services.py
```

#### Option 2: Start Individual Services
```bash
# Start a specific service
python start_services.py --single orchestrator
python start_services.py --single longterm
python start_services.py --single analytics
python start_services.py --single orders
```

#### Option 3: Manual Startup
```bash
# Terminal 1 - Long-term Investment Service
python longterm_server.py

# Terminal 2 - Analytics & Backtesting Service
python analytics_server.py

# Terminal 3 - Order Management Service
python order_server.py

# Terminal 4 - Main Orchestrator
python main_orchestrator.py
```

### Accessing the Platform

Once all services are running:

- **Main Dashboard**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Service Health**: http://localhost:8000/health/all

Individual service documentation:
- Long-term Investment: http://localhost:8001/docs
- Analytics & Backtesting: http://localhost:8002/docs
- Order Management: http://localhost:8003/docs

## 📊 Key Features

### 1. Long-Term Investment Analysis
- **Fundamental Analysis**: P/E ratios, debt levels, revenue growth
- **Technical Indicators**: Moving averages, RSI, momentum
- **Sector Analysis**: Industry performance and trends
- **Market Outlook**: Overall market conditions assessment

### 2. Portfolio Management
- **Position Tracking**: Real-time portfolio monitoring
- **Risk Assessment**: Diversification and concentration analysis
- **Rebalancing**: Automated portfolio rebalancing suggestions
- **Performance Metrics**: Returns, volatility, Sharpe ratio

### 3. Analytics & Backtesting
- **Strategy Backtesting**: Historical performance simulation
- **Portfolio Optimization**: Modern Portfolio Theory implementation
- **Risk Analysis**: VaR, correlation analysis
- **Comparative Analysis**: Strategy comparison tools

### 4. Order Management
- **Order Execution**: Market and limit orders
- **Risk Management**: Position limits and stop-losses
- **Trade Notifications**: Real-time trade updates
- **Compliance**: Regulatory compliance checks

## 🔧 API Usage Examples

### Investment Analysis Workflow

```python
import requests

# 1. Analyze investment opportunities
analysis_data = {
    "symbols": ["AAPL", "MSFT", "GOOGL"],
    "total_investment": 10000,
    "risk_tolerance": "moderate",
    "time_horizon": 5
}

response = requests.post(
    "http://localhost:8000/api/invest/analyze", 
    json=analysis_data
)
analysis = response.json()

# 2. Complete investment workflow with execution
workflow_data = {
    "symbols": ["AAPL", "MSFT"],
    "investment_amount": 5000,
    "strategy": "buy_and_hold",
    "auto_execute": False  # Set to True for automatic execution
}

response = requests.post(
    "http://localhost:8000/api/invest/workflow",
    json=workflow_data
)
workflow_result = response.json()
```

### Portfolio Monitoring

```python
# Get complete portfolio overview
response = requests.get("http://localhost:8000/api/portfolio/overview")
portfolio = response.json()

# Get dashboard overview
response = requests.get("http://localhost:8000/api/dashboard/overview")
dashboard = response.json()
```

### Individual Service Calls

```python
# Long-term service - Get recommendations
response = requests.get("http://localhost:8001/api/longterm/recommendations")
recommendations = response.json()

# Analytics service - Run backtest
backtest_data = {
    "symbols": ["AAPL"],
    "start_date": "2020-01-01",
    "end_date": "2023-01-01",
    "initial_capital": 10000
}

response = requests.post(
    "http://localhost:8002/api/analytics/backtest",
    json=backtest_data
)
backtest_results = response.json()

# Order service - Place order
order_data = {
    "symbol": "AAPL",
    "side": "BUY",
    "quantity": 10,
    "order_type": "MARKET"
}

response = requests.post(
    "http://localhost:8003/api/orders/place",
    json=order_data
)
order_result = response.json()
```

## 🛠️ Service Management

The enhanced service manager provides dynamic control over all microservices with PID tracking, individual service management, and advanced monitoring capabilities.

### 📋 List Available Services
```bash
python start_services.py --list
```

### 📊 Check Service Status
```bash
python start_services.py --status
```

### 🚀 Starting Services

#### Start All Services
```bash
python start_services.py
```

#### Start Specific Service
```bash
python start_services.py --single longterm      # Long-term Investment Service
python start_services.py --single analytics     # Analytics & Backtesting Service  
python start_services.py --single orders        # Order Management Service
python start_services.py --single orchestrator  # Main Orchestrator
```

### 🔄 Restarting Services

#### Restart Specific Service
```bash
python start_services.py --restart longterm     # Restart Long-term Service
python start_services.py --restart analytics    # Restart Analytics Service
python start_services.py --restart orders       # Restart Order Service
python start_services.py --restart orchestrator # Restart Main Orchestrator
```

### 🛑 Stopping Services

#### Stop All Services
```bash
python start_services.py --stop
```

#### Stop Specific Service
```bash
python start_services.py --stop-service longterm      # Stop specific service
python start_services.py --stop-service analytics
python start_services.py --stop-service orders
python start_services.py --stop-service orchestrator
```

### 👁️ Service Monitoring

#### Start with Monitoring
```bash
python start_services.py --monitor              # Start all services with monitoring
python start_services.py --single longterm --monitor  # Start single service with monitoring
```

#### Development Mode
```bash
python start_services.py --dev                  # Start in development mode
```

### 🔧 Advanced Features

#### PID Management
- **Automatic PID Storage**: PIDs are stored in `.service_pids.json` for persistence
- **Stale PID Cleanup**: Automatically removes PIDs of stopped processes
- **Cross-Session Control**: Restart/stop services even after terminal restart

#### Service Health Monitoring
- **Health Checks**: HTTP health endpoint monitoring
- **Process Monitoring**: Real-time process status checking
- **Auto-Recovery**: Automatic service restart on failure (with --monitor)

#### Service Status Information
The status command shows comprehensive information:
- **Service Name and Port**
- **Process ID (PID)**
- **Running Status**
- **Health Status**
- **Start Time**

### 📚 Usage Examples

```bash
# Complete workflow example
python start_services.py --list                    # See available services
python start_services.py --status                  # Check current status
python start_services.py --single longterm         # Start long-term service
python start_services.py --restart longterm        # Restart it
python start_services.py --single analytics        # Start analytics service
python start_services.py --status                  # Check status of both
python start_services.py --stop-service longterm   # Stop one service
python start_services.py --stop                    # Stop remaining services
```

### 🎯 Service Management Demo

Run the interactive demo to see all features:
```bash
python demo_service_manager.py                     # Full interactive demo
python demo_service_manager.py --examples          # Show usage examples
python demo_service_manager.py --help              # Show help
```

### ⚙️ Configuration Files

- **`.service_pids.json`**: Stores process IDs for persistence (auto-generated)
- **Service scripts**: Individual server files (longterm_server.py, etc.)
- **Requirements**: All dependencies listed in requirements.txt

### 🚨 Troubleshooting

#### Service Won't Start
```bash
python start_services.py --status                  # Check what's running
python start_services.py --stop                    # Stop all services
python start_services.py --single SERVICE_NAME     # Try starting individually
```

#### Port Conflicts
```bash
# Check if ports are in use
lsof -i :8000  # Check port 8000
lsof -i :8001  # Check port 8001
lsof -i :8002  # Check port 8002
lsof -i :8003  # Check port 8003

# Stop conflicting services
python start_services.py --stop
```

#### Stale Processes
```bash
python start_services.py --status                  # Will auto-cleanup stale PIDs
rm .service_pids.json                              # Manual PID file cleanup if needed
```

## 📁 File Structure

```
alg-discovery/
├── main_orchestrator.py          # Main API gateway (Port 8000)
├── longterm_server.py            # Long-term investment service (Port 8001)
├── analytics_server.py           # Analytics & backtesting service (Port 8002)
├── order_server.py              # Order management service (Port 8003)
├── start_services.py            # Service startup script
├── README.md                    # This file
├── api/
│   ├── main.py                  # Original main API
│   └── services/
│       └── data_service.py      # Data service utilities
├── algorithms/
│   └── strategies/
│       ├── longterm_strategy.py # Long-term investment strategy
│       └── longterm_service.py  # Long-term investment service
└── order/                       # Order management modules (optional)
    ├── order_manager.py
    ├── risk_manager.py
    └── ...
```

## 🎯 Long-Term Investment Focus

This platform is specifically designed for long-term investments (1+ years). Key characteristics:

### Investment Philosophy
- **Buy and Hold**: Focus on quality companies for long-term growth
- **Fundamental Analysis**: Emphasis on company financials and business metrics
- **Diversification**: Risk reduction through portfolio diversification
- **Risk Management**: Conservative approach with defined risk limits

### Analysis Metrics
- **Financial Health**: Debt-to-equity, current ratio, ROE
- **Growth Potential**: Revenue growth, earnings growth, market expansion
- **Valuation**: P/E ratio, P/B ratio, PEG ratio
- **Market Position**: Market share, competitive advantages, moats

### Risk Considerations
- **Time Horizon**: Minimum 1-year investment horizon
- **Volatility**: Focus on stable, established companies
- **Diversification**: Sector and geographic diversification
- **Rebalancing**: Periodic portfolio rebalancing (quarterly/annually)

## 🔧 Configuration

### Environment Variables
```bash
# Data service configuration
export DATA_PROVIDER="yfinance"
export CACHE_TIMEOUT="300"

# Risk management
export MAX_POSITION_SIZE="0.20"  # 20% max position size
export MAX_DAILY_LOSS="0.05"     # 5% max daily loss

# Service URLs (for development)
export LONGTERM_SERVICE_URL="http://localhost:8001"
export ANALYTICS_SERVICE_URL="http://localhost:8002"
export ORDER_SERVICE_URL="http://localhost:8003"
```

### Service Configuration
Each service can be configured through environment variables or configuration files:

- **Port Configuration**: Modify ports in `start_services.py`
- **API Keys**: Set API keys for data providers
- **Database URLs**: Configure database connections (if using persistent storage)
- **Risk Limits**: Set default risk management parameters

## 🚨 Error Handling

The platform includes comprehensive error handling:

- **Service Health Monitoring**: Automatic health checks
- **Graceful Degradation**: Services continue operating if others fail
- **Error Logging**: Detailed error logs for debugging
- **Retry Logic**: Automatic retries for transient failures

## 📈 Performance Considerations

### Scalability
- **Microservices Architecture**: Independent scaling of services
- **Async Processing**: Non-blocking API calls
- **Connection Pooling**: Efficient database connections
- **Caching**: Response caching for frequently accessed data

### Optimization
- **Parallel Processing**: Concurrent analysis of multiple symbols
- **Data Caching**: Cache market data to reduce API calls
- **Efficient Algorithms**: Optimized calculation algorithms
- **Resource Management**: Proper cleanup of resources

## 🔒 Security Considerations

### API Security
- **CORS Configuration**: Proper cross-origin resource sharing
- **Input Validation**: Comprehensive input validation
- **Error Handling**: Secure error messages (no sensitive data exposure)
- **Rate Limiting**: API rate limiting (recommended for production)

### Deployment Security
- **Environment Variables**: Secure configuration management
- **Service Communication**: Secure inter-service communication
- **Access Control**: Authentication and authorization (recommended for production)
- **Data Encryption**: Encrypt sensitive data in transit and at rest

## 🧪 Testing

### Manual Testing
```bash
# Test all services are running
python start_services.py --status

# Test main endpoints
curl http://localhost:8000/health/all
curl http://localhost:8000/api/dashboard/overview
```

### Service-Specific Testing
```bash
# Test long-term service
curl http://localhost:8001/api/longterm/recommendations

# Test analytics service
curl http://localhost:8002/api/analytics/market/sectors

# Test order service
curl http://localhost:8003/api/portfolio/positions
```

## 🚀 Production Deployment

### Docker Deployment (Recommended)
```dockerfile
# Example Dockerfile for a service
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "main_orchestrator.py"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  orchestrator:
    build: .
    ports:
      - "8000:8000"
    environment:
      - SERVICE_MODE=orchestrator
    depends_on:
      - longterm
      - analytics
      - orders

  longterm:
    build: .
    ports:
      - "8001:8001"
    environment:
      - SERVICE_MODE=longterm

  analytics:
    build: .
    ports:
      - "8002:8002"
    environment:
      - SERVICE_MODE=analytics

  orders:
    build: .
    ports:
      - "8003:8003"
    environment:
      - SERVICE_MODE=orders
```

### Production Considerations
- **Load Balancing**: Use nginx or similar for load balancing
- **Database**: Use production-grade databases (PostgreSQL, MongoDB)
- **Monitoring**: Implement comprehensive monitoring (Prometheus, Grafana)
- **Logging**: Centralized logging (ELK stack)
- **Backup**: Regular data backups
- **SSL/TLS**: HTTPS encryption
- **Authentication**: User authentication and authorization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, please:
1. Check the API documentation at http://localhost:8000/docs
2. Review the service logs for error messages
3. Ensure all services are healthy using `python start_services.py --status`
4. Submit issues through the repository issue tracker

## 🔮 Future Enhancements

### Planned Features
- **Machine Learning Models**: AI-powered investment recommendations
- **Real-time Data Streams**: WebSocket connections for live data
- **Advanced Charting**: Interactive charts and visualizations
- **Mobile App**: Mobile application for portfolio monitoring
- **Social Features**: Investment communities and sharing
- **Tax Optimization**: Tax-efficient portfolio management
- **ESG Integration**: Environmental, Social, and Governance factors
- **International Markets**: Support for global stock exchanges

### Technology Roadmap
- **Database Integration**: PostgreSQL/MongoDB for persistent storage
- **Event Streaming**: Apache Kafka for real-time event processing
- **Caching Layer**: Redis for high-performance caching
- **Message Queues**: RabbitMQ for asynchronous processing
- **Containerization**: Full Docker containerization
- **Cloud Deployment**: AWS/GCP/Azure deployment options
- **CI/CD Pipeline**: Automated testing and deployment
- **Monitoring Stack**: Prometheus, Grafana, ELK stack integration

---

**Happy Investing! 📈💰** 