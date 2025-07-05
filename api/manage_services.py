#!/usr/bin/env python3
"""
Central management script for all trading API services.
"""

import os
import sys
import argparse
import subprocess
import time
from typing import List, Optional
from enum import Enum
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ServiceGroup(str, Enum):
    ALL = "all"
    TRADING = "trading-apis"
    MONITORING = "monitoring"

class Service(str, Enum):
    VARIANT = "variant-api"
    VALIDATION = "validation-api"
    ALGORITHM = "algorithm-api"
    INTRADAY = "intraday-api"
    RECOMMENDATION = "recommendation-api"
    HEALTH = "health-check"

class ServiceManager:
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.supervisor_conf = os.path.join(self.base_dir, "api/supervisor/supervisord.conf")
        
        # Service to port mapping
        self.service_ports = {
            Service.VARIANT: 8011,
            Service.VALIDATION: 8012,
            Service.ALGORITHM: 8013,
            Service.INTRADAY: 8014,
            Service.RECOMMENDATION: 8015,
            Service.HEALTH: 8016
        }

    def _run_supervisorctl(self, command: str) -> subprocess.CompletedProcess:
        """Run supervisorctl command."""
        full_command = f"supervisorctl -c {self.supervisor_conf} {command}"
        return subprocess.run(full_command, shell=True, capture_output=True, text=True)

    def start_service(self, service: str):
        """Start a specific service."""
        logger.info(f"Starting service: {service}")
        result = self._run_supervisorctl(f"start {service}")
        if result.returncode == 0:
            logger.info(f"Successfully started {service}")
        else:
            logger.error(f"Failed to start {service}: {result.stderr}")

    def stop_service(self, service: str):
        """Stop a specific service."""
        logger.info(f"Stopping service: {service}")
        result = self._run_supervisorctl(f"stop {service}")
        if result.returncode == 0:
            logger.info(f"Successfully stopped {service}")
        else:
            logger.error(f"Failed to stop {service}: {result.stderr}")

    def restart_service(self, service: str):
        """Restart a specific service."""
        logger.info(f"Restarting service: {service}")
        result = self._run_supervisorctl(f"restart {service}")
        if result.returncode == 0:
            logger.info(f"Successfully restarted {service}")
        else:
            logger.error(f"Failed to restart {service}: {result.stderr}")

    def status(self, service: Optional[str] = None):
        """Get status of services."""
        command = "status" if not service else f"status {service}"
        result = self._run_supervisorctl(command)
        print(result.stdout)

    def start_group(self, group: ServiceGroup):
        """Start a group of services."""
        logger.info(f"Starting service group: {group}")
        result = self._run_supervisorctl(f"start {group}")
        if result.returncode == 0:
            logger.info(f"Successfully started group {group}")
        else:
            logger.error(f"Failed to start group {group}: {result.stderr}")

    def stop_group(self, group: ServiceGroup):
        """Stop a group of services."""
        logger.info(f"Stopping service group: {group}")
        result = self._run_supervisorctl(f"stop {group}")
        if result.returncode == 0:
            logger.info(f"Successfully stopped group {group}")
        else:
            logger.error(f"Failed to stop group {group}: {result.stderr}")

    def restart_group(self, group: ServiceGroup):
        """Restart a group of services."""
        logger.info(f"Restarting service group: {group}")
        result = self._run_supervisorctl(f"restart {group}")
        if result.returncode == 0:
            logger.info(f"Successfully restarted group {group}")
        else:
            logger.error(f"Failed to restart group {group}: {result.stderr}")

    def check_health(self, service: Service) -> bool:
        """Check health of a service by pinging its health endpoint."""
        port = self.service_ports.get(service)
        if not port:
            logger.error(f"No port configured for service {service}")
            return False

        try:
            import requests
            response = requests.get(f"http://localhost:{port}/health")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Health check failed for {service}: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(description="Manage trading API services")
    parser.add_argument("action", choices=["start", "stop", "restart", "status", "health"], help="Action to perform")
    parser.add_argument("--service", type=str, help="Specific service to manage")
    parser.add_argument("--group", type=str, choices=[g.value for g in ServiceGroup], help="Service group to manage")
    
    args = parser.parse_args()
    manager = ServiceManager()

    if args.action == "health":
        if args.service:
            try:
                service = Service(args.service)
                healthy = manager.check_health(service)
                print(f"{service}: {'Healthy' if healthy else 'Unhealthy'}")
            except ValueError:
                logger.error(f"Invalid service: {args.service}")
        else:
            for service in Service:
                healthy = manager.check_health(service)
                print(f"{service.value}: {'Healthy' if healthy else 'Unhealthy'}")
        return

    if args.group:
        group = ServiceGroup(args.group)
        if args.action == "start":
            manager.start_group(group)
        elif args.action == "stop":
            manager.stop_group(group)
        elif args.action == "restart":
            manager.restart_group(group)
        elif args.action == "status":
            manager.status(group)
    elif args.service:
        if args.action == "start":
            manager.start_service(args.service)
        elif args.action == "stop":
            manager.stop_service(args.service)
        elif args.action == "restart":
            manager.restart_service(args.service)
        elif args.action == "status":
            manager.status(args.service)
    else:
        if args.action == "status":
            manager.status()
        else:
            logger.error("Either --service or --group must be specified")

if __name__ == "__main__":
    main() 