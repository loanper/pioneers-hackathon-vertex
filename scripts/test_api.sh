#!/bin/bash

# Mental Journal API - Local Test Script
# Teste toutes les routes de l'API

API_URL="${API_URL:-http://localhost:8080}"
WEEK="${WEEK:-2025-W42}"
SESSION_ID="${SESSION_ID:-session_001}"

echo "🧪 Testing Mental Journal API"
echo "🌐 API URL: ${API_URL}"
echo "📅 Week: ${WEEK}"
echo "🎙️ Session: ${SESSION_ID}"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local body=$4
    
    echo -e "${YELLOW}Testing: ${description}${NC}"
    echo "  ${method} ${endpoint}"
    
    if [ -z "$body" ]; then
        response=$(curl -s -X ${method} "${API_URL}${endpoint}" -w "\n%{http_code}")
    else
        response=$(curl -s -X ${method} "${API_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "${body}" \
            -w "\n%{http_code}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "  ${GREEN}✅ SUCCESS (${http_code})${NC}"
        echo "  Response: $(echo $body | jq -C . 2>/dev/null || echo $body)"
    else
        echo -e "  ${RED}❌ FAILED (${http_code})${NC}"
        echo "  Response: $(echo $body | jq -C . 2>/dev/null || echo $body)"
    fi
    echo ""
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  SANTÉ & MÉTA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/" "Root endpoint"
test_endpoint "GET" "/healthz" "Health check"
test_endpoint "GET" "/config" "Configuration"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  UPLOAD & INGESTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "POST" "/v1/sign-upload" "Generate signed upload URL" \
    '{"week":"'${WEEK}'","session_id":"'${SESSION_ID}'","content_type":"audio/wav"}'

# Note: ingest/finish nécessite un audio uploadé, on le teste en dernier

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  SESSIONS & SEMAINES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/v1/weeks" "List all weeks"
test_endpoint "GET" "/v1/weeks/${WEEK}/sessions" "List sessions for week"
test_endpoint "GET" "/v1/weeks/${WEEK}/sessions/${SESSION_ID}" "Get session details"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  RAPPORTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "GET" "/v1/weeks/${WEEK}/report" "Get weekly report (JSON)"
test_endpoint "GET" "/v1/weeks/${WEEK}/report/signed" "Get signed PDF URL"
test_endpoint "GET" "/v1/reports/history" "Get reports history"
test_endpoint "GET" "/v1/reports/trends?weeks=4" "Get trends (4 weeks)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  ORCHESTRATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# Note: Ces routes déclenchent des jobs réels, à tester avec précaution
echo -e "${YELLOW}⚠️  Skipping orchestration tests (triggers real jobs)${NC}"
echo "   To test manually:"
echo "   - POST /v1/run-week with {\"week\":\"${WEEK}\"}"
echo "   - POST /v1/run-session with {\"week\":\"${WEEK}\",\"session_id\":\"${SESSION_ID}\"}"
echo "   - POST /v1/pipeline/logs with {\"week\":\"${WEEK}\",\"limit\":50}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Tests terminés !"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Documentation complète: ${API_URL}/docs"
echo "🔍 Redoc: ${API_URL}/redoc"
