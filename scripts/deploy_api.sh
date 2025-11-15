#!/bin/bash
set -e

# Pizza API - Deployment Script
# Déploie l'API FastAPI sur Cloud Run

# Get script directory and move to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.."

PROJECT_ID="build-unicorn25par-4813"
REGION="europe-west1"
SERVICE_NAME="pz-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "🚀 Déploiement de l'API Pizza Pipeline"
echo "📍 Project: ${PROJECT_ID}"
echo "🌍 Region: ${REGION}"
echo "🐳 Image: ${IMAGE_NAME}"
echo ""

# Ensure service account has required permissions
echo "🔐 Vérification des permissions IAM..."
SERVICE_ACCOUNT="pipeline-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant signBlob permission (required for signed URLs)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --condition=None \
  --quiet 2>/dev/null || true

# Grant Storage Admin (already has it, but ensuring)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.admin" \
  --condition=None \
  --quiet 2>/dev/null || true

echo "✅ Permissions IAM configurées"
echo ""

# Build and push Docker image
echo "📦 Building Docker image..."
gcloud builds submit \
  --config api/cloudbuild.yaml \
  --project ${PROJECT_ID} \
  --substitutions=_IMAGE_NAME=${IMAGE_NAME}

echo ""
echo "🚢 Deploying to Cloud Run..."

# Deploy to Cloud Run
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --service-account pipeline-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "PROJECT_ID=${PROJECT_ID}" \
  --set-env-vars "REGION=${REGION}" \
  --set-env-vars "BUCKET_RAW=pz-audio-raw-${PROJECT_ID}" \
  --set-env-vars "BUCKET_ANALYTICS=pz-analytics-${PROJECT_ID}" \
  --set-env-vars "BUCKET_REPORTS=pz-reports-${PROJECT_ID}" \
  --set-env-vars "GEMINI_MODEL=gemini-2.0-flash-exp" \
  --set-env-vars "GOOGLE_CLOUD_LOCATION=global" \
  --project ${PROJECT_ID}

echo ""
echo "✅ Déploiement terminé !"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)')

echo "🌐 API URL: ${SERVICE_URL}"
echo "📚 Documentation: ${SERVICE_URL}/docs"
echo "🏥 Health check: ${SERVICE_URL}/health"
echo ""

# Test health endpoint
echo "🧪 Testing health endpoint..."
curl -s "${SERVICE_URL}/health"

echo ""
echo "🎉 API déployée avec succès !"
