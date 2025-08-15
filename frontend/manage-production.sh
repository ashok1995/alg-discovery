#!/bin/bash

# AlgoDiscovery Production Environment Manager
# This script provides easy management of the production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose-port80.yml"
FRONTEND_SERVICE="algodiscovery-frontend-prod"
PROXY_SERVICE="algodiscovery-nginx-proxy"
PRODUCTION_URL="http://algodiscovery.prod"

# Function to print colored output
print_status() {
    local status="$1"
    local message="$2"
    case $status in
        "info") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "success") echo -e "${GREEN}✅ $message${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "error") echo -e "${RED}❌ $message${NC}" ;;
        "header") echo -e "${PURPLE}🚀 $message${NC}" ;;
        "subheader") echo -e "${CYAN}📋 $message${NC}" ;;
    esac
}

# Alias functions for easier calling
print_info() { print_status "info" "$1"; }
print_success() { print_status "success" "$1"; }
print_warning() { print_status "warning" "$1"; }
print_error() { print_status "error" "$1"; }
print_header() { print_status "header" "$1"; }
print_subheader() { print_status "subheader" "$1"; }

# Function to check if containers are running
check_status() {
    local running_containers
    running_containers=$(docker ps --format "{{.Names}}" | grep -E "(algodiscovery-frontend-prod|algodiscovery-nginx-proxy)" | wc -l)
    echo $running_containers
}

# Function to show current status
show_status() {
    print_header "Production Environment Status"
    echo ""
    
    local container_count=$(check_status)
    
    if [ "$container_count" -eq 2 ]; then
        print_success "All production containers are running"
        echo ""
        
        # Show container details
        print_subheader "Container Details:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep algodiscovery
        
        echo ""
        print_subheader "Service URLs:"
        echo "   🌐 Production Frontend: $PRODUCTION_URL"
        echo "   🔧 Direct Frontend: ${PRODUCTION_URL}:8080"
        echo "   📊 API Health: ${PRODUCTION_URL}/api/recommendations/health"
        
        # Test connectivity
        echo ""
        print_subheader "Connectivity Test:"
        if curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL" | grep -q "200"; then
            print_success "Frontend accessible on port 80"
        else
            print_error "Frontend not accessible on port 80"
        fi
        
        if curl -s -o /dev/null -w "%{http_code}" "${PRODUCTION_URL}:8080" | grep -q "200"; then
            print_success "Frontend accessible on port 8080"
        else
            print_error "Frontend not accessible on port 8080"
        fi
        
    else
        print_warning "Production containers are not running"
        echo "   Expected: 2 containers, Found: $container_count"
        echo ""
        print_info "Use './manage-production.sh start' to start the environment"
    fi
}

# Function to start production environment
start_production() {
    print_header "Starting Production Environment"
    echo ""
    
    if [ "$(check_status)" -eq 2 ]; then
        print_warning "Production environment is already running"
        show_status
        return
    fi
    
    print_info "Starting containers..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for containers to be ready
    print_info "Waiting for containers to be ready..."
    sleep 5
    
    # Check if containers started successfully
    if [ "$(check_status)" -eq 2 ]; then
        print_success "Production environment started successfully!"
        echo ""
        show_status
    else
        print_error "Failed to start production environment"
        echo ""
        print_info "Checking container logs..."
        docker-compose -f "$COMPOSE_FILE" logs --tail=20
        exit 1
    fi
}

# Function to stop production environment
stop_production() {
    print_header "Stopping Production Environment"
    echo ""
    
    if [ "$(check_status)" -eq 0 ]; then
        print_warning "Production environment is not running"
        return
    fi
    
    print_info "Stopping containers..."
    docker-compose -f "$COMPOSE_FILE" down
    
    print_success "Production environment stopped"
}

# Function to restart production environment
restart_production() {
    print_header "Restarting Production Environment"
    echo ""
    
    stop_production
    echo ""
    start_production
}

# Function to show logs
show_logs() {
    local service="$1"
    local lines="${2:-50}"
    
    if [ -z "$service" ]; then
        print_header "Production Environment Logs"
        echo ""
        print_subheader "Nginx Proxy Logs (last $lines lines):"
        docker logs --tail="$lines" "$PROXY_SERVICE" 2>/dev/null || print_error "Could not fetch proxy logs"
        echo ""
        print_subheader "Frontend Logs (last $lines lines):"
        docker logs --tail="$lines" "$FRONTEND_SERVICE" 2>/dev/null || print_error "Could not fetch frontend logs"
    else
        case $service in
            "proxy"|"nginx")
                print_header "Nginx Proxy Logs (last $lines lines)"
                docker logs --tail="$lines" "$PROXY_SERVICE" 2>/dev/null || print_error "Could not fetch proxy logs"
                ;;
            "frontend"|"app")
                print_header "Frontend Logs (last $lines lines)"
                docker logs --tail="$lines" "$FRONTEND_SERVICE" 2>/dev/null || print_error "Could not fetch frontend logs"
                ;;
            *)
                print_error "Unknown service: $service"
                print_info "Available services: proxy, frontend"
                exit 1
                ;;
        esac
    fi
}

# Function to rebuild and deploy
rebuild_deploy() {
    print_header "Rebuilding and Deploying Production Environment"
    echo ""
    
    print_info "Stopping current environment..."
    docker-compose -f "$COMPOSE_FILE" down
    
    print_info "Building new frontend image..."
    docker build --build-arg BUILD_ENV=prod:80 -t algodiscovery-frontend .
    
    print_info "Starting production environment..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for containers to be ready
    print_info "Waiting for containers to be ready..."
    sleep 5
    
    if [ "$(check_status)" -eq 2 ]; then
        print_success "Rebuild and deployment completed successfully!"
        echo ""
        show_status
    else
        print_error "Rebuild and deployment failed"
        exit 1
    fi
}

# Function to run tests
run_tests() {
    print_header "Running Production Tests"
    echo ""
    
    if [ ! -f "./test-production-setup.sh" ]; then
        print_error "Test script not found: test-production-setup.sh"
        exit 1
    fi
    
    if [ ! -x "./test-production-setup.sh" ]; then
        print_info "Making test script executable..."
        chmod +x ./test-production-setup.sh
    fi
    
    ./test-production-setup.sh
}

# Function to show help
show_help() {
    print_header "AlgoDiscovery Production Environment Manager"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    print_subheader "Commands:"
    echo "  start           Start the production environment"
    echo "  stop            Stop the production environment"
    echo "  restart         Restart the production environment"
    echo "  status          Show current status and health"
    echo "  logs [SERVICE]  Show container logs"
    echo "  rebuild         Rebuild and redeploy the environment"
    echo "  test            Run production tests"
    echo "  help            Show this help message"
    echo ""
    print_subheader "Options:"
    echo "  SERVICE         For logs command: proxy, frontend (default: both)"
    echo "  -l, --lines N   Number of log lines to show (default: 50)"
    echo ""
    print_subheader "Examples:"
    echo "  $0 start                    # Start production environment"
    echo "  $0 status                   # Check status"
    echo "  $0 logs proxy               # Show proxy logs"
    echo "  $0 logs frontend -l 100    # Show frontend logs (100 lines)"
    echo "  $0 rebuild                  # Rebuild and redeploy"
    echo "  $0 test                     # Run production tests"
    echo ""
    print_subheader "Service URLs:"
    echo "  🌐 Production: $PRODUCTION_URL"
    echo "  🔧 Direct: ${PRODUCTION_URL}:8080"
    echo ""
}

# Main script logic
case "${1:-status}" in
    "start")
        start_production
        ;;
    "stop")
        stop_production
        ;;
    "restart")
        restart_production
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2" "$3"
        ;;
    "rebuild")
        rebuild_deploy
        ;;
    "test")
        run_tests
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
