#!/bin/bash
set -e

PROJECT_ID=${PROJECT_ID:-"mental-journal-dev"}
REGION=${REGION:-"europe-west1"}
BUCKET_RAW=${BUCKET_RAW:-"mj-audio-raw-mental-journal-dev"}
TRIGGER_NAME="audio-upload-trigger"
JOB_NAME="mj-weekly-pipeline"
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")

echo "[INFO] Creating Eventarc trigger for Cloud Run Job"
echo "[INFO] Trigger: ${TRIGGER_NAME}"
echo "[INFO] Bucket: gs://${BUCKET_RAW}/"
echo "[INFO] Target Job: ${JOB_NAME}"

# Create a simple Cloud Run service that will trigger the job
cat > trigger_service.py <<'EOF'
from flask import Flask, request
import os
import json
from google.cloud import run_v2

app = Flask(__name__)

PROJECT_ID = os.environ.get("PROJECT_ID", "mental-journal-dev")
REGION = os.environ.get("REGION", "europe-west1")
JOB_NAME = os.environ.get("JOB_NAME", "mj-weekly-pipeline")

@app.route("/", methods=["POST"])
def handle_event():
    # CloudEvent format from Eventarc
    event = request.get_json(silent=True) or {}
    
    # GCS CloudEvent has 'bucket' and 'name' at top level
    bucket = event.get("bucket", "")
    file_name = event.get("name", "")
    
    if not file_name:
        print("⚠️  No file name in event, skipping")
        return "OK", 200
    
    print(f"📁 New file uploaded: gs://{bucket}/{file_name}")
    
    # Extract week from path (format: YYYY-WXX/session_*/audio.wav)
    parts = file_name.split("/")
    if len(parts) < 2:
        print("⚠️  Skipping: Invalid path")
        return "OK", 200
    
    week = parts[0]
    
    # Validate week format (YYYY-WXX)
    if not week or len(week) != 8 or "-W" not in week:
        print(f"⚠️  Skipping: Invalid week '{week}'")
        return "OK", 200
    
    # Only trigger for audio files
    if not file_name.endswith((".wav", ".mp3", ".flac", ".webm")):
        print("⚠️  Skipping: Not an audio file")
        return "OK", 200
    
    print(f"🚀 Triggering pipeline for week: {week}")
    
    try:
        client = run_v2.JobsClient()
        job_path = f"projects/{PROJECT_ID}/locations/{REGION}/jobs/{JOB_NAME}"
        
        # Use dict-based request instead of protobuf to avoid version conflicts
        request_dict = {
            "name": job_path,
            "overrides": {
                "container_overrides": [
                    {"args": [week]}
                ]
            }
        }
        
        operation = client.run_job(request=request_dict)
        print(f"✅ Pipeline triggered: {operation.name}")
        
    except Exception as e:
        print(f"❌ Error triggering pipeline: {e}")
        import traceback
        traceback.print_exc()
    
    return "OK", 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
EOF

# Create Dockerfile
cat > Dockerfile <<'EOF'
FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir flask google-cloud-run gunicorn
COPY trigger_service.py .
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 trigger_service:app
EOF

echo "[INFO] Building trigger service..."
gcloud builds submit --tag gcr.io/${PROJECT_ID}/audio-trigger-service .

echo "[INFO] Deploying trigger service..."
gcloud run deploy audio-trigger-service \
  --image gcr.io/${PROJECT_ID}/audio-trigger-service \
  --region=${REGION} \
  --platform=managed \
  --no-allow-unauthenticated \
  --service-account=pipeline-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --set-env-vars="PROJECT_ID=${PROJECT_ID},REGION=${REGION},JOB_NAME=${JOB_NAME}"

# Grant GCS service account permission to publish to Pub/Sub (required for GCS Eventarc triggers)
GCS_SERVICE_ACCOUNT=$(gsutil kms serviceaccount -p ${PROJECT_ID})
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member=serviceAccount:${GCS_SERVICE_ACCOUNT} \
  --role=roles/pubsub.publisher || true

# Grant Eventarc service agent permission to receive events (required by Eventarc)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member=serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-eventarc.iam.gserviceaccount.com \
  --role=roles/eventarc.eventReceiver || true

# Ensure the runtime service account can invoke Cloud Run Jobs (use run.admin which includes job run)
# (Note: roles/run.jobRunner may not exist depending on the project; run.admin suffices.)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member=serviceAccount:pipeline-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/run.admin || true

# Grant Eventarc service agent permission to invoke the trigger service
gcloud run services add-iam-policy-binding audio-trigger-service \
  --region=${REGION} \
  --member=serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-eventarc.iam.gserviceaccount.com \
  --role=roles/run.invoker || true

gcloud run services add-iam-policy-binding audio-trigger-service \
  --region=${REGION} \
  --member=serviceAccount:pipeline-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/run.invoker || true

echo "[INFO] Creating Eventarc trigger..."
gcloud eventarc triggers create ${TRIGGER_NAME} \
  --location=${REGION} \
  --destination-run-service=audio-trigger-service \
  --destination-run-region=${REGION} \
  --event-filters="type=google.cloud.storage.object.v1.finalized" \
  --event-filters="bucket=${BUCKET_RAW}" \
  --service-account=${PROJECT_NUMBER}-compute@developer.gserviceaccount.com || echo "Trigger may already exist"

# Cleanup temp files
rm -f trigger_service.py Dockerfile

echo ""
echo "[INFO] ✅ Auto-trigger deployed successfully!"
echo "[INFO] Pipeline will automatically run when audio is uploaded to:"
echo "[INFO]   gs://${BUCKET_RAW}/YYYY-WXX/session_*/audio.{wav,mp3,flac,webm}"
