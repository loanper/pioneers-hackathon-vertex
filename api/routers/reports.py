"""
Reports Routes
Récupération des rapports hebdomadaires (JSON et PDF)
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from google.cloud import storage
from datetime import timedelta
import json
import os

router = APIRouter()

BUCKET_REPORTS = os.environ.get("BUCKET_REPORTS", "pz-reports-build-unicorn25par-4813")
BUCKET_ANALYTICS = os.environ.get("BUCKET_ANALYTICS", "pz-analytics-build-unicorn25par-4813")


@router.get("/weeks/{week}/report")
async def get_weekly_report(week: str):
    """
    **Récupère le rapport hebdomadaire (JSON)**
    
    Retourne le fichier `weekly_report.json` généré par le pipeline.
    
    **Exemple de réponse:**
    ```json
    {
      "week": "2025-W42",
      "user_tz": "Europe/Paris",
      "sessions": 5,
      "emotion_index": 68.5,
      "trend": "up",
      "highlights": [
        "Réunion importante réussie",
        "Sortie entre amis",
        "Problème résolu au travail"
      ],
      "prosody_summary": {
        "pitch_mean": 185.2,
        "energy_mean": 0.048,
        "pause_rate": 0.15
      }
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    // Dashboard hebdomadaire
    const { data: report } = useQuery({
      queryKey: ['report', week],
      queryFn: () => fetch(`/v1/weeks/${week}/report`).then(r => r.json())
    });
    
    return (
      <Card>
        <h2>Semaine {report.week}</h2>
        <EmotionGauge value={report.emotion_index} />
        <TrendIndicator trend={report.trend} />
        <HighlightsList items={report.highlights} />
        <ProsodyStats data={report.prosody_summary} />
      </Card>
    );
    ```
    """
    storage_client = storage.Client()
    
    # Try reports bucket first
    bucket = storage_client.bucket(BUCKET_REPORTS)
    blob = bucket.blob(f"{week}/weekly_report.json")
    
    # Fallback to analytics bucket
    if not blob.exists():
        bucket = storage_client.bucket(BUCKET_ANALYTICS)
        blob = bucket.blob(f"{week}/weekly_report.json")
    
    if not blob.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Report not found for week {week}. Run /v1/run-week first."
        )
    
    report_data = json.loads(blob.download_as_text())
    return report_data


@router.get("/weeks/{week}/report/pdf")
async def get_weekly_pdf(week: str):
    """
    **Télécharge le PDF du rapport hebdomadaire**
    
    Retourne le fichier PDF généré par WeasyPrint.
    
    **Cas d'usage frontend:**
    ```typescript
    // Bouton de téléchargement
    <Button
      onClick={() => {
        window.open(`/v1/weeks/${week}/report/pdf`, '_blank');
      }}
    >
      📄 Télécharger PDF
    </Button>
    ```
    """
    storage_client = storage.Client()
    bucket = storage_client.bucket(BUCKET_REPORTS)
    blob = bucket.blob(f"{week}/weekly_report.pdf")
    
    if not blob.exists():
        raise HTTPException(
            status_code=404,
            detail=f"PDF report not found for week {week}. Run /v1/run-week first."
        )
    
    pdf_bytes = blob.download_as_bytes()
    
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=mental_journal_{week}.pdf"
        }
    )


@router.get("/weeks/{week}/report/signed")
async def get_signed_pdf_url(week: str):
    """
    **Génère une URL signée pour le PDF**
    
    Pratique pour partager le PDF ou l'afficher dans un viewer externe.
    
    **Exemple de réponse:**
    ```json
    {
      "week": "2025-W42",
      "signed_url": "https://storage.googleapis.com/pz-reports-build-unicorn25par-4813/2025-W42/weekly_report.pdf?X-Goog-Algorithm=...",
      "expires_in_seconds": 3600
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    // Viewer de PDF intégré
    const { data } = useQuery({
      queryKey: ['pdf-url', week],
      queryFn: () => fetch(`/v1/weeks/${week}/report/signed`).then(r => r.json())
    });
    
    return (
      <iframe
        src={data.signed_url}
        width="100%"
        height="800px"
        title={`Rapport ${week}`}
      />
    );
    ```
    """
    storage_client = storage.Client()
    bucket = storage_client.bucket(BUCKET_REPORTS)
    blob = bucket.blob(f"{week}/weekly_report.pdf")
    
    if not blob.exists():
        raise HTTPException(
            status_code=404,
            detail=f"PDF report not found for week {week}"
        )
    
    # Generate signed URL valid for 1 hour
    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=1),
        method="GET",
    )
    
    return {
        "week": week,
        "signed_url": url,
        "expires_in_seconds": 3600,
    }


@router.get("/reports/history")
async def get_reports_history(limit: int = 10):
    """
    **Liste l'historique des rapports disponibles**
    
    **Exemple de réponse:**
    ```json
    {
      "reports": [
        {
          "week": "2025-W42",
          "json_url": "/v1/weeks/2025-W42/report",
          "pdf_url": "/v1/weeks/2025-W42/report/pdf",
          "has_pdf": true
        },
        {
          "week": "2025-W41",
          "json_url": "/v1/weeks/2025-W41/report",
          "pdf_url": "/v1/weeks/2025-W41/report/pdf",
          "has_pdf": true
        }
      ],
      "total": 2
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    // Liste d'historique avec navigation
    const { data } = useQuery({
      queryKey: ['reports-history'],
      queryFn: () => fetch('/v1/reports/history').then(r => r.json())
    });
    
    return (
      <div>
        <h2>Historique des rapports</h2>
        {data?.reports.map(report => (
          <Card key={report.week}>
            <Link href={`/dashboard/${report.week}`}>
              {report.week}
            </Link>
            {report.has_pdf && (
              <Button onClick={() => window.open(report.pdf_url)}>
                📄 PDF
              </Button>
            )}
          </Card>
        ))}
      </div>
    );
    ```
    """
    storage_client = storage.Client()
    bucket = storage_client.bucket(BUCKET_REPORTS)
    
    # List all blobs and extract weeks
    blobs = bucket.list_blobs()
    weeks = set()
    
    for blob in blobs:
        parts = blob.name.split("/")
        if len(parts) > 0 and parts[0].startswith("20"):
            weeks.add(parts[0])
    
    # Sort in reverse chronological order
    weeks_sorted = sorted(list(weeks), reverse=True)[:limit]
    
    # Check if PDF exists for each week
    reports = []
    for week in weeks_sorted:
        pdf_blob = bucket.blob(f"{week}/weekly_report.pdf")
        reports.append({
            "week": week,
            "json_url": f"/v1/weeks/{week}/report",
            "pdf_url": f"/v1/weeks/{week}/report/pdf",
            "has_pdf": pdf_blob.exists(),
        })
    
    return {
        "reports": reports,
        "total": len(reports),
    }


@router.get("/reports/trends")
async def get_trends(weeks: int = 4):
    """
    **Calcule les tendances sur plusieurs semaines**
    
    Agrège les indices émotionnels et le nombre de sessions sur N semaines.
    
    **Exemple de réponse:**
    ```json
    {
      "trends": [
        {
          "week": "2025-W42",
          "emotion_index": 68.5,
          "num_sessions": 5
        },
        {
          "week": "2025-W41",
          "emotion_index": 55.2,
          "num_sessions": 4
        },
        {
          "week": "2025-W40",
          "emotion_index": 72.1,
          "num_sessions": 6
        }
      ],
      "average_index": 65.3,
      "trend_direction": "up"
    }
    ```
    
    **Cas d'usage frontend:**
    ```typescript
    // Graphique de tendance
    const { data } = useQuery({
      queryKey: ['trends', weeks],
      queryFn: () => fetch(`/v1/reports/trends?weeks=${weeks}`).then(r => r.json())
    });
    
    return (
      <LineChart
        data={data.trends}
        xKey="week"
        yKey="emotion_index"
        trend={data.trend_direction}
      />
    );
    ```
    """
    storage_client = storage.Client()
    bucket = storage_client.bucket(BUCKET_ANALYTICS)
    
    # List all blobs and extract weeks
    blobs = bucket.list_blobs()
    weeks_set = set()
    
    for blob in blobs:
        parts = blob.name.split("/")
        if len(parts) > 0 and parts[0].startswith("20"):
            weeks_set.add(parts[0])
    
    # Sort and take last N weeks
    weeks_sorted = sorted(list(weeks_set), reverse=True)[:weeks]
    
    # Fetch weekly reports
    trends = []
    for week in weeks_sorted:
        blob = bucket.blob(f"{week}/weekly_report.json")
        if blob.exists():
            data = json.loads(blob.download_as_text())
            trends.append({
                "week": week,
                "emotion_index": data.get("emotion_index", 50),
                "num_sessions": data.get("sessions", 0),
            })
    
    # Calculate average and trend direction
    if trends:
        avg_index = sum(t["emotion_index"] for t in trends) / len(trends)
        
        # Compare first and last
        if len(trends) >= 2:
            if trends[0]["emotion_index"] > trends[-1]["emotion_index"] + 5:
                trend_direction = "up"
            elif trends[0]["emotion_index"] < trends[-1]["emotion_index"] - 5:
                trend_direction = "down"
            else:
                trend_direction = "flat"
        else:
            trend_direction = "flat"
    else:
        avg_index = 50
        trend_direction = "flat"
    
    return {
        "trends": trends,
        "average_index": round(avg_index, 1),
        "trend_direction": trend_direction,
    }
