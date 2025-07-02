"""
Test Suite for Long-Term Investment Platform
Comprehensive testing framework with unit, integration, and performance tests
"""

import os
import sys
import pytest
import logging
from typing import Dict, Any
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Configure test logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tests/test.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class TestConfig:
    """Test configuration and utilities"""
    
    # Test database configurations
    TEST_POSTGRES_URL = "postgresql://test_user:test_pass@localhost:5432/test_investment_db"
    TEST_REDIS_URL = "redis://localhost:6379/1"  # Use DB 1 for tests
    TEST_MONGO_URL = "mongodb://localhost:27017/test_investment_db"
    
    # Test data directories
    TEST_DATA_DIR = Path(__file__).parent / "test_data"
    FIXTURES_DIR = Path(__file__).parent / "fixtures"
    
    @classmethod
    def setup_test_environment(cls):
        """Setup test environment"""
        # Ensure test directories exist
        cls.TEST_DATA_DIR.mkdir(exist_ok=True)
        cls.FIXTURES_DIR.mkdir(exist_ok=True)
        
        # Set test environment variables
        os.environ['TESTING'] = 'true'
        os.environ['TEST_POSTGRES_URL'] = cls.TEST_POSTGRES_URL
        os.environ['TEST_REDIS_URL'] = cls.TEST_REDIS_URL
        os.environ['TEST_MONGO_URL'] = cls.TEST_MONGO_URL
        
        logger.info("Test environment configured")
    
    @classmethod
    def cleanup_test_environment(cls):
        """Cleanup test environment"""
        # Remove test environment variables
        test_env_vars = ['TESTING', 'TEST_POSTGRES_URL', 'TEST_REDIS_URL', 'TEST_MONGO_URL']
        for var in test_env_vars:
            os.environ.pop(var, None)
        
        logger.info("Test environment cleaned up")

# Initialize test configuration
test_config = TestConfig()

# Common test fixtures
@pytest.fixture(scope="session", autouse=True)
def setup_test_session():
    """Setup test session"""
    test_config.setup_test_environment()
    yield
    test_config.cleanup_test_environment()

@pytest.fixture
def sample_stock_data():
    """Sample stock data for testing"""
    return {
        'RELIANCE.NS': {
            'symbol': 'RELIANCE.NS',
            'price': 2450.50,
            'open': 2440.00,
            'high': 2460.75,
            'low': 2435.25,
            'volume': 1500000,
            'change': 10.50,
            'change_percent': 0.43,
            'market_cap': 16500000000000,
            'pe_ratio': 24.5
        },
        'TCS.NS': {
            'symbol': 'TCS.NS',
            'price': 3550.25,
            'open': 3540.00,
            'high': 3565.80,
            'low': 3530.10,
            'volume': 800000,
            'change': 10.25,
            'change_percent': 0.29,
            'market_cap': 13200000000000,
            'pe_ratio': 28.3
        }
    }

@pytest.fixture
def sample_market_data():
    """Sample market data including indices"""
    return {
        'stocks': {
            'RELIANCE.NS': {
                'symbol': 'RELIANCE.NS',
                'price': 2450.50,
                'change_percent': 0.43
            }
        },
        'indices': {
            '^NSEI': {
                'symbol': '^NSEI',
                'price': 21800.50,
                'change_percent': 0.25
            }
        },
        'timestamp': '2025-01-02T10:30:00Z',
        'market_open': True
    } 