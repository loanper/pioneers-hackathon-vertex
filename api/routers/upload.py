"""
Upload Routes
Génération d'URLs signées pour upload direct vers GCS
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.cloud import storage
import google.auth
from google.auth import compute_engine, iam
from google.auth.transport import requests as google_requests
from datetime import timedelta, datetime
import os
import base64
import hashlib
from urllib.parse import quote

router = APIRouter()

BUCKET_RAW = os.environ.get("BUCKET_RAW", "mj-audio-raw-mental-journal-dev")


class SignUploadRequest(BaseModel):
    """Request body pour générer une URL signée"""
    week: str  # Format: "2025-W42"
    session_id: str  # Format: "session_001" ou timestamp
    content_type: str = "audio/wav"  # MIME type de l'audio


class SignUploadResponse(BaseModel):
    """Response avec l'URL signée et le chemin de l'objet"""
    upload_url: str
    object_path: str
    bucket: str
    expires_in_seconds: int


@router.post("/sign-upload", response_model=SignUploadResponse)
async def sign_upload(request: SignUploadRequest):
    """
    **Génère une URL signée pour upload direct GCS**
    
    Permet au frontend d'uploader des fichiers audio **directement vers GCS**
    sans transiter par l'API (évite timeout + charge serveur).
    
    **Flow complet:**
    1. Frontend appelle cette route avec week + session_id
    2. API génère une URL signée valide 1h
    3. Frontend fait un PUT sur l'URL avec le fichier audio
    4. Frontend appelle `/v1/ingest/finish` pour déclencher le traitement
    
    **Exemple de requête:**
    ```json
    {
      "week": "2025-W42",
      "session_id": "session_001",
      "content_type": "audio/wav"
    }
    ```
    
    **Exemple de réponse:**
    ```json
    {
      "upload_url": "https://storage.googleapis.com/mj-audio-raw-mental-journal-dev/2025-W42/session_001.wav?X-Goog-Algorithm=...",
      "object_path": "2025-W42/session_001.wav",
      "bucket": "mj-audio-raw-mental-journal-dev",
      "expires_in_seconds": 3600
    }
    ```
    
    **Cas d'usage frontend (React/Next.js):**
    ```typescript
    // 1. Obtenir l'URL signée
    const { upload_url, object_path } = await fetch('/v1/sign-upload', {
      method: 'POST',
      body: JSON.stringify({
        week: '2025-W42',
        session_id: 'session_001',
        content_type: 'audio/wav'
      })
    }).then(r => r.json());
    
    // 2. Upload direct vers GCS
    await fetch(upload_url, {
      method: 'PUT',
      body: audioFile,
      headers: { 'Content-Type': 'audio/wav' }
    });
    
    // 3. Déclencher le traitement
    await fetch('/v1/ingest/finish', {
      method: 'POST',
      body: JSON.stringify({
        week: '2025-W42',
        session_id: 'session_001'
      })
    });
    ```
    
    **Avantages:**
    - ✅ Pas de timeout API (fichiers lourds)
    - ✅ Upload parallèle possible (plusieurs sessions)
    - ✅ Bande passante économisée sur l'API
    - ✅ Validation côté client avant upload
    """
    # Validate week format (basic check)
    if not request.week or len(request.week.split("-")) != 2:
        raise HTTPException(
            status_code=400,
            detail="Invalid week format. Expected format: YYYY-Www (e.g., 2025-W42)"
        )
    
    # Generate object path
    # Format: <week>/<session_id>.wav
    file_extension = request.content_type.split("/")[-1]
    object_path = f"{request.week}/{request.session_id}.{file_extension}"
    
    try:
        # Get credentials
        credentials, project = google.auth.default()
        
        # For Compute Engine credentials (Cloud Run), manually build signed URL using IAM API
        if isinstance(credentials, compute_engine.Credentials):
            # Get the actual service account email from metadata server
            import requests
            from collections import OrderedDict
            
            metadata_url = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email"
            metadata_headers = {"Metadata-Flavor": "Google"}
            response = requests.get(metadata_url, headers=metadata_headers)
            service_account_email = response.text.strip()
            
            # Build the canonical request for signed URL v4 (follow exact GCS spec)
            now = datetime.utcnow()
            
            # Timestamps
            timestamp = now.strftime("%Y%m%dT%H%M%SZ")
            datestamp = now.strftime("%Y%m%d")
            credential_scope = f"{datestamp}/auto/storage/goog4_request"
            
            # Path: encode object name but preserve slashes in path structure
            escaped_object_path = quote(object_path.encode('utf-8'), safe="/~")
            canonical_uri = f"/{BUCKET_RAW}/{escaped_object_path}"
            
            # Headers: use lowercase, sort by name
            headers = OrderedDict(sorted({
                "content-type": request.content_type.lower(),
                "host": "storage.googleapis.com",
            }.items()))
            
            canonical_headers = "".join(f"{k}:{v}\n" for k, v in headers.items())
            signed_headers = ";".join(headers.keys())
            
            # Query parameters: RAW values (NOT pre-encoded)
            # Will be encoded once during canonical_qs construction
            query_params = {
                "X-Goog-Algorithm": "GOOG4-RSA-SHA256",
                "X-Goog-Credential": f"{service_account_email}/{credential_scope}",  # RAW (contains /)
                "X-Goog-Date": timestamp,
                "X-Goog-Expires": "3600",
                "X-Goog-SignedHeaders": signed_headers,
            }
            
            # Build canonical query string: encode each key=value pair ONCE
            # This exact string will be reused in the final URL
            ordered_params = OrderedDict(sorted(query_params.items()))
            canonical_query_string = "&".join(
                f"{quote(str(k), safe='')}"      # Encode key
                f"={quote(str(v), safe='')}"     # Encode value (/ becomes %2F)
                for k, v in ordered_params.items()
            )
            
            # Canonical request (newline-separated components)
            canonical_request = "\n".join([
                "PUT",
                canonical_uri,
                canonical_query_string,
                canonical_headers,
                signed_headers,
                "UNSIGNED-PAYLOAD",
            ])
            
            # String to sign
            canonical_request_hash = hashlib.sha256(canonical_request.encode()).hexdigest()
            string_to_sign = f"GOOG4-RSA-SHA256\n{timestamp}\n{credential_scope}\n{canonical_request_hash}"
            
            # Sign with IAM API
            from google.cloud import iam_credentials_v1
            
            iam_client = iam_credentials_v1.IAMCredentialsClient(credentials=credentials)
            service_account_path = f"projects/-/serviceAccounts/{service_account_email}"
            
            sign_response = iam_client.sign_blob(
                name=service_account_path,
                payload=string_to_sign.encode()
            )
            
            # Signature is returned as bytes, convert to hex string
            signature_hex = sign_response.signed_blob.hex()
            
            # Build final URL: REUSE canonical_query_string exactly as-is
            url = f"https://storage.googleapis.com{canonical_uri}?{canonical_query_string}&X-Goog-Signature={signature_hex}"
            
        else:
            # For service account credentials with private key
            storage_client = storage.Client()
            bucket = storage_client.bucket(BUCKET_RAW)
            blob = bucket.blob(object_path)
            
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(hours=1),
                method="PUT",
                content_type=request.content_type,
            )
        
        return SignUploadResponse(
            upload_url=url,
            object_path=object_path,
            bucket=BUCKET_RAW,
            expires_in_seconds=3600,
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate signed URL: {str(e)}"
        )


class IngestFinishRequest(BaseModel):
    """Request body pour déclencher le traitement d'une session"""
    week: str
    session_id: str


class IngestFinishResponse(BaseModel):
    """Response avec les chemins des artefacts créés"""
    session_id: str
    week: str
    artifacts: dict


@router.post("/ingest/finish", response_model=IngestFinishResponse)
async def ingest_finish(request: IngestFinishRequest):
    """
    **Traite une session audio après upload**
    
    Exécute le pipeline complet pour UNE session:
    1. **STT** (Speech-to-Text v2) → transcript.json
    2. **Prosody Analysis** (librosa) → prosody_features.json
    3. **NLU** (Gemini) → events_emotions.json
    
    **Exemple de requête:**
    ```json
    {
      "week": "2025-W42",
      "session_id": "session_001"
    }
    ```
    
    **Exemple de réponse:**
    ```json
    {
      "session_id": "session_001",
      "week": "2025-W42",
      "artifacts": {
        "transcript": "gs://pz-analytics-build-unicorn25par-4813/2025-W42/session_001/transcript.json",
        "prosody": "gs://pz-analytics-build-unicorn25par-4813/2025-W42/session_001/prosody_features.json",
        "nlu": "gs://pz-analytics-build-unicorn25par-4813/2025-W42/session_001/events_emotions.json",
        "audio_uri": "gs://pz-audio-raw-build-unicorn25par-4813/2025-W42/session_001.wav"
      }
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    const processMutation = useMutation({
      mutationFn: async ({ week, session_id }) => {
        const response = await fetch('/v1/ingest/finish', {
          method: 'POST',
          body: JSON.stringify({ week, session_id })
        });
        return response.json();
      },
      onSuccess: (data) => {
        toast.success(`Session ${data.session_id} traitée !`);
        queryClient.invalidateQueries(['sessions', data.week]);
      }
    });
    ```
    
    **Note de production:**
    Cette route peut prendre **30-120 secondes** (STT + Gemini).
    En prod, préfère:
    - Cloud Tasks (async) + webhook de callback
    - Polling sur `/v1/sessions/{week}/{session_id}` pour vérifier l'existence des artefacts
    """
    # Import pipeline functions
    import sys
    sys.path.append("/app")  # Adjust path for Cloud Run
    
    from pipeline.main import (
        stt_transcribe, download_to_tmp, extract_prosody,
        nlu_events_emotions, upload_json
    )
    
    BUCKET_ANALYTICS = os.environ.get("BUCKET_ANALYTICS", "mj-analytics-mental-journal-dev")
    
    # Construct audio URI
    audio_uri = f"gs://{BUCKET_RAW}/{request.week}/{request.session_id}.wav"
    
    # Verify audio exists
    storage_client = storage.Client()
    bucket = storage_client.bucket(BUCKET_RAW)
    blob = bucket.blob(f"{request.week}/{request.session_id}.wav")
    
    if not blob.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Audio file not found: {audio_uri}"
        )
    
    try:
        # 1. Speech-to-Text
        text, words = stt_transcribe(audio_uri)
        transcript_obj = {
            "session_id": request.session_id,
            "audio_uri": audio_uri,
            "language_code": "fr-FR",
            "transcript": text,
            "words": words,
        }
        transcript_path = f"{request.week}/{request.session_id}/transcript.json"
        upload_json(BUCKET_ANALYTICS, transcript_path, transcript_obj)
        
        # 2. Prosody Analysis
        local_audio = download_to_tmp(audio_uri)
        prosody = extract_prosody(local_audio)
        prosody["session_id"] = request.session_id
        prosody_path = f"{request.week}/{request.session_id}/prosody_features.json"
        upload_json(BUCKET_ANALYTICS, prosody_path, prosody)
        
        # 3. NLU - Events & Emotions
        nlu = nlu_events_emotions(text)
        nlu["session_id"] = request.session_id
        nlu_path = f"{request.week}/{request.session_id}/events_emotions.json"
        upload_json(BUCKET_ANALYTICS, nlu_path, nlu)
        
        return IngestFinishResponse(
            session_id=request.session_id,
            week=request.week,
            artifacts={
                "transcript": f"gs://{BUCKET_ANALYTICS}/{transcript_path}",
                "prosody": f"gs://{BUCKET_ANALYTICS}/{prosody_path}",
                "nlu": f"gs://{BUCKET_ANALYTICS}/{nlu_path}",
                "audio_uri": audio_uri,
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )
