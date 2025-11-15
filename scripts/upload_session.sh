#!/usr/bin/env bash
#
# Mental Journal - Upload & Process Audio Session
# Usage: ./upload_session.sh <audio_file> <week> <session_id>
#

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# API endpoint
API_URL="https://mj-api-34701717619.europe-west1.run.app"

# Parse arguments
if [ $# -ne 3 ]; then
    echo -e "${RED}Usage: $0 <audio_file> <week> <session_id>${NC}"
    echo ""
    echo "Examples:"
    echo "  $0 my_journal.wav 2025-W43 session_001"
    echo "  $0 monday_morning.mp3 2025-W43 monday_morning"
    echo ""
    echo "Week format: YYYY-Www (e.g., 2025-W43)"
    exit 1
fi

AUDIO_FILE="$1"
WEEK="$2"
SESSION_ID="$3"

# Validate audio file exists
if [ ! -f "$AUDIO_FILE" ]; then
    echo -e "${RED}❌ Error: Audio file not found: $AUDIO_FILE${NC}"
    exit 1
fi

# Detect content type
if [[ "$AUDIO_FILE" == *.wav ]]; then
    CONTENT_TYPE="audio/wav"
elif [[ "$AUDIO_FILE" == *.mp3 ]]; then
    CONTENT_TYPE="audio/mp3"
elif [[ "$AUDIO_FILE" == *.flac ]]; then
    CONTENT_TYPE="audio/flac"
else
    echo -e "${YELLOW}⚠️  Warning: Unknown audio format, assuming WAV${NC}"
    CONTENT_TYPE="audio/wav"
fi

echo -e "${BLUE}🎙️  Mental Journal - Upload & Process${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
echo -e "📁 File:       ${GREEN}$AUDIO_FILE${NC}"
echo -e "📅 Week:       ${GREEN}$WEEK${NC}"
echo -e "🆔 Session:    ${GREEN}$SESSION_ID${NC}"
echo -e "📝 Type:       ${GREEN}$CONTENT_TYPE${NC}"
echo ""

# Step 1: Get signed upload URL
echo -e "${BLUE}[1/3]${NC} Getting signed upload URL..."
RESPONSE=$(curl -s -X POST "$API_URL/v1/sign-upload" \
  -H "Content-Type: application/json" \
  -d "{\"week\":\"$WEEK\",\"session_id\":\"$SESSION_ID\",\"content_type\":\"$CONTENT_TYPE\"}")

# Check if response is valid JSON
if ! echo "$RESPONSE" | jq empty 2>/dev/null; then
    echo -e "${RED}❌ API Error: Invalid response (not JSON)${NC}"
    echo -e "${YELLOW}Response: $RESPONSE${NC}"
    echo ""
    echo -e "${BLUE}💡 Alternative: Upload directly to GCS${NC}"
    echo -e "   ${GREEN}gsutil cp \"$AUDIO_FILE\" gs://mj-audio-raw-mental-journal-dev/$WEEK/$SESSION_ID.wav${NC}"
    echo ""
    echo -e "   Then trigger processing:"
    echo -e "   ${GREEN}curl -X POST $API_URL/v1/ingest/finish \\${NC}"
    echo -e "   ${GREEN}  -H 'Content-Type: application/json' \\${NC}"
    echo -e "   ${GREEN}  -d '{\"week\":\"$WEEK\",\"session_id\":\"$SESSION_ID\"}'${NC}"
    exit 1
fi

UPLOAD_URL=$(echo "$RESPONSE" | jq -r '.upload_url')
GCS_URI=$(echo "$RESPONSE" | jq -r '.gcs_uri')

if [ "$UPLOAD_URL" == "null" ] || [ -z "$UPLOAD_URL" ]; then
    echo -e "${RED}❌ Failed to get upload URL${NC}"
    echo "$RESPONSE" | jq '.'
    echo ""
    echo -e "${BLUE}💡 Alternative: Upload directly to GCS${NC}"
    echo -e "   ${GREEN}gsutil cp \"$AUDIO_FILE\" gs://mj-audio-raw-mental-journal-dev/$WEEK/$SESSION_ID.wav${NC}"
    echo ""
    echo -e "   Then trigger processing:"
    echo -e "   ${GREEN}curl -X POST $API_URL/v1/ingest/finish \\${NC}"
    echo -e "   ${GREEN}  -H 'Content-Type: application/json' \\${NC}"
    echo -e "   ${GREEN}  -d '{\"week\":\"$WEEK\",\"session_id\":\"$SESSION_ID\"}'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Got upload URL${NC}"
echo -e "   GCS URI: $GCS_URI"
echo ""

# Step 2: Upload audio file
echo -e "${BLUE}[2/3]${NC} Uploading audio file..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$UPLOAD_URL" \
  -H "Content-Type: $CONTENT_TYPE" \
  --data-binary "@$AUDIO_FILE")

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}❌ Upload failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

FILE_SIZE=$(wc -c < "$AUDIO_FILE" | tr -d ' ')
FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1048576" | bc)

echo -e "${GREEN}✅ Uploaded successfully (${FILE_SIZE_MB} MB)${NC}"
echo ""

# Step 3: Trigger processing
echo -e "${BLUE}[3/3]${NC} Triggering processing pipeline..."
echo -e "${YELLOW}⏳ This may take 30-60 seconds per minute of audio...${NC}"
echo ""

PROCESS_RESPONSE=$(curl -s -X POST "$API_URL/v1/ingest/finish" \
  -H "Content-Type: application/json" \
  -d "{\"week\":\"$WEEK\",\"session_id\":\"$SESSION_ID\"}")

# Check if processing succeeded
if echo "$PROCESS_RESPONSE" | jq -e '.artifacts' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Processing completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📊 Generated Artifacts:${NC}"
    echo "$PROCESS_RESPONSE" | jq -r '.artifacts | to_entries[] | "   \(.key): \(.value)"'
    echo ""
    
    # Extract GCS URIs
    TRANSCRIPT_URI=$(echo "$PROCESS_RESPONSE" | jq -r '.artifacts.transcript')
    PROSODY_URI=$(echo "$PROCESS_RESPONSE" | jq -r '.artifacts.prosody')
    NLU_URI=$(echo "$PROCESS_RESPONSE" | jq -r '.artifacts.nlu')
    
    echo -e "${BLUE}💡 View Results:${NC}"
    echo -e "   Transcript:  ${GREEN}gsutil cat $TRANSCRIPT_URI | jq .transcript${NC}"
    echo -e "   Prosody:     ${GREEN}gsutil cat $PROSODY_URI | jq .${NC}"
    echo -e "   Emotions:    ${GREEN}gsutil cat $NLU_URI | jq .emotions${NC}"
    echo ""
    echo -e "${BLUE}📅 Generate Weekly Report:${NC}"
    echo -e "   ${GREEN}bash scripts/run_pipeline.sh $WEEK${NC}"
    echo ""
    
else
    echo -e "${RED}❌ Processing failed${NC}"
    echo "$PROCESS_RESPONSE" | jq '.'
    exit 1
fi

echo -e "${GREEN}🎉 Done!${NC}"
