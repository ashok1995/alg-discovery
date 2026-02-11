"""
Security Configuration
=====================

Security, authentication, and authorization settings.
"""

import os
from typing import List

class SecurityConfig:
    """Security configuration settings."""
    
    def __init__(self):
        # Authentication settings
        self.secret_key = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.refresh_token_expire_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
        
        # API security
        self.api_key_required = os.getenv("API_KEY_REQUIRED", "false").lower() == "true"
        self.rate_limiting_enabled = os.getenv("RATE_LIMITING_ENABLED", "true").lower() == "true"
        self.max_requests_per_minute = int(os.getenv("MAX_REQUESTS_PER_MINUTE", "60"))
        
        # CORS settings (moved here for security context)
        self.cors_enabled = os.getenv("CORS_ENABLED", "true").lower() == "true"
        origins_str = os.getenv("ALLOWED_ORIGINS", 
                               "http://localhost:3000,http://localhost:8501")
        self.allowed_origins = [origin.strip() for origin in origins_str.split(",")]
        
        # Request validation
        self.request_validation_enabled = os.getenv("REQUEST_VALIDATION", "true").lower() == "true"
        self.max_request_size = int(os.getenv("MAX_REQUEST_SIZE", "1048576"))  # 1MB
        self.sanitize_inputs = os.getenv("SANITIZE_INPUTS", "true").lower() == "true"
        
        # IP filtering
        self.ip_filtering_enabled = os.getenv("IP_FILTERING_ENABLED", "false").lower() == "true"
        allowed_ips_str = os.getenv("ALLOWED_IPS", "127.0.0.1,::1")
        self.allowed_ips = [ip.strip() for ip in allowed_ips_str.split(",")]
        
        # Security headers
        self.security_headers_enabled = os.getenv("SECURITY_HEADERS", "true").lower() == "true"
        self.hsts_enabled = os.getenv("HSTS_ENABLED", "false").lower() == "true"
        self.content_security_policy = os.getenv("CSP", "default-src 'self'")
        
        # Encryption settings
        self.encryption_enabled = os.getenv("ENCRYPTION_ENABLED", "false").lower() == "true"
        self.encryption_algorithm = os.getenv("ENCRYPTION_ALGORITHM", "AES-256-GCM")
        
        # Session management
        self.session_timeout = int(os.getenv("SESSION_TIMEOUT", "3600"))  # 1 hour
        self.max_sessions_per_user = int(os.getenv("MAX_SESSIONS_PER_USER", "5"))
        
        # Audit logging
        self.audit_logging_enabled = os.getenv("AUDIT_LOGGING", "true").lower() == "true"
        self.log_failed_attempts = os.getenv("LOG_FAILED_ATTEMPTS", "true").lower() == "true"
        self.max_failed_attempts = int(os.getenv("MAX_FAILED_ATTEMPTS", "5"))
        self.lockout_duration = int(os.getenv("LOCKOUT_DURATION", "900"))  # 15 minutes
    
    def is_origin_allowed(self, origin: str) -> bool:
        """Check if an origin is allowed."""
        return origin in self.allowed_origins or not self.cors_enabled
    
    def is_ip_allowed(self, ip: str) -> bool:
        """Check if an IP address is allowed."""
        return ip in self.allowed_ips or not self.ip_filtering_enabled
    
    def get_security_headers(self) -> dict:
        """Get security headers to include in responses."""
        if not self.security_headers_enabled:
            return {}
        
        headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }
        
        if self.content_security_policy:
            headers["Content-Security-Policy"] = self.content_security_policy
        
        if self.hsts_enabled:
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return headers
    
    def get_security_config_summary(self) -> dict:
        """Get security configuration summary."""
        return {
            "api_key_required": self.api_key_required,
            "rate_limiting_enabled": self.rate_limiting_enabled,
            "cors_enabled": self.cors_enabled,
            "request_validation_enabled": self.request_validation_enabled,
            "ip_filtering_enabled": self.ip_filtering_enabled,
            "security_headers_enabled": self.security_headers_enabled,
            "audit_logging_enabled": self.audit_logging_enabled,
            "encryption_enabled": self.encryption_enabled,
            "max_requests_per_minute": self.max_requests_per_minute,
            "session_timeout": self.session_timeout,
            "allowed_origins_count": len(self.allowed_origins),
            "allowed_ips_count": len(self.allowed_ips)
        } 