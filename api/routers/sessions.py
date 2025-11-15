"""
Sessions Routes
Listing et lecture des sessions et semaines
"""

from fastapi import APIRouter, HTTPException
from google.cloud import storage
import json
import os

router = APIRouter()

BUCKET_ANALYTICS = os.environ.get("BUCKET_ANALYTICS", "pz-analytics-build-unicorn25par-4813")


@router.get("/weeks")
async def list_weeks():
    """
    **Liste toutes les semaines disponibles**
    
    """
    Scanne le bucket `pz-analytics` pour trouver tous les préfixes de semaines.
    Retourne une liste triée ["2025-W41", "2025-W42", ...].
    
    **Exemple de réponse:**
    ```json
    {
      "weeks": [
        "2025-W42",
        "2025-W41",
        "2025-W40"
      ],
      "total": 3
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    // Afficher un sélecteur de semaines
    const { data } = useQuery({
      queryKey: ['weeks'],
      queryFn: () => fetch('/v1/weeks').then(r => r.json())
    });
    
    return (
      <Select>
        {data?.weeks.map(week => (
          <SelectItem key={week} value={week}>{week}</SelectItem>
        ))}
      </Select>
    );
    ```
    """
    storage_client = storage.Client()
    bucket = storage_client.bucket(BUCKET_ANALYTICS)
    
    # List all blobs and extract unique week prefixes
    blobs = bucket.list_blobs()
    weeks = set()
    
    for blob in blobs:
        # Extract week from path: "2025-W42/session_001/transcript.json" → "2025-W42"
        parts = blob.name.split("/")
        if len(parts) > 0 and parts[0].startswith("20"):  # Basic year check
            weeks.add(parts[0])
    
    # Sort in reverse chronological order
    weeks_sorted = sorted(list(weeks), reverse=True)
    
    return {
        "weeks": weeks_sorted,
        "total": len(weeks_sorted),
    }


@router.get("/weeks/{week}/sessions")
async def list_sessions(week: str):
    """
    **Liste toutes les sessions d'une semaine**
    
        """
    Retourne les `session_id` trouvés sous `pz-analytics/{week}/`.
    Format attendu : `pz-analytics/{week}/{session_id}/transcript.json`, etc.
    
    **Exemple de réponse:**
    ```json
    {
      "week": "2025-W42",
      "sessions": [
        {
          "session_id": "session_001",
          "artifacts": {
            "transcript": true,
            "prosody": true,
            "nlu": true
          }
        },
        {
          "session_id": "session_002",
          "artifacts": {
            "transcript": true,
            "prosody": false,
            "nlu": true
          }
        }
      ],
      "total": 2
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    // Afficher une liste de sessions avec leur statut
    const { data } = useQuery({
      queryKey: ['sessions', week],
      queryFn: () => fetch(`/v1/weeks/${week}/sessions`).then(r => r.json())
    });
    
    return (
      <ul>
        {data?.sessions.map(session => (
          <li key={session.session_id}>
            {session.session_id}
            {session.artifacts.transcript && <Badge>✓ Transcript</Badge>}
            {session.artifacts.prosody && <Badge>✓ Prosody</Badge>}
            {session.artifacts.nlu && <Badge>✓ NLU</Badge>}
          </li>
        ))}
      </ul>
    );
    ```
    """
    storage_client = storage.Client()
    bucket = storage_client.bucket(BUCKET_ANALYTICS)
    
    # List all blobs under week prefix
    prefix = f"{week}/"
    blobs = bucket.list_blobs(prefix=prefix)
    
    # Extract session IDs and check which artifacts exist
    sessions_dict = {}
    
    for blob in blobs:
        # Path format: "2025-W42/session_001/transcript.json"
        parts = blob.name.split("/")
        if len(parts) >= 3:
            session_id = parts[1]
            artifact_name = parts[2].replace(".json", "")
            
            if session_id not in sessions_dict:
                # Try to extract timestamp from session_id if it's numeric
                created_at = None
                if session_id.startswith("session_") and session_id[8:].isdigit():
                    # session_1761642607604 → timestamp in milliseconds
                    try:
                        from datetime import datetime
                        timestamp_ms = int(session_id[8:])
                        created_at = datetime.fromtimestamp(timestamp_ms / 1000).isoformat() + "Z"
                    except (ValueError, OSError):
                        pass
                
                # Fallback: use blob creation time
                if not created_at:
                    created_at = blob.time_created.isoformat() if blob.time_created else None
                
                sessions_dict[session_id] = {
                    "session_id": session_id,
                    "created_at": created_at,
                    "artifacts": {
                        "transcript": False,
                        "prosody": False,
                        "nlu": False,
                    }
                }
            
            # Mark artifact as present
            if artifact_name == "transcript":
                sessions_dict[session_id]["artifacts"]["transcript"] = True
            elif artifact_name == "prosody_features":
                sessions_dict[session_id]["artifacts"]["prosody"] = True
            elif artifact_name == "events_emotions":
                sessions_dict[session_id]["artifacts"]["nlu"] = True
    
    sessions = sorted(list(sessions_dict.values()), key=lambda x: x["session_id"])
    
    return {
        "week": week,
        "sessions": sessions,
        "total": len(sessions),
    }


@router.get("/weeks/{week}/sessions/{session_id}")
async def get_session(week: str, session_id: str):
    """
    **Récupère toutes les données d'une session**
    
    Agrège transcript + prosody + events/emotions en une seule réponse.
    
    **Exemple de réponse:**
    ```json
    {
      "week": "2025-W42",
      "session_id": "session_001",
      "transcript": {
        "transcript": "Aujourd'hui j'ai eu une journée difficile...",
        "words": [...],
        "audio_uri": "gs://..."
      },
      "prosody": {
        "pitch_mean": 180.5,
        "energy_mean": 0.045,
        "pause_count": 12,
        "duration_sec": 120.5
      },
      "nlu": {
        "events": ["Réunion difficile", "Dispute avec collègue"],
        "emotions": [
          {"label": "stress", "confidence": 0.85},
          {"label": "frustration", "confidence": 0.72}
        ],
        "themes": ["travail", "relations", "fatigue"]
      }
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    // Page de détail d'une session
    const { data: session } = useQuery({
      queryKey: ['session', week, sessionId],
      queryFn: () => fetch(`/v1/weeks/${week}/sessions/${sessionId}`).then(r => r.json())
    });
    
    return (
      <div>
        <h2>Session {session.session_id}</h2>
        <Transcript text={session.transcript.transcript} />
        <ProsodyChart data={session.prosody} />
        <EmotionsList emotions={session.nlu.emotions} />
        <EventsTimeline events={session.nlu.events} />
      </div>
    );
    ```
    """
    storage_client = storage.Client()
    bucket = storage_client.bucket(BUCKET_ANALYTICS)
    
    # Helper to download and parse JSON
    def get_json(path: str):
        blob = bucket.blob(path)
        if not blob.exists():
            return None
        return json.loads(blob.download_as_text())
    
    # Fetch all artifacts
    base_path = f"{week}/{session_id}"
    transcript = get_json(f"{base_path}/transcript.json")
    prosody = get_json(f"{base_path}/prosody_features.json")
    nlu = get_json(f"{base_path}/events_emotions.json")
    
    # Check if at least one artifact exists
    if not any([transcript, prosody, nlu]):
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found for week {week}"
        )
    
    return {
        "week": week,
        "session_id": session_id,
        "transcript": transcript,
        "prosody": prosody,
        "nlu": nlu,
    }


@router.delete("/weeks/{week}")
async def delete_week(week: str):
    """
    **Supprime toutes les données d'une semaine**
    
    Supprime tous les fichiers audio, transcripts, prosody et NLU d'une semaine.
    Cette action est irréversible.
    
    **Exemple de réponse:**
    ```json
    {
      "week": "2025-W42",
      "deleted": 15,
      "message": "Week 2025-W42 purged successfully"
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    const purgeWeek = useMutation({
      mutationFn: (week: string) => 
        fetch(`/v1/weeks/${week}`, { method: 'DELETE' }).then(r => r.json()),
      onSuccess: (data) => {
        toast.success(`${data.deleted} fichiers supprimés`);
        queryClient.invalidateQueries(['weeks']);
      }
    });
    ```
    """
    storage_client = storage.Client()
    
    # Delete from analytics bucket
    bucket_analytics = storage_client.bucket(BUCKET_ANALYTICS)
    prefix_analytics = f"{week}/"
    blobs_analytics = list(bucket_analytics.list_blobs(prefix=prefix_analytics))
    
    deleted_count = 0
    for blob in blobs_analytics:
        blob.delete()
        deleted_count += 1
    
    # Delete from raw audio bucket
    BUCKET_RAW = os.environ.get("BUCKET_RAW", "pz-audio-raw-build-unicorn25par-4813")
    bucket_raw = storage_client.bucket(BUCKET_RAW)
    prefix_raw = f"{week}/"
    blobs_raw = list(bucket_raw.list_blobs(prefix=prefix_raw))
    
    for blob in blobs_raw:
        blob.delete()
        deleted_count += 1
    
    # Delete from reports bucket
    BUCKET_REPORTS = os.environ.get("BUCKET_REPORTS", "pz-reports-build-unicorn25par-4813")
    bucket_reports = storage_client.bucket(BUCKET_REPORTS)
    prefix_reports = f"{week}/"
    blobs_reports = list(bucket_reports.list_blobs(prefix=prefix_reports))
    
    for blob in blobs_reports:
        blob.delete()
        deleted_count += 1
    
    return {
        "week": week,
        "deleted": deleted_count,
        "message": f"Week {week} purged successfully"
    }
