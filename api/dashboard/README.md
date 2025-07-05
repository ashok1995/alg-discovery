# AlgoDiscovery Streamlit Dashboard

A modern, interactive dashboard built with Streamlit that provides real-time analytics and monitoring for the AlgoDiscovery Trading System.

## 🚀 Features

- **Real-time System Monitoring**: CPU, memory, disk usage with interactive gauges
- **Database Analytics**: Collection stats, performance metrics, and size distribution
- **Cache Performance**: Redis metrics, hit/miss rates, and TTL distribution
- **API Analytics**: Request rates, response times, and status code distribution
- **Cron Job Monitoring**: Job status, execution times, and success rates
- **System Alerts**: Real-time alert display with severity levels
- **Architecture Visualization**: System component relationships and dependencies
- **Auto-refresh**: Configurable refresh intervals for live updates
- **Responsive Design**: Works on desktop and mobile devices

## 📋 Prerequisites

- Python 3.8 or higher
- AlgoDiscovery Dashboard API running on port 8005
- Internet connection for package installation

## 🛠️ Installation

### Option 1: Using the Startup Script (Recommended)

```bash
# Navigate to the dashboard directory
cd api/dashboard

# Run the startup script
./start_dashboard.sh
```

The startup script will:
- Create a virtual environment
- Install all dependencies
- Check if the Dashboard API is running
- Start the Streamlit application

### Option 2: Manual Installation

```bash
# Navigate to the dashboard directory
cd api/dashboard

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the application
streamlit run streamlit_app.py
```

## 🎯 Usage

1. **Start the Dashboard API** (if not already running):
   ```bash
   cd api/
   python dashboard_server.py
   ```

2. **Start the Streamlit Dashboard**:
   ```bash
   cd api/dashboard/
   ./start_dashboard.sh
   ```

3. **Access the Dashboard**:
   - Open your browser and go to: `http://localhost:8501`
   - The dashboard will automatically connect to the API

## 📊 Dashboard Sections

### System Health
- CPU, Memory, and Disk usage gauges
- System uptime and process count
- Real-time performance metrics

### Database Analytics
- Database size and collection statistics
- Document and index counts
- Performance metrics and connection status
- Size distribution charts

### Cache Analytics
- Redis connection status
- Key count and memory usage
- Hit/miss rates and eviction counts
- TTL distribution visualization

### API Analytics
- Request rates and response times
- Success/error rates
- Status code distribution
- Performance trends

### Cron Job Analytics
- Job execution statistics
- Success rates and failure counts
- Last run times
- Average execution times

### System Alerts
- Real-time alert display
- Severity-based color coding
- Alert history and status

### Architecture Graph
- System component relationships
- Dependency visualization
- Node and edge data tables

## ⚙️ Configuration

### Environment Variables

You can configure the dashboard by setting environment variables:

```bash
export DASHBOARD_API_URL="http://localhost:8005"
export REFRESH_INTERVAL=30
```

### Streamlit Configuration

The dashboard uses custom Streamlit configuration:

- **Port**: 8501
- **Host**: 0.0.0.0 (accessible from network)
- **Theme**: Light theme with custom colors
- **Headless**: True (no browser auto-open)

## 🔧 Troubleshooting

### Common Issues

1. **Dashboard API Not Running**
   ```
   Error: Failed to connect to Dashboard API
   ```
   **Solution**: Start the dashboard server first:
   ```bash
   cd api/
   python dashboard_server.py
   ```

2. **Port Already in Use**
   ```
   Error: Port 8501 is already in use
   ```
   **Solution**: Kill the existing process or change the port:
   ```bash
   # Kill existing process
   lsof -ti:8501 | xargs kill -9
   
   # Or change port in start_dashboard.sh
   DASHBOARD_PORT=8502
   ```

3. **Dependencies Not Found**
   ```
   ModuleNotFoundError: No module named 'streamlit'
   ```
   **Solution**: Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## 📈 Monitoring and Alerts

The dashboard provides several monitoring capabilities:

### System Health Monitoring
- CPU usage alerts (threshold: 80%)
- Memory usage alerts (threshold: 85%)
- Disk usage alerts (threshold: 90%)

### API Performance Monitoring
- Response time alerts (threshold: 2 seconds)
- Error rate alerts (threshold: 5%)
- Request rate monitoring

## 🔒 Security Considerations

- The dashboard runs on `0.0.0.0` by default (accessible from network)
- Consider firewall rules for production deployment
- Use HTTPS in production environments
- Implement authentication if needed

## 🚀 Deployment

### Local Development
```bash
./start_dashboard.sh
```

### Production Deployment
```bash
# Set production environment
export DASHBOARD_API_URL="https://your-api-domain.com"

# Start with production settings
streamlit run streamlit_app.py --server.port 8501 --server.address 0.0.0.0
```

## 📝 API Endpoints

The dashboard consumes these API endpoints:

- `GET /api/dashboard/` - Main dashboard data
- `GET /api/dashboard/health` - Health check
- `GET /api/dashboard/alerts` - System alerts
- `GET /api/dashboard/graph` - System architecture graph

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the AlgoDiscovery Trading System.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check system logs
4. Contact the development team

---

**Note**: This dashboard requires the AlgoDiscovery Dashboard API to be running for full functionality. 