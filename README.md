# Long-Term Investment Platform 🚀

A comprehensive, enterprise-grade investment platform with distributed processing, intelligent caching, and automated market data collection.

## 🏗️ Architecture Overview

The platform is built with a microservices architecture featuring:

- **Distributed Processing**: Background job scheduling with market-hours awareness
- **Multi-Database Support**: PostgreSQL, Redis, and MongoDB integration
- **Intelligent Caching**: Market-aware TTL and fallback mechanisms
- **Automated Data Collection**: Real-time and historical market data
- **System Monitoring**: Health checks, log rotation, and performance tracking
- **Enterprise Logging**: Day-wise partitioned logs with rotation
- **Frontend Separation**: Web UI handled by separate Streamlit module (not included in this core platform)

> **Note**: The Streamlit-based web interface is maintained as a separate module to ensure clean separation of concerns between the core investment platform and the user interface.

## 📁 Project Structure

```
alg-discovery/
├── core/                           # Core business logic
│   ├── database/                   # Database configurations
│   │   ├── config.py              # Multi-database manager
│   │   └── cache/                 
│   │       └── redis_manager.py   # Intelligent Redis caching
│   └── background/                # Background processing
│       └── cron_jobs/             # Scheduled jobs
│           ├── job_scheduler.py   # Distributed job scheduler
│           ├── market_data_jobs.py # Market data collection
│           └── system_maintenance_jobs.py # System maintenance
├── services/                      # Microservices
│   ├── analytics/                 # Analytics & backtesting
│   ├── long_term_investment/      # Long-term investment service
│   ├── main_orchestrator/         # Main API orchestrator
│   └── order_management/          # Order management
├── infrastructure/                # Infrastructure components
│   ├── docker/                    # Docker configurations
│   └── monitoring/                # Monitoring setup
├── config/                        # Configuration files
├── tests/                         # Comprehensive test suite
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   └── performance/               # Performance tests
├── tools/                         # Development tools
├── logs/                          # Application logs (day-wise)
├── archive/                       # Archived files
└── demo_service_manager.sh        # Service management script
```

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- PostgreSQL 13+
- Redis 6+
- MongoDB 5+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd alg-discovery
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup databases**
   ```bash
   # Start PostgreSQL, Redis, and MongoDB
   # Update connection strings in core/database/config.py
   ```

5. **Start services**
   ```bash
   # Start all services
   ./demo_service_manager.sh start all
   
   # Or start individual services
   ./demo_service_manager.sh start main
   ./demo_service_manager.sh start analytics
   ./demo_service_manager.sh start longterm
   ./demo_service_manager.sh start orders
   ```

## 🛠️ Service Management

The platform includes a comprehensive service manager with logging and monitoring:

### Basic Commands

```bash
# Start services
./demo_service_manager.sh start <service|all>
./demo_service_manager.sh stop <service|all>
./demo_service_manager.sh restart <service|all>

# Monitor services
./demo_service_manager.sh status
./demo_service_manager.sh show_logs <service> [lines]
./demo_service_manager.sh show_all_logs

# Get help
./demo_service_manager.sh help
./demo_service_manager.sh usage
```

### Available Services

- `main` - Main Orchestrator (API Gateway)
- `analytics` - Analytics & Backtesting Service
- `longterm` - Long-term Investment Service
- `orders` - Order Management Service

### Log Management

Logs are automatically partitioned by day and stored in `logs/daily/YYYY-MM-DD/`:

```bash
# View recent logs
./demo_service_manager.sh show_logs main 50

# Show all service logs
./demo_service_manager.sh show_all_logs

# Logs are automatically rotated and compressed
```

## 🗄️ Database Architecture

### Multi-Database Support

The platform uses three databases for different purposes:

1. **PostgreSQL** - Primary data storage
   - Stock data and historical records
   - User portfolios and transactions
   - System configuration

2. **Redis** - Intelligent caching
   - Market-aware TTL (shorter during market hours)
   - Real-time data caching
   - Session management

3. **MongoDB** - Document storage
   - Market data archives
   - Log aggregation
   - Analytics results

### Database Configuration

```python
from core.database.config import db_manager

# Get database connections
with db_manager.get_db() as db:
    # PostgreSQL operations
    
with db_manager.get_redis() as redis:
    # Redis operations
    
with db_manager.get_mongo() as mongo:
    # MongoDB operations
```

## 🔄 Background Processing

### Intelligent Job Scheduler

The platform features a distributed job scheduler with market-hours awareness:

```python
from core.background.cron_jobs.job_scheduler import add_cron_job, add_interval_job

# Add market-aware job
add_cron_job(
    job_id="market_data_collection",
    name="Real-time Data Collection",
    func=collect_market_data,
    minute="*/1",  # Every minute
    only_market_hours=True  # Only during market hours
)
```

### Automated Jobs

1. **Market Data Collection**
   - Real-time data: Every 1 minute during market hours
   - Historical data: Daily at 4 PM
   - Cache warming: 15 minutes before market open

2. **System Maintenance**
   - Health monitoring: Every 5 minutes
   - Log rotation: Daily at 1 AM
   - System cleanup: Daily at 3 AM
   - Daily reports: Daily at 11:59 PM

## 💾 Intelligent Caching

### Redis Cache Manager

Market-aware caching with automatic TTL adjustment:

```python
from core.database.cache.redis_manager import cache_get_with_fallback

# Intelligent caching with fallback
data = cache_get_with_fallback(
    "market_data_RELIANCE",
    fallback_function=fetch_from_api,
    ttl=None  # Uses market-aware TTL
)
```

### Cache Features

- **Market-aware TTL**: Shorter during market hours, longer when closed
- **Fallback mechanisms**: Automatic fallback to cached data on errors
- **Bulk operations**: Efficient bulk get/set operations
- **Pattern invalidation**: Clean up related cache entries
- **Statistics tracking**: Monitor cache performance

## 📊 System Monitoring

### Health Monitoring

Comprehensive system health checks:

```bash
# Check system health
curl http://localhost:8000/health

# Detailed health metrics
curl http://localhost:8000/health/detailed
```

### Performance Metrics

- **CPU and Memory usage**
- **Database connection health**
- **Cache hit rates**
- **Process monitoring**
- **Disk usage tracking**

### Alerting

The system generates alerts for:
- High CPU/Memory usage (>85%)
- Database connection failures
- Low cache hit rates (<50%)
- Disk space issues (>85%)

## 🧪 Testing

### Test Structure

```bash
tests/
├── unit/                  # Unit tests
├── integration/           # Integration tests
├── performance/           # Performance tests
└── fixtures/              # Test data
```

### Running Tests

```bash
# Run all tests
pytest

# Run specific test categories
pytest tests/unit/                    # Unit tests
pytest tests/integration/ -m integration  # Integration tests
pytest tests/performance/ -m performance  # Performance tests

# Run with coverage
pytest --cov=core --cov-report=html
```

### Test Categories

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **Performance Tests**: Measure system performance under load

## 🔧 Configuration

### Environment Variables

```bash
# Database URLs
POSTGRES_URL=postgresql://user:pass@localhost/investment_db
REDIS_URL=redis://localhost:6379/0
MONGO_URL=mongodb://localhost:27017/investment_db

# Market Configuration
MARKET_TIMEZONE=Asia/Kolkata
MARKET_OPEN_TIME=09:15
MARKET_CLOSE_TIME=15:30

# Cache Configuration
CACHE_DEFAULT_TTL=3600
CACHE_MARKET_HOURS_TTL=300
```

### Service Ports

- Main Orchestrator: `8000`
- Analytics Service: `8002`
- Long-term Investment: `8001`
- Order Management: `8003`

## 🚀 Deployment

### Docker Deployment

```bash
# Build and start services
docker-compose up -d

# Scale services
docker-compose up -d --scale analytics=3
```

### Production Considerations

1. **Database Clustering**: Setup PostgreSQL and MongoDB clusters
2. **Redis Cluster**: Configure Redis cluster for high availability
3. **Load Balancing**: Use nginx or similar for load balancing
4. **Monitoring**: Setup Prometheus and Grafana
5. **Logging**: Configure centralized logging with ELK stack

## 📈 Performance

### Benchmarks

- **Market Data Collection**: <2 seconds for 20 stocks
- **Cache Operations**: <1ms average response time
- **Database Queries**: <100ms for complex queries
- **API Response Times**: <50ms for cached data

### Optimization Features

- **Connection pooling**: Efficient database connections
- **Bulk operations**: Batch processing for better performance
- **Intelligent caching**: Reduces database load
- **Async processing**: Non-blocking operations

## 🔒 Security

### Security Features

- **Environment-based configuration**: Sensitive data in environment variables
- **Database connection encryption**: SSL/TLS for database connections
- **Input validation**: Pydantic models for data validation
- **Error handling**: Graceful error handling without data exposure

## 📚 API Documentation

### Endpoints

- **Health Check**: `GET /health`
- **Market Data**: `GET /api/v1/market-data`
- **Portfolio**: `GET /api/v1/portfolio`
- **Analytics**: `GET /api/v1/analytics`

### Interactive Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run the test suite
5. Create a pull request

### Code Quality

```bash
# Format code
black .
isort .

# Lint code
flake8 .
mypy .

# Run all quality checks
./tools/quality_check.sh
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **FastAPI**: Modern web framework
- **yfinance**: Market data provider
- **Redis**: Intelligent caching
- **PostgreSQL**: Reliable data storage
- **APScheduler**: Background job scheduling

## 🆘 Support

For support and questions:

1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information
4. Join our community discussions

---

**Built with ❤️ for intelligent investment management** 