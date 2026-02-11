#!/bin/bash

# =============================================================================
# Long-Term Investment Platform - Service Manager
# =============================================================================
# 
# Native shell script for complete service management:
# - Direct service control (no Python dependency)
# - PID storage and tracking in JSON format
# - Service health monitoring
# - Individual and bulk service operations
# - Process cleanup and management
#
# Usage:
#   ./demo_service_manager.sh [command] [service]
#
# Commands:
#   start [service]     - Start service(s)
#   stop [service]      - Stop service(s)  
#   restart [service]   - Restart service(s)
#   status              - Show service status
#   list                - List available services
#   monitor             - Monitor service health
#   demo                - Interactive demonstration
#   usage               - Show detailed help
# =============================================================================

# Colors for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PID_FILE=".service_pids.json"
LOG_DIR="logs"
DATE_FORMAT=$(date +%Y-%m-%d)

# Service definitions (using compatible arrays)
SERVICES="main:python main_server.py,longterm:python longterm_server.py,analytics:python analytics_server.py,order:python order_server.py"
SERVICE_PORTS="main:8000,longterm:8001,analytics:8002,order:8003"
SERVICE_NAMES="main:Main Orchestrator,longterm:Long-Term Investment Service,analytics:Analytics & Backtesting Service,order:Order Management Service"

# Enhanced logging functions
setup_logging() {
    # Create log directory structure
    mkdir -p "$LOG_DIR/daily"
    mkdir -p "$LOG_DIR/archive"
    
    # Create today's log directory if it doesn't exist
    mkdir -p "$LOG_DIR/daily/$DATE_FORMAT"
    
    # Archive old logs (older than 7 days)
    find "$LOG_DIR/daily" -type d -name "20*" -mtime +7 -exec mv {} "$LOG_DIR/archive/" \; 2>/dev/null || true
}

get_log_file() {
    local service="$1"
    echo "$LOG_DIR/daily/$DATE_FORMAT/${service}_service.log"
}

get_error_log_file() {
    local service="$1"
    echo "$LOG_DIR/daily/$DATE_FORMAT/${service}_error.log"
}

log_service_event() {
    local service="$1"
    local event="$2"
    local log_file=$(get_log_file "$service")
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $event" >> "$log_file"
}

rotate_logs_if_needed() {
    # If it's a new day, create new log directory
    local current_date=$(date +%Y-%m-%d)
    if [ "$current_date" != "$DATE_FORMAT" ]; then
        DATE_FORMAT="$current_date"
        setup_logging
    fi
}

# Helper functions for service data
get_service_command() {
    local service="$1"
    echo "$SERVICES" | tr ',' '\n' | grep "^$service:" | cut -d: -f2-
}

get_service_port() {
    local service="$1"
    echo "$SERVICE_PORTS" | tr ',' '\n' | grep "^$service:" | cut -d: -f2
}

get_service_name() {
    local service="$1"
    echo "$SERVICE_NAMES" | tr ',' '\n' | grep "^$service:" | cut -d: -f2-
}

get_all_services() {
    echo "main longterm analytics order"
}

# Utility functions
print_header() {
    echo -e "\n${BLUE}==============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==============================================================================${NC}\n"
}

print_step() {
    echo -e "\n${CYAN}>>> $1${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

# JSON helper functions (simple JSON handling without jq dependency)
create_empty_pid_file() {
    echo "{}" > "$PID_FILE"
}

load_pid() {
    local service="$1"
    if [ ! -f "$PID_FILE" ]; then
        create_empty_pid_file
        echo ""
        return
    fi
    
    # Extract PID using grep and sed (avoiding jq dependency)
    grep "\"$service\"" "$PID_FILE" | sed 's/.*: *\([0-9]*\).*/\1/' | head -1
}

save_pid() {
    local service="$1"
    local pid="$2"
    
    if [ ! -f "$PID_FILE" ]; then
        create_empty_pid_file
    fi
    
    # Simple JSON update - read existing, update, write back
    local temp_file=$(mktemp)
    
    # Start with opening brace
    echo "{" > "$temp_file"
    
    # Add existing entries (except the one we're updating)
    if [ -s "$PID_FILE" ]; then
        grep -v "\"$service\"" "$PID_FILE" | grep ":" | sed 's/^[[:space:]]*/  /' >> "$temp_file"
    fi
    
    # Add the new entry
    echo "  \"$service\": $pid" >> "$temp_file"
    
    # Close with brace
    echo "}" >> "$temp_file"
    
    # Clean up formatting (remove trailing commas before closing brace)
    sed -i '' 's/,$//' "$temp_file" 2>/dev/null || sed -i 's/,$//' "$temp_file" 2>/dev/null
    
    mv "$temp_file" "$PID_FILE"
}

remove_pid() {
    local service="$1"
    
    if [ ! -f "$PID_FILE" ]; then
        return
    fi
    
    local temp_file=$(mktemp)
    
    # Start with opening brace
    echo "{" > "$temp_file"
    
    # Add all entries except the one we're removing
    grep -v "\"$service\"" "$PID_FILE" | grep ":" | sed 's/^[[:space:]]*/  /' >> "$temp_file"
    
    # Close with brace
    echo "}" >> "$temp_file"
    
    # Clean up formatting
    sed -i '' 's/,$//' "$temp_file" 2>/dev/null || sed -i 's/,$//' "$temp_file" 2>/dev/null
    
    mv "$temp_file" "$PID_FILE"
    
    # Clean up empty JSON
    if ! grep -q ":" "$PID_FILE"; then
        echo "{}" > "$PID_FILE"
    fi
}

# Process management functions
is_process_running() {
    local pid="$1"
    if [ -z "$pid" ]; then
        return 1
    fi
    
    kill -0 "$pid" 2>/dev/null
}

is_port_in_use() {
    local port="$1"
    lsof -ti:$port >/dev/null 2>&1
}

kill_process() {
    local pid="$1"
    local service="$2"
    
    if is_process_running "$pid"; then
        print_info "Stopping $service (PID: $pid)..."
        kill "$pid" 2>/dev/null
        
        # Wait up to 10 seconds for graceful shutdown
        local count=0
        while [ $count -lt 10 ] && is_process_running "$pid"; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if is_process_running "$pid"; then
            print_warning "Force killing $service (PID: $pid)"
            kill -9 "$pid" 2>/dev/null
        fi
        
        print_success "$service stopped"
        return 0
    else
        print_warning "$service (PID: $pid) was not running"
        return 1
    fi
}

# Service management functions
start_service() {
    local service="$1"
    
    # Setup logging for the day
    rotate_logs_if_needed
    setup_logging
    
    # Handle "all" option
    if [ "$service" = "all" ]; then
        echo ""
        echo "=============================================================================="
        echo "Starting All Services"
        echo "=============================================================================="
        echo ""
        
        local all_services=("main" "longterm" "analytics" "order")
        local started_count=0
        
        for svc in "${all_services[@]}"; do
            start_service "$svc"
            if [ $? -eq 0 ]; then
                ((started_count++))
            fi
            echo ""
        done
        
        echo "=============================================================================="
        echo "✅ Started $started_count out of ${#all_services[@]} services"
        echo "=============================================================================="
        return 0
    fi
    
    local command=$(get_service_command "$service")
    
    if [ -z "$command" ]; then
        print_error "Unknown service: $service"
        list_services
        return 1
    fi
    
    local service_name=$(get_service_name "$service")
    local port=$(get_service_port "$service")
    local existing_pid=$(load_pid "$service")
    
    # Check if already running
    if [ -n "$existing_pid" ] && is_process_running "$existing_pid"; then
        print_warning "$service_name is already running (PID: $existing_pid)"
        return 0
    fi
    
    # Clean up stale PID if exists
    if [ -n "$existing_pid" ]; then
        remove_pid "$service"
    fi
    
    # Check if port is in use
    if [ -n "$port" ] && is_port_in_use "$port"; then
        print_error "Port $port is already in use. Please check for conflicting services."
        return 1
    fi
    
    print_info "Starting $service_name on port $port..."
    
    # Get log files for this service
    local log_file=$(get_log_file "$service")
    local error_log_file=$(get_error_log_file "$service")
    
    # Log the startup event
    log_service_event "$service" "STARTUP: Starting $service_name on port $port"
    
    # Start service and capture PID with separated stdout/stderr logging
    nohup bash -c "$command" > "$log_file" 2> "$error_log_file" &
    local pid=$!
    
    # Log the PID
    log_service_event "$service" "PROCESS: Started with PID $pid"
    
    # Wait for service to start
    sleep 2
    
    # Verify the service started successfully
    if is_process_running "$pid"; then
        save_pid "$service" "$pid"
        log_service_event "$service" "SUCCESS: Service started successfully and is healthy"
        print_success "$service_name started successfully (PID: $pid)"
        print_info "📝 Logs: $(get_log_file "$service")"
        print_info "🚨 Errors: $(get_error_log_file "$service")"
        
        # Wait a bit more and check health if possible
        sleep 1
        local health_status=$(check_service_health "$service" 2>/dev/null)
        if [ "$health_status" = "Healthy" ]; then
            log_service_event "$service" "HEALTH: Service is healthy and responding"
            print_success "$service_name is healthy and ready"
        fi
        return 0
    else
        log_service_event "$service" "ERROR: Service failed to start"
        print_error "Failed to start $service_name"
        echo "Recent log output:"
        tail -10 "$log_file" 2>/dev/null || echo "No log output available"
        echo "Recent error output:"
        tail -10 "$error_log_file" 2>/dev/null || echo "No error output available"
        return 1
    fi
}

stop_service() {
    local service="$1"
    
    # Setup logging for the day
    rotate_logs_if_needed
    setup_logging
    
    # Handle "all" option
    if [ "$service" = "all" ]; then
        echo ""
        echo "=============================================================================="
        echo "Stopping All Services"
        echo "=============================================================================="
        echo ""
        
        local all_services=("order" "analytics" "longterm" "main")  # Stop in reverse order
        local stopped_count=0
        
        for svc in "${all_services[@]}"; do
            stop_service "$svc"
            if [ $? -eq 0 ]; then
                ((stopped_count++))
            fi
            echo ""
        done
        
        echo "=============================================================================="
        echo "✅ Stopped $stopped_count services"
        echo "=============================================================================="
        return 0
    fi
    
    local service_name=$(get_service_name "$service")
    if [ -z "$service_name" ]; then
        print_error "Unknown service: $service"
        list_services
        return 1
    fi
    
    local pid=$(load_pid "$service")
    
    if [ -z "$pid" ]; then
        print_warning "$service_name is not running (no PID found)"
        return 0
    fi
    
    if ! is_process_running "$pid"; then
        print_warning "$service_name is not running (PID $pid not found)"
        log_service_event "$service" "CLEANUP: Removed stale PID $pid"
        remove_pid "$service"
        return 0
    fi
    
    print_info "Stopping $service_name (PID: $pid)..."
    log_service_event "$service" "SHUTDOWN: Initiating graceful shutdown for PID $pid"
    
    # Try graceful shutdown first
    kill -TERM "$pid" 2>/dev/null
    
    # Wait for graceful shutdown
    local count=0
    while [ $count -lt 10 ] && is_process_running "$pid"; do
        sleep 1
        ((count++))
    done
    
    # Force kill if still running
    if is_process_running "$pid"; then
        print_warning "Forcing shutdown of $service_name..."
        log_service_event "$service" "FORCE_KILL: Forcing shutdown after graceful timeout"
        kill -KILL "$pid" 2>/dev/null
        sleep 1
    fi
    
    # Verify it's stopped
    if ! is_process_running "$pid"; then
        remove_pid "$service"
        log_service_event "$service" "STOPPED: Service stopped successfully"
        print_success "$service_name stopped"
        return 0
    else
        log_service_event "$service" "ERROR: Failed to stop service"
        print_error "Failed to stop $service_name"
        return 1
    fi
}

restart_service() {
    local service="$1"
    local service_name=$(get_service_name "$service")
    
    print_info "Restarting $service_name..."
    stop_service "$service"
    sleep 2
    start_service "$service"
}

start_all_services() {
    print_header "Starting Long-Term Investment Platform Services"
    
    local services_order="longterm analytics order main"
    local started_count=0
    local total_count=0
    
    for service in $services_order; do
        total_count=$((total_count + 1))
        if start_service "$service"; then
            started_count=$((started_count + 1))
        fi
        sleep 1
    done
    
    echo -e "\n${GREEN}Started $started_count out of $total_count services${NC}"
    show_status
}

stop_all_services() {
    print_header "Stopping All Services"
    
    local stopped_count=0
    for service in $(get_all_services); do
        if stop_service "$service"; then
            stopped_count=$((stopped_count + 1))
        fi
    done
    
    # Clean up PID file
    create_empty_pid_file
    print_success "Stopped $stopped_count services"
}

show_status() {
    print_header "Service Status Check"
    printf "%-35s | %-10s | %-10s | %-10s | %s\n" "Service" "Port" "PID" "Status" "Health"
    echo "================================================================================"
    
    for service in $(get_all_services); do
        local service_name=$(get_service_name "$service")
        local port=$(get_service_port "$service")
        local pid=$(load_pid "$service")
        local status="STOPPED"
        local health="Not running"
        local status_icon="🔴"
        
        if [ -n "$pid" ] && is_process_running "$pid"; then
            status="RUNNING"
            status_icon="🟢"
            
            # Check health by testing port
            if is_port_in_use "$port"; then
                health="Healthy"
            else
                health="Unhealthy"
                status_icon="🟡"
            fi
        elif [ -n "$pid" ]; then
            health="Stale PID"
            status_icon="🟡"
            # Clean up stale PID
            remove_pid "$service"
            pid=""
        fi
        
        local pid_display="${pid:-No PID}"
        printf "%s %-30s | Port %-4s | %-10s | %-10s | %s\n" "$status_icon" "$service_name" "$port" "$pid_display" "$status" "$health"
    done
    
    echo "================================================================================"
}

list_services() {
    print_header "Available Services"
    
    echo -e "${CYAN}Service List:${NC}"
    for service in $(get_all_services); do
        local service_name=$(get_service_name "$service")
        local port=$(get_service_port "$service")
        local command=$(get_service_command "$service")
        echo "  • $service: $service_name (Port $port)"
        echo "    Command: $command"
        echo ""
    done
}

monitor_services() {
    print_header "Service Health Monitor"
    print_info "Monitoring services... Press Ctrl+C to stop"
    
    while true; do
        clear
        show_status
        echo -e "\n${YELLOW}Last updated: $(date)${NC}"
        echo -e "${YELLOW}Refreshing in 5 seconds... Press Ctrl+C to stop${NC}"
        sleep 5
    done
}

# Demo function
demo_service_manager() {
    print_header "Long-Term Investment Platform - Service Manager Demo"
    
    print_info "This demo showcases native shell service management:"
    print_info "• Direct process control (no Python dependencies)"
    print_info "• JSON PID storage and tracking"
    print_info "• Service health monitoring"
    print_info "• Individual and bulk operations"
    
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read -r
    
    # Demo steps
    print_step "Step 1: List available services"
    list_services
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read -r
    
    print_step "Step 2: Check initial status"
    show_status
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read -r
    
    print_step "Step 3: Start Long-Term Investment Service"
    start_service "longterm"
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read -r
    
    print_step "Step 4: Check status after starting one service"
    show_status
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read -r
    
    print_step "Step 5: Start Analytics Service"
    start_service "analytics"
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read -r
    
    print_step "Step 6: Restart Long-Term Service"
    restart_service "longterm"
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read -r
    
    print_step "Step 7: Start all remaining services"
    start_service "order"
    start_service "main"
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read -r
    
    print_step "Step 8: Final status check"
    show_status
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read -r
    
    print_step "Step 9: Stop all services"
    stop_all_services
    
    print_header "Demo Complete!"
    print_success "You've successfully tested the native shell service manager!"
}

show_help() {
    cat << 'EOF'
🚀 Long-Term Investment Platform - Service Manager

USAGE:
    ./demo_service_manager.sh <command> [service] [options]

COMMANDS:
    start <service>         Start a specific service
    stop <service>          Stop a specific service  
    restart <service>       Restart a specific service
    status                  Show status of all services
    list                    List all available services
    monitor                 Monitor services in real-time
    show_logs <service>     Show logs for a specific service
    show_all_logs          Show summary of all service logs
    demo                   Run interactive demonstration
    usage                  Show detailed usage examples

SERVICES:
    main                   Main Orchestrator (port 8000)
    longterm              Long-Term Investment Service (port 8001)
    analytics             Analytics & Backtesting Service (port 8002)
    order                 Order Management Service (port 8003)
    all                   All services (for start/stop/restart commands)

LOGGING:
    • Logs are automatically partitioned by day
    • Each service has separate stdout and stderr logs
    • Log directory: logs/daily/YYYY-MM-DD/
    • Logs rotate automatically at midnight

EXAMPLES:
    ./demo_service_manager.sh start main
    ./demo_service_manager.sh stop all
    ./demo_service_manager.sh restart longterm
    ./demo_service_manager.sh status
    ./demo_service_manager.sh show_logs analytics 100
    ./demo_service_manager.sh monitor

For detailed examples, run: ./demo_service_manager.sh usage
EOF
}

show_usage() {
    print_header "Service Manager Usage Examples"
    
    echo -e "${GREEN}🚀 Starting Services:${NC}"
    echo "  ./demo_service_manager.sh start main              # Start main orchestrator"
    echo "  ./demo_service_manager.sh start longterm          # Start long-term service"
    echo "  ./demo_service_manager.sh start all               # Start all services"
    echo ""
    
    echo -e "${RED}🛑 Stopping Services:${NC}"
    echo "  ./demo_service_manager.sh stop longterm           # Stop long-term service"
    echo "  ./demo_service_manager.sh stop all                # Stop all services"
    echo ""
    
    echo -e "${BLUE}🔄 Restarting Services:${NC}"
    echo "  ./demo_service_manager.sh restart analytics       # Restart analytics service"
    echo "  ./demo_service_manager.sh restart all             # Restart all services"
    echo ""
    
    echo -e "${CYAN}📊 Monitoring & Status:${NC}"
    echo "  ./demo_service_manager.sh status                  # Check all service status"
    echo "  ./demo_service_manager.sh list                    # List available services"
    echo "  ./demo_service_manager.sh monitor                 # Real-time monitoring"
    echo ""
    
    echo -e "${YELLOW}📝 Log Management:${NC}"
    echo "  ./demo_service_manager.sh show_logs main          # Show main service logs (last 50 lines)"
    echo "  ./demo_service_manager.sh show_logs analytics 100 # Show analytics logs (last 100 lines)"
    echo "  ./demo_service_manager.sh show_all_logs           # Show summary of all service logs"
    echo "  ./demo_service_manager.sh show_all_logs 30        # Show last 30 lines from each service"
    echo ""
    
    echo -e "${PURPLE}🎯 Common Workflows:${NC}"
    echo "  # Full startup sequence"
    echo "  ./demo_service_manager.sh start all && ./demo_service_manager.sh status"
    echo ""
    echo "  # Restart problematic service and check logs"
    echo "  ./demo_service_manager.sh restart longterm"
    echo "  ./demo_service_manager.sh show_logs longterm"
    echo ""
    echo "  # Monitor system health"
    echo "  ./demo_service_manager.sh status && ./demo_service_manager.sh show_all_logs 10"
    echo ""
    
    echo -e "${GREEN}💡 Tips:${NC}"
    echo "  • Services start automatically with health checks"
    echo "  • PIDs are stored in .service_pids.json"
    echo "  • Logs are in logs/daily/YYYY-MM-DD/ directory"
    echo "  • Use 'monitor' for real-time status updates"
    echo "  • All commands support graceful shutdown with fallback to force kill"
}

show_logs() {
    local service="$1"
    local lines="${2:-50}"
    
    if [ -z "$service" ]; then
        print_error "Usage: show_logs <service> [lines]"
        return 1
    fi
    
    local service_name=$(get_service_name "$service")
    if [ -z "$service_name" ]; then
        print_error "Unknown service: $service"
        list_services
        return 1
    fi
    
    local log_file=$(get_log_file "$service")
    local error_log_file=$(get_error_log_file "$service")
    
    print_header "Service Logs: $service_name"
    
    echo -e "${CYAN}📝 Service Log (last $lines lines):${NC} $log_file"
    echo "================================================================================"
    if [ -f "$log_file" ]; then
        tail -n "$lines" "$log_file"
    else
        echo "No service log file found."
    fi
    
    echo ""
    echo -e "${CYAN}🚨 Error Log (last $lines lines):${NC} $error_log_file"
    echo "================================================================================"
    if [ -f "$error_log_file" ]; then
        tail -n "$lines" "$error_log_file"
    else
        echo "No error log file found."
    fi
    
    echo ""
    echo -e "${YELLOW}📁 Log Directory:${NC} $LOG_DIR/daily/$DATE_FORMAT"
    echo -e "${YELLOW}📅 Available Dates:${NC}"
    ls -1 "$LOG_DIR/daily/" 2>/dev/null | grep -E "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" | tail -5 || echo "No log dates found"
}

show_all_logs() {
    local lines="${1:-20}"
    
    print_header "All Service Logs Summary"
    
    for service in $(get_all_services); do
        local service_name=$(get_service_name "$service")
        local log_file=$(get_log_file "$service")
        
        echo -e "\n${BLUE}━━━ $service_name ━━━${NC}"
        echo -e "${CYAN}📝 Log:${NC} $log_file"
        
        if [ -f "$log_file" ]; then
            echo "Last $lines lines:"
            tail -n "$lines" "$log_file" | sed 's/^/  /'
        else
            echo "  No log file found."
        fi
    done
}

# Main function
main() {
    local command="${1:-help}"
    local service="${2:-}"
    local lines="${3:-50}"
    
    # Handle special cases where service might be a number (for show_all_logs)
    if [[ "$command" == "show_all_logs" && "$service" =~ ^[0-9]+$ ]]; then
        lines="$service"
        service=""
    fi
    
    case "$command" in
        "start")
            if [ -z "$service" ]; then
                service="all"
            fi
            start_service "$service"
            ;;
        "stop")
            if [ -z "$service" ]; then
                service="all"
            fi
            stop_service "$service"
            ;;
        "restart")
            if [ -z "$service" ]; then
                service="all"
            fi
            restart_service "$service"
            ;;
        "status")
            show_status
            ;;
        "list")
            list_services
            ;;
        "monitor")
            monitor_services
            ;;
        "demo")
            run_demo
            ;;
        "usage"|"help"|"-h"|"--help")
            if [ "$command" = "usage" ]; then
                show_usage
            else
                show_help
            fi
            ;;
        "show_logs")
            if [ -z "$service" ]; then
                print_error "Service name required for show_logs command"
                echo "Usage: ./demo_service_manager.sh show_logs <service> [lines]"
                echo ""
                list_services
                exit 1
            fi
            show_logs "$service" "$lines"
            ;;
        "show_all_logs")
            show_all_logs "$lines"
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            echo "Available commands: start, stop, restart, status, list, monitor, demo, usage, show_logs, show_all_logs"
            echo "Use './demo_service_manager.sh help' for detailed help"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 