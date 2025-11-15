"""
Health & Meta Routes
Endpoints pour vérifier l'état de l'API et obtenir la configuration
"""

from fastapi import APIRouter
import os
from datetime import datetime

router = APIRouter()

PROJECT_ID = os.environ.get("PROJECT_ID", "build-unicorn25par-4813")
REGION = os.environ.get("REGION", "europe-west1")
BUCKET_RAW = os.environ.get("BUCKET_RAW", "pz-audio-raw-build-unicorn25par-4813")
BUCKET_ANALYTICS = os.environ.get("BUCKET_ANALYTICS", "pz-analytics-build-unicorn25par-4813")
BUCKET_REPORTS = os.environ.get("BUCKET_REPORTS", "pz-reports-build-unicorn25par-4813")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash-exp")


@router.get("/health")
@router.get("/healthz")
async def healthz():
    """
    **Endpoint de santé simple**
    
    Disponible sur `/health` et `/healthz`
    
    Utilisé par:
    - Load balancer Cloud Run
    - Monitoring uptime
    - Scripts de déploiement
    
    **Exemple de réponse:**
    ```json
    {
      "status": "healthy",
      "timestamp": "2025-10-22T10:30:00Z",
      "service": "pizza-api"
    }
    ```
    """
    return {
        "status": "healthy",
        "service": "pizza-api",
    }
@router.get("/config")
async def get_config():
    """
    **Renvoie la configuration du projet**
    
    Utilisé par le frontend pour:
    - Afficher le contexte (projet, région)
    - Connaître les buckets disponibles
    - Afficher le modèle Gemini utilisé
    
    **Exemple de réponse:**
    ```json
    {
      "project_id": "build-unicorn25par-4813",
      "region": "europe-west1",
      "buckets": {
        "raw": "pz-audio-raw-build-unicorn25par-4813",
        "analytics": "pz-analytics-build-unicorn25par-4813",
        "reports": "pz-reports-build-unicorn25par-4813"
      },
      "gemini_model": "gemini-2.0-flash-exp"
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    const { data: config } = useQuery({
      queryKey: ['config'],
      queryFn: () => fetch('/config').then(r => r.json())
    });
    
    // Afficher dans un composant Settings
    <p>Projet: {config.project_id}</p>
    <p>Modèle: {config.gemini_model}</p>
    ```
    """
    return {
        "project_id": PROJECT_ID,
        "region": REGION,
        "buckets": {
            "raw": BUCKET_RAW,
            "analytics": BUCKET_ANALYTICS,
            "reports": BUCKET_REPORTS,
        },
        "gemini_model": GEMINI_MODEL,
        "location": os.environ.get("GOOGLE_CLOUD_LOCATION", "global"),
    }
