#!/usr/bin/env bash
#
# Pizza Pipeline - Full Deployment Script
# Déploie la pipeline complète sur build-unicorn25par-4813
# Account: devstar4813@gcplab.me
#

set -e

# =============================================================================
# Configuration
# =============================================================================
PROJECT_ID="build-unicorn25par-4813"
PROJECT_NUMBER="298539766629"
ACCOUNT="devstar4813@gcplab.me"
REGION="europe-west1"

# =============================================================================
# Colors
# =============================================================================
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Check Prerequisites
# =============================================================================
log_section "Checking Prerequisites"

if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI not found. Please install it first."
    exit 1
fi

log_info "gcloud CLI found ✓"

# Check authentication
CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null)
if [ "$CURRENT_ACCOUNT" != "$ACCOUNT" ]; then
    log_warn "Current account is $CURRENT_ACCOUNT"
    log_info "Expected account: $ACCOUNT"
    log_info "Switching account..."
    gcloud config set account $ACCOUNT
fi

log_info "Account: $ACCOUNT ✓"

# Set project
log_info "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

log_info "Project: $PROJECT_ID ✓"
log_info "Region: $REGION ✓"

# =============================================================================
# Enable Required APIs
# =============================================================================
log_section "Enabling Required APIs"

APIS=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "secretmanager.googleapis.com"
    "aiplatform.googleapis.com"
    "speech.googleapis.com"
    "cloudkms.googleapis.com"
    "workflows.googleapis.com"
    "logging.googleapis.com"
    "pubsub.googleapis.com"
    "bigquery.googleapis.com"
    "storage.googleapis.com"
)

for api in "${APIS[@]}"; do
    log_info "Enabling $api..."
    gcloud services enable $api --project=$PROJECT_ID --quiet
done

log_info "All APIs enabled ✓"

# =============================================================================
# Create Service Account
# =============================================================================
log_section "Creating Service Account"

SA="pipeline-sa"
SA_EMAIL="$SA@$PROJECT_ID.iam.gserviceaccount.com"

if gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID &>/dev/null; then
    log_info "Service account $SA already exists ✓"
else
    log_info "Creating service account $SA..."
    gcloud iam service-accounts create $SA \
        --display-name="Pizza Pipeline Service Account" \
        --project=$PROJECT_ID
    log_info "Service account created ✓"
fi

# =============================================================================
# Assign IAM Roles
# =============================================================================
log_section "Assigning IAM Roles"

ROLES=(
    "roles/run.admin"
    "roles/run.invoker"
    "roles/storage.admin"
    "roles/aiplatform.user"
    "roles/speech.admin"
    "roles/iam.serviceAccountUser"
    "roles/iam.serviceAccountTokenCreator"
    "roles/secretmanager.secretAccessor"
    "roles/logging.logWriter"
    "roles/workflows.invoker"
    "roles/pubsub.editor"
    "roles/bigquery.admin"
)

for role in "${ROLES[@]}"; do
    log_info "Assigning $role..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role" \
        --condition=None \
        --quiet 2>/dev/null || true
done

log_info "IAM roles assigned ✓"

# =============================================================================
# Create GCS Buckets
# =============================================================================
log_section "Creating GCS Buckets"

BUCKETS=(
    "pz-audio-raw-$PROJECT_ID"
    "pz-audio-processed-$PROJECT_ID"
    "pz-analytics-$PROJECT_ID"
    "pz-reports-$PROJECT_ID"
)

for bucket in "${BUCKETS[@]}"; do
    if gsutil ls -b gs://$bucket &>/dev/null; then
        log_info "Bucket $bucket already exists ✓"
    else
        log_info "Creating bucket: $bucket..."
        gsutil mb -l $REGION -p $PROJECT_ID gs://$bucket
        log_info "Bucket created ✓"
    fi
done

# =============================================================================
# Setup Cloud KMS
# =============================================================================
log_section "Setting up Cloud KMS"

KEYRING="pz-ring"
KEY="pz-key"

# Create keyring
if gcloud kms keyrings describe $KEYRING --location=$REGION --project=$PROJECT_ID &>/dev/null; then
    log_info "Keyring $KEYRING already exists ✓"
else
    log_info "Creating keyring: $KEYRING..."
    gcloud kms keyrings create $KEYRING \
        --location=$REGION \
        --project=$PROJECT_ID
    log_info "Keyring created ✓"
fi

# Create key
if gcloud kms keys describe $KEY --keyring=$KEYRING --location=$REGION --project=$PROJECT_ID &>/dev/null; then
    log_info "Key $KEY already exists ✓"
else
    log_info "Creating key: $KEY..."
    gcloud kms keys create $KEY \
        --keyring=$KEYRING \
        --location=$REGION \
        --purpose=encryption \
        --project=$PROJECT_ID
    log_info "Key created ✓"
fi

KMS_RESOURCE="projects/$PROJECT_ID/locations/$REGION/keyRings/$KEYRING/cryptoKeys/$KEY"

# =============================================================================
# Apply Bucket Policies
# =============================================================================
log_section "Applying Bucket Policies"

# Create lifecycle policy
cat > /tmp/lifecycle.json << EOF
{
  "rule": [
    {"action": {"type": "Delete"}, "condition": {"age": 90}}
  ]
}
EOF

for bucket in "${BUCKETS[@]}"; do
    log_info "Configuring bucket: $bucket..."
    
    # Apply KMS encryption
    gsutil encryption set -k $KMS_RESOURCE gs://$bucket 2>/dev/null || true
    
    # Enable uniform bucket-level access
    gsutil bucketpolicyonly set on gs://$bucket 2>/dev/null || true
    
    # Apply lifecycle policy
    gsutil lifecycle set /tmp/lifecycle.json gs://$bucket
    
    log_info "Bucket configured ✓"
done

rm -f /tmp/lifecycle.json

# =============================================================================
# Build and Deploy Pipeline
# =============================================================================
log_section "Building and Deploying Pipeline"

IMAGE_NAME="pz-pipeline"
JOB_NAME="pz-weekly-pipeline"

log_info "Building Docker image..."

gcloud builds submit \
    --project=$PROJECT_ID \
    --config=pipeline/cloudbuild.yaml \
    --substitutions=_IMAGE_NAME=gcr.io/$PROJECT_ID/$IMAGE_NAME:latest \
    .

log_info "Image built: gcr.io/$PROJECT_ID/$IMAGE_NAME:latest ✓"

# Create or update Cloud Run Job
if gcloud run jobs describe $JOB_NAME --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    log_warn "Job $JOB_NAME already exists, updating..."
    
    gcloud run jobs update $JOB_NAME \
        --project=$PROJECT_ID \
        --region=$REGION \
        --image gcr.io/$PROJECT_ID/$IMAGE_NAME:latest \
        --service-account=$SA_EMAIL \
        --set-env-vars=PROJECT_ID=$PROJECT_ID,REGION=$REGION,BUCKET_RAW=pz-audio-raw-$PROJECT_ID,BUCKET_PROC=pz-audio-processed-$PROJECT_ID,BUCKET_ANALYTICS=pz-analytics-$PROJECT_ID,BUCKET_REPORTS=pz-reports-$PROJECT_ID,USER_TZ=Europe/Paris,GEMINI_MODEL=gemini-2.0-flash-exp,GOOGLE_CLOUD_LOCATION=global \
        --max-retries=1 \
        --task-timeout=3600s \
        --memory=4Gi \
        --cpu=2
else
    log_info "Creating new job: $JOB_NAME..."
    
    gcloud run jobs create $JOB_NAME \
        --project=$PROJECT_ID \
        --region=$REGION \
        --image gcr.io/$PROJECT_ID/$IMAGE_NAME:latest \
        --service-account=$SA_EMAIL \
        --set-env-vars=PROJECT_ID=$PROJECT_ID,REGION=$REGION,BUCKET_RAW=pz-audio-raw-$PROJECT_ID,BUCKET_PROC=pz-audio-processed-$PROJECT_ID,BUCKET_ANALYTICS=pz-analytics-$PROJECT_ID,BUCKET_REPORTS=pz-reports-$PROJECT_ID,USER_TZ=Europe/Paris,GEMINI_MODEL=gemini-2.0-flash-exp,GOOGLE_CLOUD_LOCATION=global \
        --max-retries=1 \
        --task-timeout=3600s \
        --memory=4Gi \
        --cpu=2
fi

log_info "Cloud Run Job deployed ✓"

# =============================================================================
# Deploy API
# =============================================================================
log_section "Deploying API"

API_IMAGE="pz-api"
API_SERVICE="pz-api"

log_info "Building API Docker image..."

gcloud builds submit \
    --project=$PROJECT_ID \
    --config=api/cloudbuild.yaml \
    --substitutions=_IMAGE_NAME=gcr.io/$PROJECT_ID/$API_IMAGE:latest \
    .

log_info "API image built ✓"

# Deploy to Cloud Run
if gcloud run services describe $API_SERVICE --region=$REGION --project=$PROJECT_ID &>/dev/null; then
    log_warn "API service already exists, updating..."
    
    gcloud run services update $API_SERVICE \
        --project=$PROJECT_ID \
        --region=$REGION \
        --image gcr.io/$PROJECT_ID/$API_IMAGE:latest \
        --service-account=$SA_EMAIL \
        --set-env-vars=PROJECT_ID=$PROJECT_ID,REGION=$REGION,BUCKET_RAW=pz-audio-raw-$PROJECT_ID,BUCKET_PROC=pz-audio-processed-$PROJECT_ID,BUCKET_ANALYTICS=pz-analytics-$PROJECT_ID,BUCKET_REPORTS=pz-reports-$PROJECT_ID,USER_TZ=Europe/Paris,GEMINI_MODEL=gemini-2.0-flash-exp,GOOGLE_CLOUD_LOCATION=global \
        --allow-unauthenticated \
        --memory=2Gi \
        --cpu=2 \
        --timeout=300s \
        --max-instances=10
else
    log_info "Deploying API service..."
    
    gcloud run deploy $API_SERVICE \
        --project=$PROJECT_ID \
        --region=$REGION \
        --image gcr.io/$PROJECT_ID/$API_IMAGE:latest \
        --service-account=$SA_EMAIL \
        --set-env-vars=PROJECT_ID=$PROJECT_ID,REGION=$REGION,BUCKET_RAW=pz-audio-raw-$PROJECT_ID,BUCKET_PROC=pz-audio-processed-$PROJECT_ID,BUCKET_ANALYTICS=pz-analytics-$PROJECT_ID,BUCKET_REPORTS=pz-reports-$PROJECT_ID,USER_TZ=Europe/Paris,GEMINI_MODEL=gemini-2.0-flash-exp,GOOGLE_CLOUD_LOCATION=global \
        --allow-unauthenticated \
        --memory=2Gi \
        --cpu=2 \
        --timeout=300s \
        --max-instances=10
fi

API_URL=$(gcloud run services describe $API_SERVICE --region=$REGION --project=$PROJECT_ID --format='value(status.url)')

log_info "API deployed ✓"
log_info "API URL: $API_URL"

# =============================================================================
# Summary
# =============================================================================
log_section "Deployment Summary"

echo ""
log_info "🎉 Pizza Pipeline deployed successfully!"
echo ""
log_info "Project Details:"
log_info "  Project ID: $PROJECT_ID"
log_info "  Project Number: $PROJECT_NUMBER"
log_info "  Account: $ACCOUNT"
log_info "  Region: $REGION"
echo ""
log_info "Service Account:"
log_info "  Email: $SA_EMAIL"
echo ""
log_info "GCS Buckets:"
for bucket in "${BUCKETS[@]}"; do
    log_info "  - gs://$bucket"
done
echo ""
log_info "Cloud Run Job:"
log_info "  Name: $JOB_NAME"
log_info "  Image: gcr.io/$PROJECT_ID/$IMAGE_NAME:latest"
echo ""
log_info "API Service:"
log_info "  Name: $API_SERVICE"
log_info "  URL: $API_URL"
echo ""
log_info "Next Steps:"
log_info "  1. Test the pipeline:"
log_info "     WEEK=\$(date +'%G-W%V')"
log_info "     gcloud run jobs execute $JOB_NAME --region=$REGION --args=\$WEEK --project=$PROJECT_ID"
echo ""
log_info "  2. Upload audio files:"
log_info "     ./scripts/upload_session_simple.sh audio.wav \$WEEK session_001"
echo ""
log_info "  3. Check results:"
log_info "     ./scripts/check_results.sh \$WEEK"
echo ""
log_info "✅ Deployment complete!"
