# Known Issue: Signed URL Generation on Cloud Run

## 🐛 Problem

When trying to use the `/v1/sign-upload` API endpoint, you may encounter:

```
AttributeError: you need a private key to sign credentials.
the credentials you are currently using <class 'google.auth.compute_engine.credentials.Credentials'> 
just contains a token.
```

**Root Cause:**
- Cloud Run services use **Compute Engine default credentials** (token-based)
- These credentials **don't include a private key** needed for signing URLs
- The `blob.generate_signed_url()` method requires either:
  - A service account **JSON key file** with private key, OR
  - IAM `signBlob` API permission to sign on behalf of the service account

## ✅ Solutions

### Solution 1: Use Direct GCS Upload (Recommended)

The **`upload_session_simple.sh`** script bypasses signed URLs entirely:

```bash
./scripts/upload_session_simple.sh my_audio.wav 2025-W44 session_001
```

**How it works:**
1. Uses `gsutil cp` to upload directly to GCS bucket
2. Then calls `/v1/ingest/finish` to trigger processing
3. No signed URLs needed!

**Pros:**
- ✅ Simple and reliable
- ✅ No credential configuration needed
- ✅ Works with default Cloud Run setup
- ✅ Faster (one less API call)

**Cons:**
- ⚠️ Requires `gsutil` CLI installed locally
- ⚠️ User must have GCS write permissions

### Solution 2: Fix API to Use IAM signBlob

Update the API code to use IAM's `signBlob` API instead of direct signing:

```python
from google.auth import compute_engine
from google.auth.transport import requests as auth_requests
import google.auth

# Get credentials
credentials, project = google.auth.default()
auth_request = auth_requests.Request()
credentials.refresh(auth_request)

# Generate signed URL using IAM signBlob
upload_url = blob.generate_signed_url(
    version="v4",
    expiration=datetime.timedelta(hours=1),
    method="PUT",
    content_type=request.content_type,
    credentials=credentials  # Uses IAM signBlob internally
)
```

**Requirements:**
- Cloud Run service account needs **`iam.serviceAccounts.signBlob`** permission
- Add IAM binding:
  ```bash
  gcloud projects add-iam-policy-binding mental-journal-dev \
    --member="serviceAccount:34701717619-compute@developer.gserviceaccount.com" \
    --role="roles/iam.serviceAccountTokenCreator"
  ```

### Solution 3: Use Service Account Key (Not Recommended)

Create and use a service account key file:

```bash
# Create key
gcloud iam service-accounts keys create key.json \
  --iam-account=mj-api-sa@mental-journal-dev.iam.gserviceaccount.com

# Set in Cloud Run
gcloud run services update mj-api \
  --set-env-vars GOOGLE_APPLICATION_CREDENTIALS=/secrets/key.json \
  --region europe-west1
```

**Pros:**
- ✅ Works immediately
- ✅ No IAM permission changes needed

**Cons:**
- ❌ **Security risk**: Private key in container
- ❌ Key rotation complexity
- ❌ Not recommended by Google Cloud

## 📝 Current Workaround

Use **`upload_session_simple.sh`** for all uploads:

```bash
# Instead of the 3-step API workflow:
# ❌ ./scripts/upload_session.sh audio.wav 2025-W44 session_001

# Use direct GCS upload:
# ✅ ./scripts/upload_session_simple.sh audio.wav 2025-W44 session_001
```

This is the **recommended approach** until the API is fixed with Solution 2.

## 🔍 Debugging

Check API logs for signed URL errors:

```bash
gcloud run services logs read mj-api \
  --region=europe-west1 \
  --project=mental-journal-dev \
  --limit=50
```

Verify service account being used:

```bash
gcloud run services describe mj-api \
  --region=europe-west1 \
  --project=mental-journal-dev \
  --format='value(spec.template.spec.serviceAccountName)'
```

## 📚 References

- [Google Cloud Storage Signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Cloud Run Authentication](https://cloud.google.com/run/docs/authenticating/service-to-service)
- [IAM signBlob Permission](https://cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/signBlob)
