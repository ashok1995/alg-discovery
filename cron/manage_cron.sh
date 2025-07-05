#!/bin/bash

# AlgoDiscovery Cron Job Management Script
# =======================================
# This script manages cron jobs for the AlgoDiscovery Trading System
# using the new organized environment structure.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Available cron types
CRON_TYPES=("swing_buy" "short_buy" "long_buy" "intraday_buy" "intraday_sell")

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[HEADER]${NC} $1"
}

# Function to load environment for a specific cron job
load_cron_env() {
    local cron_type="$1"
    local silent="${2:-false}"
    local env_file="$SCRIPT_DIR/env/${cron_type}.env"
    local fallback_env="$SCRIPT_DIR/env/env.cron"
    
    if [[ -f "$env_file" ]]; then
        [[ "$silent" != "true" ]] && print_status "Loading environment from $env_file"
        export CRON_TYPE="$cron_type"
        source "$env_file"
        return 0
    elif [[ -f "$fallback_env" ]]; then
        [[ "$silent" != "true" ]] && print_warning "Cron-specific environment not found, using fallback"
        export CRON_TYPE="$cron_type"
        source "$fallback_env"
        return 0
    else
        [[ "$silent" != "true" ]] && print_error "No environment file found for $cron_type"
        return 1
    fi
}

# Function to check if a cron job is enabled
is_cron_enabled() {
    local cron_type="$1"
    load_cron_env "$cron_type" "true" 2>/dev/null || return 1
    
    if [[ "${CRON_ENABLED:-true}" == "true" ]]; then
        return 0
    else
        return 1
    fi
}

# Function to get cron schedule
get_cron_schedule() {
    local cron_type="$1"
    # Load environment silently and return only the schedule
    if load_cron_env "$cron_type" "true" 2>/dev/null; then
        echo "${CRON_SCHEDULE:-0 9 * * 1-5}"
    else
        echo "0 9 * * 1-5"
    fi
}

# Function to run a specific cron job
run_cron_job() {
    local cron_type="$1"
    
    print_header "Running $cron_type cron job"
    
    if ! load_cron_env "$cron_type"; then
        print_error "Failed to load environment for $cron_type"
        return 1
    fi
    
    if ! is_cron_enabled "$cron_type"; then
        print_warning "Cron job $cron_type is disabled"
        return 0
    fi
    
    # Set up Python path
    export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"
    
    # Run the cron job
    print_status "Executing $cron_type cron job..."
    python3 -c "
import sys
sys.path.insert(0, '$SCRIPT_DIR')
from env_loader import setup_cron_logging
setup_cron_logging('$cron_type')
print('✅ $cron_type cron job executed successfully')
"
    
    print_status "$cron_type cron job completed"
}

# Function to list all cron jobs
list_cron_jobs() {
    print_header "Available Cron Jobs"
    echo
    
    for cron_type in "${CRON_TYPES[@]}"; do
        local status=""
        local schedule=""
        
        if is_cron_enabled "$cron_type"; then
            status="${GREEN}ENABLED${NC}"
            schedule=$(get_cron_schedule "$cron_type")
        else
            status="${RED}DISABLED${NC}"
            schedule="N/A"
        fi
        
        printf "%-15s | %-10s | %s\n" "$cron_type" "$status" "$schedule"
    done
    echo
}

# Function to show cron job details
show_cron_details() {
    local cron_type="$1"
    
    if [[ -z "$cron_type" ]]; then
        print_error "Please specify a cron type"
        echo "Available types: ${CRON_TYPES[*]}"
        return 1
    fi
    
    print_header "Details for $cron_type cron job"
    echo
    
    if ! load_cron_env "$cron_type"; then
        print_error "Failed to load environment for $cron_type"
        return 1
    fi
    
    echo "Cron Type:        $cron_type"
    echo "Cron Name:        ${CRON_NAME:-$cron_type}"
    echo "Schedule:         ${CRON_SCHEDULE:-0 9 * * 1-5}"
    echo "Enabled:          ${CRON_ENABLED:-true}"
    echo "API Base URL:     ${API_BASE_URL:-http://localhost:8001}"
    echo "API Endpoint:     ${API_ENDPOINT:-/api/recommendations}"
    echo "Strategy Type:    ${STRATEGY_TYPE:-default}"
    echo "Min Score:        ${MIN_SCORE:-25.0}"
    echo "Log Level:        ${LOG_LEVEL:-INFO}"
    echo "Log File:         ${LOG_FILE:-./logs/${cron_type}_cron.log}"
    echo "Environment:      ${ENVIRONMENT:-development}"
    echo
}

# Function to install cron jobs to system crontab
install_cron_jobs() {
    print_header "Installing cron jobs to system crontab"
    echo
    
    local temp_cron=$(mktemp)
    local installed_count=0
    
    # Get current crontab
    crontab -l 2>/dev/null > "$temp_cron" || true
    
    for cron_type in "${CRON_TYPES[@]}"; do
        if is_cron_enabled "$cron_type"; then
            local schedule=$(get_cron_schedule "$cron_type")
            local cron_line="$schedule cd $SCRIPT_DIR && ./manage_cron.sh run $cron_type >> ./logs/${cron_type}_cron.log 2>&1"
            
            # Remove existing entry if present
            sed -i.bak "/manage_cron.sh run $cron_type/d" "$temp_cron"
            
            # Add new entry
            echo "$cron_line" >> "$temp_cron"
            
            print_status "Installed $cron_type cron job (schedule: $schedule)"
            ((installed_count++))
        else
            print_warning "Skipping disabled cron job: $cron_type"
        fi
    done
    
    # Install the new crontab
    if [[ $installed_count -gt 0 ]]; then
        crontab "$temp_cron"
        print_status "Successfully installed $installed_count cron job(s)"
    else
        print_warning "No cron jobs to install"
    fi
    
    rm -f "$temp_cron"
}

# Function to remove cron jobs from system crontab
remove_cron_jobs() {
    print_header "Removing cron jobs from system crontab"
    echo
    
    local temp_cron=$(mktemp)
    local removed_count=0
    
    # Get current crontab
    crontab -l 2>/dev/null > "$temp_cron" || true
    
    for cron_type in "${CRON_TYPES[@]}"; do
        if grep -q "manage_cron.sh run $cron_type" "$temp_cron"; then
            sed -i.bak "/manage_cron.sh run $cron_type/d" "$temp_cron"
            print_status "Removed $cron_type cron job"
            ((removed_count++))
        fi
    done
    
    # Install the updated crontab
    if [[ $removed_count -gt 0 ]]; then
        crontab "$temp_cron"
        print_status "Successfully removed $removed_count cron job(s)"
    else
        print_warning "No cron jobs found to remove"
    fi
    
    rm -f "$temp_cron"
}

# Function to show current system crontab
show_crontab() {
    print_header "Current System Crontab"
    echo
    
    if crontab -l 2>/dev/null; then
        echo
    else
        print_warning "No crontab entries found"
    fi
}

# Function to show help
show_help() {
    cat << EOF
AlgoDiscovery Cron Job Management Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  list                    List all available cron jobs and their status
  show <cron_type>        Show detailed configuration for a specific cron job
  run <cron_type>         Run a specific cron job manually
  install                 Install all enabled cron jobs to system crontab
  remove                  Remove all cron jobs from system crontab
  crontab                 Show current system crontab
  help                    Show this help message

Available Cron Types:
  ${CRON_TYPES[*]}

Examples:
  $0 list
  $0 show short_buy
  $0 run intraday_buy
  $0 install
  $0 remove

Environment Files:
  Cron-specific configurations are loaded from:
  - $SCRIPT_DIR/env/<cron_type>.env (specific to cron type)
  - $SCRIPT_DIR/env/env.cron (fallback configuration)

EOF
}

# Main script logic
case "${1:-help}" in
    "list")
        list_cron_jobs
        ;;
    "show")
        show_cron_details "$2"
        ;;
    "run")
        if [[ -z "$2" ]]; then
            print_error "Please specify a cron type to run"
            echo "Available types: ${CRON_TYPES[*]}"
            exit 1
        fi
        run_cron_job "$2"
        ;;
    "install")
        install_cron_jobs
        ;;
    "remove")
        remove_cron_jobs
        ;;
    "crontab")
        show_crontab
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo
        show_help
        exit 1
        ;;
esac 