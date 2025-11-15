#!/usr/bin/env bash
#
# Pizza Pipeline - Setup GCP Infrastructure
# This script creates the GCP project, IAM, buckets, and KMS configuration
#

set -e

# =============================================================================
# Configuration - MODIFY THESE VALUES
# =============================================================================
PROJECT_ID="${PROJECT_ID:-build-unicorn25par-4813}"
BILLING_ACCOUNT="${BILLING_ACCOUNT:-}"  # Set your billing account ID
REGION="${REGION:-europe-west1}"
SA="pipeline-sa"

# =============================================================================
# Colors for output
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Prerequisites Check
# =============================================================================
log_info "Checking prerequisites..."

if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI not found. Please install it first."
    exit 1
fi

if [ -z "$BILLING_ACCOUNT" ]; then
    log_warn "BILLING_ACCOUNT not set. Attempting to use default..."
    BILLING_ACCOUNT=$(gcloud billing accounts list --format="value(ACCOUNT_ID)" --limit=1)
    if [ -z "$BILLING_ACCOUNT" ]; then
        log_error "No billing account found. Please set BILLING_ACCOUNT environment variable."
        exit 1
    fi
    log_info "Using billing account: $BILLING_ACCOUNT"
fi

# =============================================================================
# Step 0 - Enable APIs
# =============================================================================
log_info "Step 0: Enabling required APIs..."

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  speech.googleapis.com \
  cloudkms.googleapis.com \
  workflows.googleapis.com \
  logging.googleapis.com \
  pubsub.googleapis.com \
  bigquery.googleapis.com \
  --project=$PROJECT_ID 2>/dev/null || {
    log_warn "Some APIs may already be enabled or project doesn't exist yet"
}

# =============================================================================
# Step 1 - Create Project (if it doesn't exist)
# =============================================================================
log_info "Step 1: Setting up GCP project..."

if gcloud projects describe $PROJECT_ID &>/dev/null; then
    log_info "Project $PROJECT_ID already exists"
else
    log_info "Creating project $PROJECT_ID..."
    gcloud projects create $PROJECT_ID --name="Pizza Pipeline"
    log_info "Linking billing account..."
    gcloud beta billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT
fi

gcloud config set project $PROJECT_ID

# Re-enable APIs after project creation
log_info "Enabling APIs for the project..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  speech.googleapis.com \
  cloudkms.googleapis.com \
  workflows.googleapis.com \
  logging.googleapis.com \
  pubsub.googleapis.com \
  bigquery.googleapis.com

# =============================================================================
# Step 2 - Create Service Account
# =============================================================================
log_info "Step 2: Creating service account..."

if gcloud iam service-accounts describe $SA@$PROJECT_ID.iam.gserviceaccount.com &>/dev/null; then
    log_info "Service account $SA already exists"
else
    gcloud iam service-accounts create $SA \
      --display-name="Pipeline Service Account"
fi

# =============================================================================
# Step 3 - Assign IAM Roles
# =============================================================================
log_info "Step 3: Assigning IAM roles..."

ROLES=(
  roles/run.admin
  roles/run.invoker
  roles/storage.admin
  roles/aiplatform.user
  roles/speech.admin
  roles/iam.serviceAccountUser
  roles/secretmanager.secretAccessor
  roles/logging.logWriter
  roles/workflows.invoker
  roles/pubsub.editor
  roles/bigquery.admin
)

for r in "${ROLES[@]}"; do
  log_info "Assigning role: $r"
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member=serviceAccount:$SA@$PROJECT_ID.iam.gserviceaccount.com \
    --role=$r \
    --quiet
done

# =============================================================================
# Step 4 - Create GCS Buckets
# =============================================================================
log_info "Step 4: Creating GCS buckets..."

BUCKETS=(
  "pz-audio-raw-$PROJECT_ID"
  "pz-audio-processed-$PROJECT_ID"
  "pz-analytics-$PROJECT_ID"
  "pz-reports-$PROJECT_ID"
)

for b in "${BUCKETS[@]}"; do
  if gsutil ls -b gs://$b &>/dev/null; then
    log_info "Bucket $b already exists"
  else
    log_info "Creating bucket: $b"
    gsutil mb -l $REGION gs://$b
  fi
done

# =============================================================================
# Step 5 - Setup KMS (CMEK)
# =============================================================================
log_info "Step 5: Setting up Cloud KMS..."

KEYRING="pz-ring"
KEY="pz-key"

# Create keyring
if gcloud kms keyrings describe $KEYRING --location=$REGION &>/dev/null; then
    log_info "Keyring $KEYRING already exists"
else
    log_info "Creating keyring: $KEYRING"
    gcloud kms keyrings create $KEYRING --location=$REGION
fi

# Create key
if gcloud kms keys describe $KEY --keyring=$KEYRING --location=$REGION &>/dev/null; then
    log_info "Key $KEY already exists"
else
    log_info "Creating key: $KEY"
    gcloud kms keys create $KEY \
      --keyring=$KEYRING \
      --location=$REGION \
      --purpose=encryption
fi

KMS_RESOURCE="projects/$PROJECT_ID/locations/$REGION/keyRings/$KEYRING/cryptoKeys/$KEY"

# =============================================================================
# Step 6 - Apply KMS & Lifecycle to Buckets
# =============================================================================
log_info "Step 6: Applying encryption and lifecycle policies..."

# Create lifecycle policy
cat > /tmp/lifecycle.json << EOF
{
  "rule": [
    {"action": {"type": "Delete"}, "condition": {"age": 90}}
  ]
}
EOF

for b in "${BUCKETS[@]}"; do
  log_info "Configuring bucket: $b"
  
  # Apply KMS encryption
  gsutil kms encryption -k $KMS_RESOURCE gs://$b
  
  # Enable uniform bucket-level access
  gsutil bucketpolicyonly set on gs://$b
  
  # Apply lifecycle policy
  gsutil lifecycle set /tmp/lifecycle.json gs://$b
done

rm /tmp/lifecycle.json

# =============================================================================
# Step 7 - Create BigQuery Dataset (optional)
# =============================================================================
log_info "Step 7: Creating BigQuery dataset (optional)..."

BQ_DATASET="journaling"
if bq ls -d $BQ_DATASET &>/dev/null; then
    log_info "BigQuery dataset $BQ_DATASET already exists"
else
    log_info "Creating BigQuery dataset: $BQ_DATASET"
    bq mk --location=$REGION --dataset $PROJECT_ID:$BQ_DATASET
fi

# =============================================================================
# Summary
# =============================================================================
log_info "=========================================="
log_info "Setup completed successfully! 🎉"
log_info "=========================================="
log_info ""
log_info "Project ID: $PROJECT_ID"
log_info "Region: $REGION"
log_info "Service Account: $SA@$PROJECT_ID.iam.gserviceaccount.com"
log_info ""
log_info "Buckets created:"
for b in "${BUCKETS[@]}"; do
  log_info "  - gs://$b"
done
log_info ""
log_info "Next steps:"
log_info "  1. Build and deploy the pipeline container"
log_info "  2. Create Cloud Run Job"
log_info "  3. Set up Cloud Scheduler for weekly execution"
log_info ""
log_info "To build the pipeline:"
log_info "  cd pipeline/"
log_info "  gcloud builds submit --tag gcr.io/$PROJECT_ID/pz-pipeline:latest ."
log_info ""
