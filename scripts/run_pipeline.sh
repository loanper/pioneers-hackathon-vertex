#!/usr/bin/env bash
#
# Run Pizza Pipeline manually for a specific week
#

set -e

PROJECT_ID="${PROJECT_ID:-build-unicorn25par-4813}"
REGION="${REGION:-europe-west1}"
JOB_NAME="pz-weekly-pipeline"

# Get week from argument or use current week
WEEK="${1:-$(date +'%G-W%V')}"

echo "🚀 Executing pipeline for week: $WEEK"
echo "📍 Project: $PROJECT_ID, Region: $REGION"
echo ""

gcloud run jobs execute $JOB_NAME \
  --project=$PROJECT_ID \
  --region=$REGION \
  --args=$WEEK \
  --wait

echo ""
echo "✅ Execution completed!"
echo "📊 Check reports at: gs://pz-reports-$PROJECT_ID/$WEEK/"
