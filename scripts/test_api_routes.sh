#!/bin/bash

# Test all API routes
# Usage: ./test_api_routes.sh [API_URL]

API_URL="${1:-https://mj-api-34701717619.europe-west1.run.app}"

echo "🧪 Testing API Routes"
echo "📍 API URL: $API_URL"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_route() {
    local method=$1
    local route=$2
    local expected_status=${3:-200}
    local description=$4
    local data=$5
    
    echo -n "Testing: $method $route"
    if [ -n "$description" ]; then
        echo -n " - $description"
    fi
    echo ""
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$route")
    elif [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$API_URL$route")
        else
            response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$route")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} - HTTP $http_code"
        if [ ${#body} -lt 200 ]; then
            echo "   Response: $body"
        else
            echo "   Response: $(echo "$body" | head -c 100)..."
        fi
    else
        echo -e "${RED}❌ FAIL${NC} - HTTP $http_code (expected $expected_status)"
        echo "   Response: $(echo "$body" | head -c 200)"
    fi
    echo ""
}

# Root & Meta
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  ROOT & META ROUTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_route "GET" "/" 200 "Root endpoint"
test_route "GET" "/healthz" 200 "Health check"
test_route "GET" "/config" 200 "Configuration"

# Weeks & Sessions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  WEEKS & SESSIONS ROUTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_route "GET" "/v1/weeks" 200 "List all weeks"
test_route "GET" "/v1/weeks/2025-W42/sessions" 200 "Get week sessions"
test_route "GET" "/v1/weeks/2025-W42/sessions/session_001" 200 "Get session detail" || \
test_route "GET" "/v1/weeks/2025-W42/sessions/session_001" 404 "Session not found (expected)"

# Reports
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  REPORTS ROUTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_route "GET" "/v1/weeks/2025-W42/report" 200 "Get weekly report" || \
test_route "GET" "/v1/weeks/2025-W42/report" 404 "Report not found (expected)"

test_route "GET" "/v1/reports/history" 200 "Get reports history"
test_route "GET" "/v1/reports/trends?weeks=4" 200 "Get trends (4 weeks)"

# Upload & Ingestion
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  UPLOAD & INGESTION ROUTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_route "POST" "/v1/sign-upload" 200 "Sign upload URL" \
    '{"week":"2025-W43","session_id":"test_session","content_type":"audio/wav"}'

# Note: We won't test /v1/ingest/finish as it requires actual audio file

# Orchestration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  ORCHESTRATION ROUTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Note: We won't test pipeline routes to avoid triggering jobs

echo -e "${YELLOW}⚠️  Pipeline routes not tested (would trigger Cloud Run Jobs)${NC}"
echo "   - POST /v1/run-week"
echo "   - GET /v1/pipeline/status/{execution_id}"
echo "   - POST /v1/pipeline/logs"
echo ""

# Documentation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  DOCUMENTATION ROUTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_route "GET" "/docs" 200 "Swagger UI"
test_route "GET" "/redoc" 200 "ReDoc"
test_route "GET" "/openapi.json" 200 "OpenAPI schema"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Test suite completed!"
echo ""
