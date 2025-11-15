#!/usr/bin/env bash
#
# Deploy Pizza Pipeline to Cloud Run Job
#

set -e

# =============================================================================
# Configuration
# =============================================================================
PROJECT_ID="${PROJECT_ID:-build-unicorn25par-4813}"
REGION="${REGION:-europe-west1}"
SA="pipeline-sa"
IMAGE_NAME="pz-pipeline"
JOB_NAME="pz-weekly-pipeline"

# =============================================================================
# Colors
# =============================================================================
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# =============================================================================
# Build & Push Container
# =============================================================================
log_info "Building container image..."

gcloud builds submit \
  --project=$PROJECT_ID \
  --config=pipeline/cloudbuild.yaml \
  --substitutions=_IMAGE_NAME=gcr.io/$PROJECT_ID/$IMAGE_NAME:latest \
  .

log_info "Container built: gcr.io/$PROJECT_ID/$IMAGE_NAME:latest"

# =============================================================================
# Create or Update Cloud Run Job
# =============================================================================
log_info "Deploying Cloud Run Job: $JOB_NAME"

# Check if job exists
if gcloud run jobs describe $JOB_NAME --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    log_warn "Job $JOB_NAME already exists, updating..."
    
    gcloud run jobs update $JOB_NAME \
      --project=$PROJECT_ID \
      --region=$REGION \
      --image gcr.io/$PROJECT_ID/$IMAGE_NAME:latest \
      --service-account=$SA@$PROJECT_ID.iam.gserviceaccount.com \
      --set-env-vars=PROJECT_ID=$PROJECT_ID,REGION=$REGION,BUCKET_RAW=pz-audio-raw-$PROJECT_ID,BUCKET_PROC=pz-audio-processed-$PROJECT_ID,BUCKET_ANALYTICS=pz-analytics-$PROJECT_ID,BUCKET_REPORTS=pz-reports-$PROJECT_ID,USER_TZ=Europe/Paris,GEMINI_MODEL=gemini-2.0-flash-exp,GOOGLE_CLOUD_LOCATION=global \
      --max-retries=1 \
      --task-timeout=3600s \
      --memory=4Gi \
      --cpu=2
else
    log_info "Creating new job: $JOB_NAME"
    
    gcloud run jobs create $JOB_NAME \
      --project=$PROJECT_ID \
      --region=$REGION \
      --image gcr.io/$PROJECT_ID/$IMAGE_NAME:latest \
      --service-account=$SA@$PROJECT_ID.iam.gserviceaccount.com \
      --set-env-vars=PROJECT_ID=$PROJECT_ID,REGION=$REGION,BUCKET_RAW=pz-audio-raw-$PROJECT_ID,BUCKET_PROC=pz-audio-processed-$PROJECT_ID,BUCKET_ANALYTICS=pz-analytics-$PROJECT_ID,BUCKET_REPORTS=pz-reports-$PROJECT_ID,USER_TZ=Europe/Paris,GEMINI_MODEL=gemini-2.0-flash-exp,GOOGLE_CLOUD_LOCATION=global \
      --max-retries=1 \
      --task-timeout=3600s \
      --memory=4Gi \
      --cpu=2
fi

log_info "Deployment completed successfully! 🎉"
log_info ""
log_info "To execute the job manually:"
log_info "  WEEK=\$(date +'%G-W%V')"
log_info "  gcloud run jobs execute $JOB_NAME --region=$REGION --args=\$WEEK"
