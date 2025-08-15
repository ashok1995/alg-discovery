#!/bin/bash

echo "🚀 Testing AlgoDiscovery Production Setup (Port 80)"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_TOTAL=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    echo -n "🔍 Testing: $test_name... "
    
    # Run the test command
    local result
    result=$(eval "$test_command" 2>/dev/null)
    local exit_code=$?
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if [ $exit_code -eq 0 ] && echo "$result" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "   Command: $test_command"
        echo "   Result: $result"
        return 1
    fi
}

echo -e "${BLUE}📋 Test Summary${NC}"
echo "=================="

# Test 1: Frontend accessibility (no port)
run_test "Frontend Access (Port 80)" \
    "curl -s -o /dev/null -w '%{http_code}' http://algodiscovery.prod" \
    "200"

# Test 2: Frontend accessibility (port 8080)
run_test "Frontend Access (Port 8080)" \
    "curl -s -o /dev/null -w '%{http_code}' http://algodiscovery.prod:8080" \
    "200"

# Test 3: API Proxy - Recommendation Service
run_test "API Proxy - Recommendations" \
    "curl -s -X POST http://algodiscovery.prod/api/recommendations/swing -H 'Content-Type: application/json' -d '{\"max_items\": 1}' | grep -o '\"status\":\"success\"'" \
    "success"

# Test 4: API Proxy - Health Check
run_test "API Proxy - Health Check" \
    "curl -s http://algodiscovery.prod/api/recommendations/health | grep -o '\"status\":\"healthy\"'" \
    "healthy"

# Test 5: Frontend Content - React App
run_test "Frontend Content - React App" \
    "curl -s http://algodiscovery.prod | grep -o 'Swing Trading System'" \
    "Swing Trading System"

# Test 6: Frontend Content - No localhost references
run_test "Frontend Content - No localhost API refs" \
    "curl -s http://algodiscovery.prod | grep -o 'localhost:[0-9]*' | wc -l" \
    "0"

# Test 7: Container Status
run_test "Container Status - Nginx Proxy" \
    "docker ps --format '{{.Names}} {{.Status}}' | grep 'algodiscovery-nginx-proxy' | grep -o 'Up'" \
    "Up"

# Test 8: Container Status
run_test "Container Status - Frontend" \
    "docker ps --format '{{.Names}} {{.Status}}' | grep 'algodiscovery-frontend-prod' | grep -o 'Up'" \
    "Up"

# Test 9: DNS Resolution
run_test "DNS Resolution" \
    "grep -q 'algodiscovery.prod' /etc/hosts && echo '127.0.0.1'" \
    "127.0.0.1"

# Test 10: Backend Service Health
run_test "Backend Service - Recommendation API" \
    "curl -s http://localhost:8010/health | grep -o '\"status\":\"healthy\"'" \
    "healthy"

echo ""
echo -e "${BLUE}📊 Test Results${NC}"
echo "================"
echo -e "Total Tests: ${YELLOW}$TESTS_TOTAL${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$((TESTS_TOTAL - TESTS_PASSED))${NC}"

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! Production setup is working correctly.${NC}"
    echo ""
    echo -e "${BLUE}🌐 Access URLs:${NC}"
    echo "   Production Frontend: http://algodiscovery.prod"
    echo "   Direct Frontend: http://algodiscovery.prod:8080"
    echo ""
    echo -e "${BLUE}🔧 API Endpoints:${NC}"
    echo "   Recommendations: http://algodiscovery.prod/api/recommendations/swing"
    echo "   Health Check: http://algodiscovery.prod/api/recommendations/health"
    echo ""
    echo -e "${BLUE}💡 Key Benefits:${NC}"
    echo "   ✅ No port number in production URL"
    echo "   ✅ DNS-based frontend identification"
    echo "   ✅ API proxy eliminates CORS issues"
    echo "   ✅ Backend services unchanged"
    echo "   ✅ Docker-based deployment"
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please check the setup.${NC}"
    exit 1
fi
