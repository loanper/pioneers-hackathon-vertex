#!/usr/bin/env bash
#
# Upload test audio files to GCS for pipeline testing
#

set -e

# Configuration
PROJECT_ID="${PROJECT_ID:-build-unicorn25par-4813}"
WEEK="${1:-$(date +'%G-W%V')}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

if [ -z "$2" ]; then
    log_warn "Usage: ./upload_test_audio.sh [WEEK] [AUDIO_FILE]"
    log_warn "Example: ./upload_test_audio.sh 2025-W42 my_recording.wav"
    log_warn ""
    log_warn "If no arguments provided, will use current week and look for test files in current directory"
    exit 1
fi

AUDIO_FILE="$2"

if [ ! -f "$AUDIO_FILE" ]; then
    log_warn "File not found: $AUDIO_FILE"
    exit 1
fi

BUCKET="gs://pz-audio-raw-$PROJECT_ID"
SESSION_ID=$(basename "$AUDIO_FILE" | sed 's/\.[^.]*$//')

log_info "Uploading audio file..."
log_info "  File: $AUDIO_FILE"
log_info "  Week: $WEEK"
log_info "  Session ID: $SESSION_ID"
log_info "  Destination: $BUCKET/$WEEK/"

gsutil cp "$AUDIO_FILE" "$BUCKET/$WEEK/$SESSION_ID.wav"

log_info "✅ Upload completed!"
log_info ""
log_info "To run the pipeline for this week:"
log_info "  ./run_pipeline.sh $WEEK"
