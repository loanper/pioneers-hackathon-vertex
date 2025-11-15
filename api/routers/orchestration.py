"""
Orchestration Routes
Déclenchement du pipeline hebdomadaire et par session
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from google.cloud import run_v2, logging as cloud_logging
import os
import json

router = APIRouter()

from datetime import datetime, timezone

PROJECT_ID = os.environ.get("PROJECT_ID", "build-unicorn25par-4813")
REGION = os.environ.get("REGION", "europe-west1")
JOB_NAME = f"projects/{PROJECT_ID}/locations/{REGION}/jobs/pz-weekly-pipeline"


class RunWeekRequest(BaseModel):
    """Request pour exécuter la fusion hebdomadaire"""
    week: str


class RunWeekResponse(BaseModel):
    """Response après déclenchement du pipeline"""
    message: str
    week: str
    execution_id: str | None = None
    status: str


@router.post("/run-week", response_model=RunWeekResponse)
async def run_week(request: RunWeekRequest):
    """
    **Exécute la fusion hebdomadaire**
    
    Déclenche le Cloud Run Job `pz-weekly-pipeline` pour:
    1. Lister toutes les sessions de la semaine
    2. Calculer l'index émotionnel
    3. Générer le rapport HTML/PDF
    
    **N'exécute PAS** le traitement des sessions individuelles (STT/Prosody/NLU).
    Pour ça, utilise `/v1/ingest/finish` par session.
    
    **Exemple de requête:**
    ```json
    {
      "week": "2025-W42"
    }
    ```
    
    **Exemple de réponse:**
    ```json
    {
      "message": "Pipeline démarré pour la semaine 2025-W42",
      "week": "2025-W42",
      "execution_id": "projects/.../locations/.../jobs/.../executions/...",
      "status": "running"
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    // Bouton "Générer le rapport hebdomadaire"
    const runWeekMutation = useMutation({
      mutationFn: async (week: string) => {
        const response = await fetch('/v1/run-week', {
          method: 'POST',
          body: JSON.stringify({ week })
        });
        return response.json();
      },
      onSuccess: (data) => {
        toast.success(`Pipeline démarré pour ${data.week}`);
        // Polling pour vérifier la complétion
        pollExecutionStatus(data.execution_id);
      }
    });
    ```
    
    **Note de production:**
    Cette route déclenche un Cloud Run Job qui peut prendre **2-5 minutes**.
    Le frontend devrait:
    - Afficher un spinner/loader
    - Faire du polling sur `/v1/pipeline/status/{execution_id}`
    - Invalider le cache TanStack Query quand terminé
    """
    try:
        client = run_v2.JobsClient()
        
        # Run the Cloud Run Job with week argument
        operation = client.run_job(
            name=JOB_NAME,
            overrides=run_v2.RunJobRequest.Overrides(
                container_overrides=[
                    run_v2.RunJobRequest.Overrides.ContainerOverride(
                        args=[request.week]
                    )
                ]
            )
        )
        
        # Extract execution name from operation
        execution_id = operation.name if hasattr(operation, 'name') else None
        
        return RunWeekResponse(
            message=f"Pipeline démarré pour la semaine {request.week}",
            week=request.week,
            execution_id=execution_id,
            status="running",
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start pipeline: {str(e)}"
        )


class RunSessionRequest(BaseModel):
    """Request pour retraiter une session"""
    week: str
    session_id: str


@router.post("/run-session")
async def run_session(request: RunSessionRequest):
    """
    **Retraite une session spécifique**
    
    Utile pour:
    - Re-run après échec
    - Re-traiter avec un nouveau modèle Gemini
    - Corriger des erreurs de traitement
    
    **Exemple de requête:**
    ```json
    {
      "week": "2025-W42",
      "session_id": "session_001"
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    // Bouton "Retraiter" sur une session
    <Button
      onClick={() => {
        runSessionMutation.mutate({
          week: '2025-W42',
          session_id: 'session_001'
        });
      }}
    >
      🔄 Retraiter
    </Button>
    ```
    
    **Note:** Cette route appelle `/v1/ingest/finish` en interne.
    C'est un alias pour plus de clarté sémantique.
    """
    # Import the ingest_finish function
    from api.routers.upload import ingest_finish, IngestFinishRequest
    
    # Call ingest_finish
    return await ingest_finish(IngestFinishRequest(
        week=request.week,
        session_id=request.session_id
    ))


class ExecutionStatusResponse(BaseModel):
    """Response avec le statut d'une exécution Cloud Run Job"""
    execution_id: str
    status: str
    started_at: str | None = None
    completed_at: str | None = None
    exit_code: int | None = None


@router.get("/pipeline/status/{execution_id}", response_model=ExecutionStatusResponse)
async def get_execution_status(execution_id: str):
    """
    **Récupère le statut d'une exécution de pipeline**
    
    Utilisé pour faire du polling après avoir déclenché `/v1/run-week`.
    
    **Exemple de réponse (en cours):**
    ```json
    {
      "execution_id": "projects/.../executions/...",
      "status": "RUNNING",
      "started_at": "2025-10-22T10:30:00Z",
      "completed_at": null,
      "exit_code": null
    }
    ```
    
    **Exemple de réponse (terminé):**
    ```json
    {
      "execution_id": "projects/.../executions/...",
      "status": "SUCCEEDED",
      "started_at": "2025-10-22T10:30:00Z",
      "completed_at": "2025-10-22T10:32:15Z",
      "exit_code": 0
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    // Polling toutes les 5 secondes
    const { data } = useQuery({
      queryKey: ['execution-status', executionId],
      queryFn: () => fetch(`/v1/pipeline/status/${executionId}`).then(r => r.json()),
      refetchInterval: (data) => {
        // Arrêter le polling quand terminé
        if (data?.status === 'SUCCEEDED' || data?.status === 'FAILED') {
          return false;
        }
        return 5000; // 5 secondes
      }
    });
    
    if (data?.status === 'RUNNING') {
      return <Spinner>Génération du rapport en cours...</Spinner>;
    }
    ```
    """
    try:
        client = run_v2.ExecutionsClient()
        execution = client.get_execution(name=execution_id)
        
        # Extract status
        status = "UNKNOWN"
        if execution.succeeded_count > 0:
            status = "SUCCEEDED"
        elif execution.failed_count > 0:
            status = "FAILED"
        elif execution.running_count > 0:
            status = "RUNNING"
        
        return ExecutionStatusResponse(
            execution_id=execution_id,
            status=status,
            started_at=execution.start_time.isoformat() if execution.start_time else None,
            completed_at=execution.completion_time.isoformat() if execution.completion_time else None,
            exit_code=execution.task_count if hasattr(execution, 'task_count') else None,
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=f"Execution not found: {str(e)}"
        )


class PipelineLogsRequest(BaseModel):
    """Request pour récupérer les logs"""
    week: str | None = None
    limit: int = 50


@router.post("/pipeline/logs")
async def get_pipeline_logs(request: PipelineLogsRequest):
    """
    **Récupère les logs du pipeline**
    
    Filtre par semaine si spécifié, sinon retourne les derniers logs.
    
    **Exemple de requête:**
    ```json
    {
      "week": "2025-W42",
      "limit": 50
    }
    ```
    
    **Exemple de réponse:**
    ```json
    {
      "logs": [
        {
          "timestamp": "2025-10-22T10:30:15Z",
          "severity": "INFO",
          "message": "🚀 Starting Mental Journal Pipeline for week: 2025-W42"
        },
        {
          "timestamp": "2025-10-22T10:30:20Z",
          "severity": "INFO",
          "message": "🎵 Found 5 audio files under 2025-W42/"
        }
      ],
      "total": 2
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    // Console de logs en temps réel
    const { data } = useQuery({
      queryKey: ['pipeline-logs', week],
      queryFn: () => fetch('/v1/pipeline/logs', {
        method: 'POST',
        body: JSON.stringify({ week, limit: 100 })
      }).then(r => r.json()),
      refetchInterval: 3000 // Refresh toutes les 3 secondes
    });
    
    return (
      <pre className="bg-black text-green-400 p-4 rounded overflow-auto">
        {data?.logs.map((log, i) => (
          <div key={i}>
            [{log.timestamp}] {log.severity}: {log.message}
          </div>
        ))}
      </pre>
    );
    ```
    """
    logging_client = cloud_logging.Client()
    
    # Build filter
    filter_parts = [
        'resource.type="cloud_run_job"',
        'resource.labels.job_name="pz-weekly-pipeline"',
    ]
    
    if request.week:
        filter_parts.append(f'textPayload=~"{request.week}"')
    
    filter_str = " AND ".join(filter_parts)
    
    # Fetch logs
    entries = logging_client.list_entries(
        filter_=filter_str,
        max_results=request.limit,
        order_by=cloud_logging.DESCENDING,
    )
    
    logs = []
    for entry in entries:
        logs.append({
            "timestamp": entry.timestamp.isoformat() if entry.timestamp else None,
            "severity": entry.severity,
            "message": entry.payload if isinstance(entry.payload, str) else str(entry.payload),
        })
    
    return {
        "logs": logs,
        "total": len(logs),
    }
