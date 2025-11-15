# 🍕 Pizza Pipeline - Deployment Guide

This document describes how to deploy the Pizza Pipeline to the GCP project `build-unicorn25par-4813`.

## 📋 Project Information

- **Project ID**: `build-unicorn25par-4813`
- **Project Number**: `298539766629`
- **Account**: `devstar4813@gcplab.me`
- **Region**: `europe-west1`

## 🚀 Quick Deployment

### Option 1: Full Automated Deployment (Recommended)

Run the complete deployment script:

```bash
cd /Users/robinqueriaux/Documents/GitHub/GCPU-hackathon/GCPU-hackathon-vertex

# Ensure you're authenticated with the correct account
gcloud auth login devstar4813@gcplab.me
gcloud config set project build-unicorn25par-4813

# Run the full deployment script
./scripts/deploy_pizza_full.sh
```

This script will:
1. ✅ Enable all required APIs
2. ✅ Create service account with proper permissions
3. ✅ Create GCS buckets with KMS encryption
4. ✅ Build and deploy the pipeline Docker image
5. ✅ Create Cloud Run Job
6. ✅ Build and deploy the API
7. ✅ Configure all environment variables

### Option 2: Step-by-Step Deployment

If you prefer to deploy components individually:

```bash
# 1. Setup infrastructure
./scripts/setup.sh

# 2. Deploy the pipeline
./scripts/deploy.sh

# 3. Deploy the API
./scripts/deploy_api.sh
```

## 🔧 Components Deployed

### GCS Buckets
- `pz-audio-raw-build-unicorn25par-4813` - Raw audio files (WAV/MP3/FLAC)
- `pz-audio-processed-build-unicorn25par-4813` - Processed audio files
- `pz-analytics-build-unicorn25par-4813` - JSON analytics data
- `pz-reports-build-unicorn25par-4813` - Generated HTML/PDF reports

### Cloud Run Services
- **Job**: `pz-weekly-pipeline` - Weekly batch processing job
- **Service**: `pz-api` - REST API for uploads and queries

### KMS Configuration
- **Keyring**: `pz-ring`
- **Key**: `pz-key`
- Applied to all buckets for encryption at rest

## 📝 Configuration Files Updated

All configuration has been updated from the original project:
- ❌ No references to "kura"
- ❌ No references to "mental-journal" or "mj-"
- ✅ All resources renamed to "pizza" or "pz-"
- ✅ Project ID updated to `build-unicorn25par-4813`
- ✅ Account updated to `devstar4813@gcplab.me`

### Files Modified
- `Makefile` - Build automation
- `.env.example` - Environment configuration
- `scripts/setup.sh` - Infrastructure setup
- `scripts/deploy.sh` - Pipeline deployment
- `scripts/deploy_api.sh` - API deployment
- `scripts/check_results.sh` - Results verification
- `scripts/run_pipeline.sh` - Manual execution
- `scripts/upload_test_audio.sh` - Audio upload
- `scripts/generate_test_data.sh` - Test data generation
- `scripts/upload_session_simple.sh` - Simple upload
- `api/main.py` - API main application
- `api/routers/*.py` - API routes
- `pipeline/main.py` - Pipeline main application
- `README.md` - Documentation

## 🧪 Testing the Deployment

After deployment, test the pipeline:

```bash
# 1. Upload a test audio file
WEEK=$(date +'%G-W%V')
./scripts/upload_session_simple.sh test_audio.wav $WEEK session_001

# 2. Run the pipeline
./scripts/run_pipeline.sh $WEEK

# 3. Check the results
./scripts/check_results.sh $WEEK

# 4. Download the report
gsutil cp gs://pz-reports-build-unicorn25par-4813/$WEEK/weekly_report.html .
open weekly_report.html
```

## 📊 Monitoring

View logs for the pipeline:

```bash
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=pz-weekly-pipeline" \
  --limit 50 \
  --project=build-unicorn25par-4813
```

View API logs:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=pz-api" \
  --limit 50 \
  --project=build-unicorn25par-4813
```

## 🔒 Security

- All buckets use CMEK (Customer-Managed Encryption Keys)
- Service account has least-privilege access
- Uniform bucket-level access enabled
- 90-day lifecycle policy applied to all buckets

## 🛠️ Troubleshooting

### Authentication Issues
```bash
# Re-authenticate
gcloud auth login devstar4813@gcplab.me
gcloud config set project build-unicorn25par-4813
```

### API Quota Issues
If you encounter API quota errors:
```bash
# Check quota usage
gcloud logging read "protoPayload.status.code=8" --limit=10 --format=json
```

### Build Failures
If Docker builds fail:
```bash
# Check Cloud Build logs
gcloud builds list --project=build-unicorn25par-4813 --limit=5

# View specific build
gcloud builds log BUILD_ID --project=build-unicorn25par-4813
```

## 📞 Support

For issues or questions:
1. Check the logs in Cloud Logging
2. Review the [Architecture Documentation](../docs/ARCHITECTURE.md)
3. Verify all environment variables are set correctly

## ✅ Verification Checklist

After deployment, verify:

- [ ] All GCS buckets created
- [ ] KMS keyring and key created
- [ ] Service account exists with proper roles
- [ ] Cloud Run Job deployed
- [ ] API Service deployed and accessible
- [ ] Can upload audio files
- [ ] Pipeline executes successfully
- [ ] Reports generated correctly

## 🔄 Redeployment

To redeploy after code changes:

```bash
# Redeploy pipeline only
./scripts/deploy.sh

# Redeploy API only
./scripts/deploy_api.sh

# Full redeployment
./scripts/deploy_pizza_full.sh
```

## 📚 Additional Resources

- [API Documentation](../docs/API_GUIDE.md)
- [System Architecture](../docs/ARCHITECTURE.md)
- [User Guide](../docs/USER_GUIDE.md)

---

**Last Updated**: November 15, 2025
**Project**: Pizza Pipeline
**Version**: 1.0.0
