# 🏗️ Architecture Technique

## Vue d'ensemble

```
┌─────────────────┐
│  Raspberry Pi   │  ◄── Capture vocale (futur)
│   (Microphone)  │
└────────┬────────┘
         │ Upload WAV/MP3
         ▼
┌─────────────────────────────────────────────────────────┐
│                     Google Cloud                         │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Cloud Storage Buckets (CMEK encrypted)         │   │
│  │                                                  │   │
│  │  • mj-audio-raw          ◄── Fichiers source   │   │
│  │  • mj-audio-processed    ◄── Audio normalisé   │   │
│  │  • mj-analytics          ◄── JSON analytiques  │   │
│  │  • mj-reports            ◄── Rapports HTML/PDF │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│                          ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Cloud Run Job (Container)              │   │
│  │                                                  │   │
│  │  ┌────────────────────────────────────────┐    │   │
│  │  │  Pipeline Orchestrator (main.py)      │    │   │
│  │  │                                        │    │   │
│  │  │  1. STT (Speech-to-Text v2)          │    │   │
│  │  │     • Transcription                   │    │   │
│  │  │     • Word timestamps                 │    │   │
│  │  │     • Confidence scores               │    │   │
│  │  │                                        │    │   │
│  │  │  2. Prosody Analysis (librosa)        │    │   │
│  │  │     • Pitch (F0)                      │    │   │
│  │  │     • Energy (RMS)                    │    │   │
│  │  │     • Pauses detection                │    │   │
│  │  │                                        │    │   │
│  │  │  3. NLU (Gemini 1.5 Pro)             │    │   │
│  │  │     • Events extraction               │    │   │
│  │  │     • Emotions detection              │    │   │
│  │  │     • Themes identification           │    │   │
│  │  │                                        │    │   │
│  │  │  4. Fusion & Report Generation        │    │   │
│  │  │     • Emotion index (0-100)           │    │   │
│  │  │     • HTML/PDF reports                │    │   │
│  │  └────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│                          ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Vertex AI Services                     │   │
│  │                                                  │   │
│  │  • Speech-to-Text v2 API                        │   │
│  │  • Vertex AI Gemini API                         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Scheduling & Orchestration              │   │
│  │                                                  │   │
│  │  Cloud Scheduler ──► Workflows ──► Cloud Run   │   │
│  │  (Dimanche 23:55)                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │      Security & Monitoring                      │   │
│  │                                                  │   │
│  │  • Cloud KMS (CMEK encryption)                  │   │
│  │  • IAM (least privilege)                        │   │
│  │  • Cloud Logging                                │   │
│  │  • Cloud Audit Logs                             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Looker Studio  │  ◄── Visualisation (optionnel)
│  (via BigQuery) │
└─────────────────┘
```

## Flux de données

### 1. Ingestion (Upload)
```
Audio Files → gs://mj-audio-raw-{PROJECT_ID}/{WEEK}/session_*.wav
```

### 2. Processing Pipeline

#### Étape A : Speech-to-Text
```python
Audio → STT v2 API → {
  "transcript": "...",
  "words": [
    {"word": "bonjour", "start": 0.0, "end": 0.5, "confidence": 0.98}
  ]
}
```
Sortie: `gs://mj-analytics/{WEEK}/{SESSION}/transcript.json`

#### Étape B : Analyse Prosodique
```python
Audio → librosa → {
  "pitch_mean": 180.5,  # Hz
  "pitch_std": 25.3,
  "energy_mean": 0.045,
  "energy_std": 0.012,
  "pause_count": 15,
  "pause_total_sec": 8.5
}
```
Sortie: `gs://mj-analytics/{WEEK}/{SESSION}/prosody_features.json`

#### Étape C : NLU (Gemini)
```python
Transcript → Gemini → {
  "events": ["réunion difficile", "appel avec maman"],
  "emotions": [
    {"label": "stress", "confidence": 0.75},
    {"label": "espoir", "confidence": 0.45}
  ],
  "themes": ["travail", "famille", "santé"]
}
```
Sortie: `gs://mj-analytics/{WEEK}/{SESSION}/events_emotions.json`

#### Étape D : Fusion & Rapport
```python
All Sessions → Aggregation → {
  "emotion_index": 65.5,  # 0-100
  "trend": "up",
  "sessions": 12,
  "highlights": [...],
  "prosody_summary": {...}
}
```
Sorties:
- `gs://mj-analytics/{WEEK}/weekly_report.json`
- `gs://mj-reports/{WEEK}/weekly_report.html`
- `gs://mj-reports/{WEEK}/weekly_report.pdf`

## Architecture de sécurité

### Chiffrement
- **CMEK (Customer Managed Encryption Keys)**
  - Tous les buckets GCS utilisent KMS
  - Clé: `projects/{PROJECT}/locations/{REGION}/keyRings/mj-ring/cryptoKeys/mj-key`
  - Rotation automatique possible

### IAM (Moindre privilège)
```
pipeline-sa@{PROJECT}.iam.gserviceaccount.com
  ├── roles/run.admin           (Cloud Run)
  ├── roles/storage.admin       (GCS buckets)
  ├── roles/aiplatform.user     (Vertex AI)
  ├── roles/speech.admin        (STT)
  └── roles/logging.logWriter   (Logs)
```

### Lifecycle Policies
```json
{
  "rule": [
    {"action": {"type": "Delete"}, "condition": {"age": 90}}
  ]
}
```
- Suppression automatique après 90 jours
- Conformité RGPD

### Audit & Logging
- Cloud Audit Logs activé par défaut
- Logs d'accès GCS
- Logs d'exécution Cloud Run

## Technologies utilisées

### Backend
- **Python 3.11**: Langage principal
- **Cloud Run Jobs**: Orchestration batch
- **Cloud Workflows**: Déclenchement planifié

### APIs & Services
| Service | Usage |
|---------|-------|
| Speech-to-Text v2 | Transcription avec timestamps |
| Vertex AI Gemini | NLU, extraction d'émotions |
| Cloud Storage | Stockage fichiers |
| Cloud KMS | Chiffrement |
| Cloud Logging | Monitoring |
| Cloud Scheduler | Exécution hebdomadaire |

### Librairies Python
| Librairie | Usage |
|-----------|-------|
| `librosa` | Analyse audio (pitch, énergie) |
| `numpy` | Calculs numériques |
| `soundfile` | I/O audio |
| `jinja2` | Templating HTML |
| `weasyprint` | Génération PDF |
| `google-cloud-*` | SDKs GCP |

## Scalabilité

### Actuelle
- **1 Cloud Run Job** par semaine
- **Timeout**: 1 heure
- **Memory**: 2 GB (default)
- **CPU**: 1 vCPU (default)

### Future (si besoin)
- Paralléliser le traitement par session (Cloud Run avec --parallelism)
- Utiliser Batch API pour processing intensif
- Long-running operations pour STT (fichiers >10min)

## Monitoring

### Métriques clés
1. **Latence Pipeline**
   - Temps total par semaine
   - Temps par session

2. **Qualité STT**
   - Confidence scores moyens
   - Taux d'erreur

3. **Coûts**
   - API calls (STT, Gemini)
   - Storage (GCS)
   - Compute (Cloud Run)

### Logs
```bash
# Voir les logs
gcloud logging read "resource.type=cloud_run_job" --limit 100

# Filtrer par erreurs
gcloud logging read "severity>=ERROR" --limit 50
```

## Coûts estimés

### Par semaine (estimé)
- **Cloud Storage**: ~0.02€ (10 sessions × 5MB)
- **Speech-to-Text**: ~0.15€ (10 sessions × 2min)
- **Vertex AI (Gemini)**: ~0.10€ (10 sessions)
- **Cloud Run**: ~0.01€ (compute)
- **Total**: **~0.30€/semaine** soit **~1.20€/mois**

### Optimisations possibles
- Utiliser STT chirp (moins cher pour longue durée)
- Batch processing pour réduire les frais fixes
- Compression audio (FLAC → Opus)

## Évolutions futures

### Phase 2
- [ ] Intégration Raspberry Pi
- [ ] Détection de tendances (comparaison N vs N-1)
- [ ] Alertes (seuils critiques)
- [ ] UI Web pour consulter rapports

### Phase 3
- [ ] Diarization (séparation locuteurs)
- [ ] Analyse sentiment temps réel
- [ ] Recommandations personnalisées
- [ ] Export vers applications santé

### Phase 4
- [ ] Multi-utilisateurs
- [ ] ML custom pour détection patterns
- [ ] API REST pour intégrations
- [ ] Application mobile
