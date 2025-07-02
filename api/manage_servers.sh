#!/bin/bash

# Algorithm Discovery Server Manager
# ===================================
# Central management script for all recommendation servers
# Usage: ./manage_servers.sh [start|stop|restart|status|health|logs|monitor]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/server.env"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}Loading configuration from $ENV_FILE${NC}"
    set -a  # automatically export all variables
    source "$ENV_FILE"
    set +a  # stop auto-export
else
    echo -e "${RED}Error: Environment file $ENV_FILE not found!${NC}"
    exit 1
fi

# Set defaults if not in env file
PID_DIR=${PID_DIR:-"./pids"}
LOG_DIR=${LOG_DIR:-"./logs"}
HOST=${HOST:-"localhost"}
SWING_PORT=${SWING_PORT:-8002}
SHORTTERM_PORT=${SHORTTERM_PORT:-8003}
LONGTERM_PORT=${LONGTERM_PORT:-8001}

# Create necessary directories
mkdir -p "$PID_DIR" "$LOG_DIR"

# Server definitions (name:script:port:description)
SERVERS="swing:swing_server.py:$SWING_PORT:Swing Trading Server
shortterm:shortterm_server.py:$SHORTTERM_PORT:Short-term Trading Server
longterm:longterm_server.py:$LONGTERM_PORT:Long-term Investment Server"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}$message${NC}"
}

# Function to print header
print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE} Algorithm Discovery Server Manager${NC}"
    echo -e "${PURPLE}================================${NC}"
    echo ""
}

# Function to get server info
get_server_info() {
    local server_name=$1
    echo "$SERVERS" | grep "^$server_name:" | head -1
}

# Function to check if a port is in use
is_port_in_use() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        lsof -i ":$port" >/dev/null 2>&1
    elif command -v netstat >/dev/null 2>&1; then
        netstat -ln | grep ":$port " >/dev/null 2>&1
    else
        # Fallback: try to connect to the port
        timeout 1 bash -c "cat < /dev/null > /dev/tcp/$HOST/$port" 2>/dev/null
    fi
}

# Function to get PID from file
get_pid() {
    local server_name=$1
    local pid_file="$PID_DIR/${server_name}.pid"
    
    if [ -f "$pid_file" ]; then
        cat "$pid_file"
    else
        echo ""
    fi
}

# Function to check if process is running
is_process_running() {
    local pid=$1
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to start a server
start_server() {
    local server_name=$1
    local server_info=$(get_server_info "$server_name")
    
    if [ -z "$server_info" ]; then
        print_status $RED "Error: Unknown server '$server_name'"
        return 1
    fi
    
    local script_name=$(echo "$server_info" | cut -d':' -f2)
    local port=$(echo "$server_info" | cut -d':' -f3)
    local description=$(echo "$server_info" | cut -d':' -f4)
    
    local pid_file="$PID_DIR/${server_name}.pid"
    local log_file="$LOG_DIR/${server_name}.log"
    
    # Check if already running
    local existing_pid=$(get_pid "$server_name")
    if is_process_running "$existing_pid"; then
        print_status $YELLOW "$description is already running (PID: $existing_pid)"
        return 0
    fi
    
    # Check if port is in use
    if is_port_in_use "$port"; then
        print_status $RED "Error: Port $port is already in use by another process"
        return 1
    fi
    
    # Start the server
    print_status $BLUE "Starting $description on port $port..."
    
    cd "$SCRIPT_DIR"
    nohup python3 "$script_name" > "$log_file" 2>&1 &
    local new_pid=$!
    
    # Save PID
    echo "$new_pid" > "$pid_file"
    
    # Wait a moment and check if it started successfully
    sleep 2
    if is_process_running "$new_pid"; then
        print_status $GREEN "✓ $description started successfully (PID: $new_pid)"
        print_status $CYAN "  Log file: $log_file"
        print_status $CYAN "  Health check: curl http://$HOST:$port/health"
    else
        print_status $RED "✗ Failed to start $description"
        [ -f "$pid_file" ] && rm "$pid_file"
        return 1
    fi
}

# Function to stop a server
stop_server() {
    local server_name=$1
    local server_info=$(get_server_info "$server_name")
    
    if [ -z "$server_info" ]; then
        print_status $RED "Error: Unknown server '$server_name'"
        return 1
    fi
    
    local script_name=$(echo "$server_info" | cut -d':' -f2)
    local port=$(echo "$server_info" | cut -d':' -f3)
    local description=$(echo "$server_info" | cut -d':' -f4)
    
    local pid_file="$PID_DIR/${server_name}.pid"
    local pid=$(get_pid "$server_name")
    
    if [ -z "$pid" ] || ! is_process_running "$pid"; then
        print_status $YELLOW "$description is not running"
        [ -f "$pid_file" ] && rm "$pid_file"
        return 0
    fi
    
    print_status $BLUE "Stopping $description (PID: $pid)..."
    
    # Try graceful shutdown first
    kill "$pid" 2>/dev/null || true
    
    # Wait up to 10 seconds for graceful shutdown
    local count=0
    while [ $count -lt 10 ] && is_process_running "$pid"; do
        sleep 1
        count=$((count + 1))
    done
    
    # Force kill if still running
    if is_process_running "$pid"; then
        print_status $YELLOW "Force killing $description..."
        kill -9 "$pid" 2>/dev/null || true
        sleep 1
    fi
    
    if is_process_running "$pid"; then
        print_status $RED "✗ Failed to stop $description"
        return 1
    else
        print_status $GREEN "✓ $description stopped successfully"
        [ -f "$pid_file" ] && rm "$pid_file"
    fi
}

# Function to restart a server
restart_server() {
    local server_name=$1
    print_status $BLUE "Restarting $server_name server..."
    stop_server "$server_name"
    sleep 2
    start_server "$server_name"
}

# Function to show server status
show_status() {
    local server_name=$1
    local server_info=$(get_server_info "$server_name")
    
    local script_name=$(echo "$server_info" | cut -d':' -f2)
    local port=$(echo "$server_info" | cut -d':' -f3)
    local description=$(echo "$server_info" | cut -d':' -f4)
    
    local pid=$(get_pid "$server_name")
    
    printf "%-25s " "$description:"
    
    if [ -n "$pid" ] && is_process_running "$pid"; then
        printf "${GREEN}RUNNING${NC} (PID: %s, Port: %s)" "$pid" "$port"
        
        # Check if port is responding
        if command -v curl >/dev/null 2>&1; then
            if curl -s "http://$HOST:$port/health" >/dev/null 2>&1; then
                printf " ${GREEN}[HEALTHY]${NC}"
            else
                printf " ${YELLOW}[NO RESPONSE]${NC}"
            fi
        fi
    else
        printf "${RED}STOPPED${NC} (Port: %s)" "$port"
        [ -f "$PID_DIR/${server_name}.pid" ] && rm "$PID_DIR/${server_name}.pid"
    fi
    
    echo ""
}

# Function to check health of all servers
check_health() {
    print_status $BLUE "Checking server health..."
    echo ""
    
    local all_healthy=true
    
    echo "$SERVERS" | while IFS=':' read -r server_name script_name port description; do
        printf "%-25s " "$description:"
        
        if command -v curl >/dev/null 2>&1; then
            local response=$(curl -s -w "%{http_code}" "http://$HOST:$port/health" 2>/dev/null)
            local http_code="${response: -3}"
            
            if [ "$http_code" = "200" ]; then
                print_status $GREEN "HEALTHY ✓"
            else
                print_status $RED "UNHEALTHY ✗ (HTTP: $http_code)"
                all_healthy=false
            fi
        else
            if is_port_in_use "$port"; then
                print_status $YELLOW "UNKNOWN (curl not available)"
            else
                print_status $RED "NOT RESPONDING ✗"
                all_healthy=false
            fi
        fi
    done
    
    echo ""
    if [ "$all_healthy" = true ]; then
        print_status $GREEN "All servers are healthy! 🎉"
    else
        print_status $RED "Some servers need attention! ⚠️"
    fi
}

# Function to show logs
show_logs() {
    local server_name=$1
    local lines=${2:-50}
    
    if [ -z "$server_name" ]; then
        print_status $BLUE "Available log files:"
        echo "$SERVERS" | while IFS=':' read -r name script_name port description; do
            local log_file="$LOG_DIR/${name}.log"
            if [ -f "$log_file" ]; then
                echo "  $name: $log_file"
            fi
        done
        echo ""
        echo "Usage: $0 logs <server_name> [lines]"
        return 0
    fi
    
    local log_file="$LOG_DIR/${server_name}.log"
    
    if [ ! -f "$log_file" ]; then
        print_status $RED "Log file not found: $log_file"
        return 1
    fi
    
    print_status $BLUE "Showing last $lines lines of $server_name log:"
    echo ""
    tail -n "$lines" "$log_file"
}

# Function to monitor servers (real-time status)
monitor_servers() {
    print_status $BLUE "Monitoring servers (Press Ctrl+C to exit)..."
    echo ""
    
    while true; do
        clear
        print_header
        echo "Last updated: $(date)"
        echo ""
        
        echo "$SERVERS" | while IFS=':' read -r server_name script_name port description; do
            show_status "$server_name"
        done
        
        echo ""
        print_status $CYAN "Press Ctrl+C to exit monitoring"
        sleep 5
    done
}

# Function to show help
show_help() {
    print_header
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start [server]    Start server(s) [swing|shortterm|longterm|all]"
    echo "  stop [server]     Stop server(s) [swing|shortterm|longterm|all]"
    echo "  restart [server]  Restart server(s) [swing|shortterm|longterm|all]"
    echo "  status            Show status of all servers"
    echo "  health            Check health of all servers"
    echo "  logs [server] [lines]  Show logs for server"
    echo "  monitor           Real-time monitoring of all servers"
    echo "  clean             Clean up PID files and old logs"
    echo "  help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start all              # Start all servers"
    echo "  $0 start swing            # Start only swing server"
    echo "  $0 restart shortterm      # Restart short-term server"
    echo "  $0 logs longterm 100      # Show last 100 lines of long-term logs"
    echo "  $0 status                 # Show status of all servers"
    echo ""
    echo "Configuration:"
    echo "  Environment file: $ENV_FILE"
    echo "  PID directory: $PID_DIR"
    echo "  Log directory: $LOG_DIR"
    echo ""
}

# Function to clean up
cleanup() {
    print_status $BLUE "Cleaning up PID files and old logs..."
    
    # Remove stale PID files
    echo "$SERVERS" | while IFS=':' read -r server_name script_name port description; do
        local pid_file="$PID_DIR/${server_name}.pid"
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file")
            if ! is_process_running "$pid"; then
                print_status $YELLOW "Removing stale PID file: $pid_file"
                rm "$pid_file"
            fi
        fi
    done
    
    # Remove old log files (older than LOG_ROTATION_DAYS)
    if [ -n "$LOG_ROTATION_DAYS" ] && [ "$LOG_ROTATION_DAYS" -gt 0 ]; then
        find "$LOG_DIR" -name "*.log" -mtime +$LOG_ROTATION_DAYS -delete 2>/dev/null || true
    fi
    
    print_status $GREEN "Cleanup completed"
}

# Function to get all server names
get_all_servers() {
    echo "$SERVERS" | cut -d':' -f1
}

# Function to check if server exists
server_exists() {
    local server_name=$1
    echo "$SERVERS" | grep -q "^$server_name:"
}

# Main script logic
main() {
    local command=${1:-help}
    local target=${2:-all}
    
    case $command in
        start)
            print_header
            if [ "$target" = "all" ]; then
                echo "$SERVERS" | while IFS=':' read -r server_name script_name port description; do
                    start_server "$server_name"
                done
            elif server_exists "$target"; then
                start_server "$target"
            else
                print_status $RED "Error: Unknown server '$target'"
                echo "Available servers: $(get_all_servers | tr '\n' ' ')"
                exit 1
            fi
            ;;
        stop)
            print_header
            if [ "$target" = "all" ]; then
                echo "$SERVERS" | while IFS=':' read -r server_name script_name port description; do
                    stop_server "$server_name"
                done
            elif server_exists "$target"; then
                stop_server "$target"
            else
                print_status $RED "Error: Unknown server '$target'"
                echo "Available servers: $(get_all_servers | tr '\n' ' ')"
                exit 1
            fi
            ;;
        restart)
            print_header
            if [ "$target" = "all" ]; then
                echo "$SERVERS" | while IFS=':' read -r server_name script_name port description; do
                    restart_server "$server_name"
                done
            elif server_exists "$target"; then
                restart_server "$target"
            else
                print_status $RED "Error: Unknown server '$target'"
                echo "Available servers: $(get_all_servers | tr '\n' ' ')"
                exit 1
            fi
            ;;
        status)
            print_header
            echo "$SERVERS" | while IFS=':' read -r server_name script_name port description; do
                show_status "$server_name"
            done
            ;;
        health)
            print_header
            check_health
            ;;
        logs)
            show_logs "$target" "$3"
            ;;
        monitor)
            monitor_servers
            ;;
        clean)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_status $RED "Error: Unknown command '$command'"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Operation cancelled by user${NC}"; exit 0' INT

# Run main function
main "$@" 