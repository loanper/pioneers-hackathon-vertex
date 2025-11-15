#!/usr/bin/env bash
#
# Pizza Pipeline - Simple Upload (Direct to GCS)
# Usage: ./upload_session_simple.sh <audio_file> <week> <session_id>
#
# This script bypasses signed URLs and uploads directly to GCS,
# then triggers the processing API.
#

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT="build-unicorn25par-4813"
BUCKET_RAW="pz-audio-raw-$PROJECT"
API_URL="https://pz-api-34701717619.europe-west1.run.app"

# Parse arguments
if [ $# -ne 3 ]; then
    echo -e "${RED}Usage: $0 <audio_file> <week> <session_id>${NC}"
    echo ""
    echo "Examples:"
    echo "  $0 my_journal.wav 2025-W43 session_001"
    echo "  $0 monday_morning.mp3 2025-W44 session_002"
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

echo -e "${BLUE}🎙️  Mental Journal - Simple Upload${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""
echo -e "📁 File:       ${GREEN}$AUDIO_FILE${NC}"
echo -e "📅 Week:       ${GREEN}$WEEK${NC}"
echo -e "🆔 Session:    ${GREEN}$SESSION_ID${NC}"
echo ""

# Step 1: Upload directly to GCS
echo -e "${BLUE}[1/2]${NC} Uploading to Google Cloud Storage..."
GCS_PATH="gs://$BUCKET_RAW/$WEEK/$SESSION_ID.wav"

gsutil cp "$AUDIO_FILE" "$GCS_PATH"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Upload failed${NC}"
    exit 1
fi

FILE_SIZE=$(wc -c < "$AUDIO_FILE" | tr -d ' ')
FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1048576" | bc)

echo -e "${GREEN}✅ Uploaded successfully (${FILE_SIZE_MB} MB)${NC}"
echo -e "   GCS Path: $GCS_PATH"
echo ""

# Step 2: Trigger processing
echo -e "${BLUE}[2/2]${NC} Triggering processing pipeline..."
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
    echo "$PROCESS_RESPONSE" | jq '.' 2>/dev/null || echo "$PROCESS_RESPONSE"
    exit 1
fi

echo -e "${GREEN}🎉 Done!${NC}"
