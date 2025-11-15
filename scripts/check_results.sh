#!/usr/bin/env bash
#
# Check pipeline results for a given week
#

set -e

# Configuration
PROJECT_ID="${PROJECT_ID:-build-unicorn25par-4813}"
WEEK="${1:-$(date +'%G-W%V')}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "Checking results for week: $WEEK"
log_info "Project: $PROJECT_ID"

# Check raw audio files
log_section "Raw Audio Files"
if gsutil ls "gs://pz-audio-raw-$PROJECT_ID/$WEEK/" 2>/dev/null; then
    COUNT=$(gsutil ls "gs://pz-audio-raw-$PROJECT_ID/$WEEK/" | wc -l)
    log_info "Found $COUNT files"
else
    log_warn "No raw audio files found"
fi

# Check analytics
log_section "Analytics (Transcripts, Prosody, Emotions)"
if gsutil ls "gs://pz-analytics-$PROJECT_ID/$WEEK/" 2>/dev/null; then
    echo ""
    log_info "Transcripts:"
    gsutil ls "gs://pz-analytics-$PROJECT_ID/$WEEK/*/transcript.json" 2>/dev/null | head -5 || log_warn "No transcripts found"
    
    echo ""
    log_info "Prosody features:"
    gsutil ls "gs://pz-analytics-$PROJECT_ID/$WEEK/*/prosody_features.json" 2>/dev/null | head -5 || log_warn "No prosody features found"
    
    echo ""
    log_info "Events & Emotions:"
    gsutil ls "gs://pz-analytics-$PROJECT_ID/$WEEK/*/events_emotions.json" 2>/dev/null | head -5 || log_warn "No events/emotions found"
    
    echo ""
    log_info "Weekly Report JSON:"
    gsutil ls "gs://pz-analytics-$PROJECT_ID/$WEEK/weekly_report.json" 2>/dev/null || log_warn "No weekly report JSON found"
else
    log_warn "No analytics found"
fi

# Check reports
log_section "Reports (HTML/PDF)"
if gsutil ls "gs://pz-reports-$PROJECT_ID/$WEEK/" 2>/dev/null; then
    gsutil ls "gs://pz-reports-$PROJECT_ID/$WEEK/"
else
    log_warn "No reports found"
fi

# Download weekly report if exists
log_section "Download Reports"
if gsutil ls "gs://pz-reports-$PROJECT_ID/$WEEK/weekly_report.html" 2>/dev/null; then
    log_info "Downloading reports to ./reports/$WEEK/"
    mkdir -p "./reports/$WEEK"
    
    gsutil cp "gs://pz-reports-$PROJECT_ID/$WEEK/weekly_report.html" "./reports/$WEEK/" 2>/dev/null && \
        log_info "✅ HTML report downloaded"
    
    gsutil cp "gs://pz-reports-$PROJECT_ID/$WEEK/weekly_report.pdf" "./reports/$WEEK/" 2>/dev/null && \
        log_info "✅ PDF report downloaded"
    
    echo ""
    log_info "Open report with:"
    log_info "  xdg-open ./reports/$WEEK/weekly_report.html"
else
    log_warn "No reports available to download"
fi

# Show recent logs
log_section "Recent Pipeline Logs"
log_info "Fetching last 10 log entries..."
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=pz-weekly-pipeline" \
  --limit 10 \
  --format "table(timestamp, severity, textPayload)" \
  --project=$PROJECT_ID 2>/dev/null || log_warn "Could not fetch logs"

echo ""
log_info "✅ Results check completed"
