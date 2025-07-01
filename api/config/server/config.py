"""
Server Configuration
==================

HTTP server configuration and networking settings.
"""

import os
from typing import List, Optional

class ServerConfig:
    """HTTP server configuration settings."""
    
    def __init__(self):
        # Basic Server Settings
        self.host = os.getenv("HOST", "0.0.0.0")
        self.port = int(os.getenv("PORT", "8888"))
        self.workers = int(os.getenv("WORKERS", "1"))
        self.reload = os.getenv("RELOAD", "true").lower() == "true"
        self.access_log = os.getenv("ACCESS_LOG", "true").lower() == "true"
        
        # SSL Configuration
        self.ssl_keyfile = os.getenv("SSL_KEYFILE")
        self.ssl_certfile = os.getenv("SSL_CERTFILE")
        self.ssl_ca_certs = os.getenv("SSL_CA_CERTS")
        self.ssl_ciphers = os.getenv("SSL_CIPHERS", "TLSv1.2")
        
        # CORS Configuration
        origins_str = os.getenv("ALLOWED_ORIGINS", 
                               "http://localhost:3000,http://localhost:8501,http://127.0.0.1:3000,http://127.0.0.1:8501")
        self.allowed_origins = [origin.strip() for origin in origins_str.split(",") if origin.strip()]
        self.allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"]
        self.allowed_headers = ["*"]
        self.allow_credentials = os.getenv("ALLOW_CREDENTIALS", "true").lower() == "true"
        self.max_age = int(os.getenv("CORS_MAX_AGE", "3600"))
        
        # Request/Response Configuration
        self.max_request_size = int(os.getenv("MAX_REQUEST_SIZE", "16777216"))  # 16MB
        self.request_timeout = int(os.getenv("REQUEST_TIMEOUT", "30"))
        self.keep_alive = int(os.getenv("KEEP_ALIVE", "5"))
        
        # Logging Configuration
        self.log_level = os.getenv("SERVER_LOG_LEVEL", "info")
        self.log_config = {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                },
                "access": {
                    "format": "%(asctime)s - %(client_addr)s - \"%(request_line)s\" %(status_code)s",
                }
            },
            "handlers": {
                "default": {
                    "formatter": "default",
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stdout"
                },
                "access": {
                    "formatter": "access",
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stdout"
                }
            },
            "loggers": {
                "uvicorn": {
                    "handlers": ["default"],
                    "level": "INFO",
                    "propagate": False
                },
                "uvicorn.error": {
                    "level": "INFO"
                },
                "uvicorn.access": {
                    "handlers": ["access"],
                    "level": "INFO",
                    "propagate": False
                }
            }
        }
        
        # Performance Settings
        self.backlog = int(os.getenv("SERVER_BACKLOG", "2048"))
        self.limit_concurrency = int(os.getenv("LIMIT_CONCURRENCY", "1000"))
        self.limit_max_requests = int(os.getenv("LIMIT_MAX_REQUESTS", "0"))  # 0 = unlimited
        
        # Health Check Configuration
        self.health_check_enabled = os.getenv("HEALTH_CHECK_ENABLED", "true").lower() == "true"
        self.health_check_path = os.getenv("HEALTH_CHECK_PATH", "/health")
        self.ready_check_path = os.getenv("READY_CHECK_PATH", "/ready")
        
        # Middleware Configuration
        self.enable_gzip = os.getenv("ENABLE_GZIP", "true").lower() == "true"
        self.gzip_minimum_size = int(os.getenv("GZIP_MINIMUM_SIZE", "1024"))
        self.enable_trusted_host = os.getenv("ENABLE_TRUSTED_HOST", "false").lower() == "true"
        trusted_hosts_str = os.getenv("TRUSTED_HOSTS", "localhost,127.0.0.1")
        self.trusted_hosts = [host.strip() for host in trusted_hosts_str.split(",") if host.strip()]
        
        # Rate Limiting
        self.rate_limiting_enabled = os.getenv("RATE_LIMITING_ENABLED", "true").lower() == "true"
        self.rate_limit_requests = int(os.getenv("RATE_LIMIT_REQUESTS", "1000"))
        self.rate_limit_window = int(os.getenv("RATE_LIMIT_WINDOW", "3600"))  # 1 hour
        
        # API Documentation
        self.docs_enabled = os.getenv("DOCS_ENABLED", "true").lower() == "true"
        self.docs_url = os.getenv("DOCS_URL", "/docs")
        self.redoc_url = os.getenv("REDOC_URL", "/redoc")
        self.openapi_url = os.getenv("OPENAPI_URL", "/openapi.json")
        
        # Proxy Settings
        self.proxy_headers = os.getenv("PROXY_HEADERS", "false").lower() == "true"
        self.forwarded_allow_ips = os.getenv("FORWARDED_ALLOW_IPS", "*")
    
    def has_ssl(self) -> bool:
        """Check if SSL is configured."""
        return bool(self.ssl_keyfile and self.ssl_certfile)
    
    def get_cors_config(self) -> dict:
        """Get CORS configuration."""
        return {
            "allow_origins": self.allowed_origins,
            "allow_methods": self.allowed_methods,
            "allow_headers": self.allowed_headers,
            "allow_credentials": self.allow_credentials,
            "max_age": self.max_age
        }
    
    def get_uvicorn_config(self) -> dict:
        """Get uvicorn server configuration."""
        config = {
            "host": self.host,
            "port": self.port,
            "workers": self.workers,
            "reload": self.reload,
            "access_log": self.access_log,
            "log_level": self.log_level,
            "timeout_keep_alive": self.keep_alive,
            "limit_concurrency": self.limit_concurrency,
            "backlog": self.backlog,
            "log_config": self.log_config
        }
        
        # Add SSL configuration if available
        if self.has_ssl():
            config.update({
                "ssl_keyfile": self.ssl_keyfile,
                "ssl_certfile": self.ssl_certfile,
                "ssl_ca_certs": self.ssl_ca_certs,
                "ssl_ciphers": self.ssl_ciphers
            })
        
        # Add request limits if set
        if self.limit_max_requests > 0:
            config["limit_max_requests"] = self.limit_max_requests
        
        # Add proxy settings if enabled
        if self.proxy_headers:
            config["proxy_headers"] = True
            config["forwarded_allow_ips"] = self.forwarded_allow_ips
        
        return config
    
    def get_middleware_config(self) -> dict:
        """Get middleware configuration."""
        return {
            "gzip": {
                "enabled": self.enable_gzip,
                "minimum_size": self.gzip_minimum_size
            },
            "trusted_host": {
                "enabled": self.enable_trusted_host,
                "allowed_hosts": self.trusted_hosts
            },
            "rate_limiting": {
                "enabled": self.rate_limiting_enabled,
                "requests": self.rate_limit_requests,
                "window": self.rate_limit_window
            }
        }
    
    def get_api_docs_config(self) -> dict:
        """Get API documentation configuration."""
        return {
            "docs_enabled": self.docs_enabled,
            "docs_url": self.docs_url if self.docs_enabled else None,
            "redoc_url": self.redoc_url if self.docs_enabled else None,
            "openapi_url": self.openapi_url if self.docs_enabled else None
        }
    
    def get_server_info(self) -> dict:
        """Get server information summary."""
        return {
            "host": self.host,
            "port": self.port,
            "workers": self.workers,
            "ssl_enabled": self.has_ssl(),
            "cors_enabled": bool(self.allowed_origins),
            "docs_enabled": self.docs_enabled,
            "rate_limiting": self.rate_limiting_enabled,
            "health_checks": self.health_check_enabled
        } 