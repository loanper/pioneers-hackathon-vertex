# Mental Journal API 🎙️

API REST FastAPI pour l'application Mental Journal.

## 📋 Vue d'ensemble

Cette API fournit tous les endpoints nécessaires pour le frontend Next.js :
- Upload audio avec URLs signées GCS
- Traitement STT + Prosody + NLU par session
- Lecture des sessions et rapports hebdomadaires
- Orchestration du pipeline Cloud Run Job
- Monitoring et logs

## 🚀 Quick Start

### Développement local

```bash
# 1. Installer les dépendances
cd api
pip install -r requirements.txt

# 2. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec tes valeurs

# 3. Lancer le serveur
uvicorn api.main:app --reload --host 0.0.0.0 --port 8080
```

**Documentation interactive :**
- Swagger UI : http://localhost:8080/docs
- ReDoc : http://localhost:8080/redoc

### Déploiement Cloud Run

```bash
# Depuis la racine du projet
chmod +x scripts/deploy_api.sh
./scripts/deploy_api.sh
```

## 📡 Routes disponibles

### 🏥 Santé & Méta

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/healthz` | Health check (load balancer) |
| `GET` | `/config` | Configuration du projet (buckets, région, modèle) |

**Exemple :**
```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/config
```

### 📤 Upload & Ingestion

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/v1/sign-upload` | Génère URL signée pour upload direct GCS |
| `POST` | `/v1/ingest/finish` | Traite une session (STT + Prosody + NLU) |

**Exemple - Upload complet :**
```bash
# 1. Obtenir URL signée
curl -X POST http://localhost:8080/v1/sign-upload \
  -H "Content-Type: application/json" \
  -d '{"week":"2025-W42","session_id":"session_001","content_type":"audio/wav"}'

# Réponse : {"upload_url":"https://storage.googleapis.com/...","object_path":"..."}

# 2. Upload direct vers GCS
curl -X PUT "<upload_url>" \
  --upload-file audio.wav \
  -H "Content-Type: audio/wav"

# 3. Déclencher le traitement
curl -X POST http://localhost:8080/v1/ingest/finish \
  -H "Content-Type: application/json" \
  -d '{"week":"2025-W42","session_id":"session_001"}'
```

### 📊 Sessions & Semaines

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/v1/weeks` | Liste toutes les semaines |
| `GET` | `/v1/weeks/{week}/sessions` | Liste les sessions d'une semaine |
| `GET` | `/v1/weeks/{week}/sessions/{sid}` | Détails d'une session (transcript + prosody + NLU) |

**Exemple :**
```bash
# Lister les semaines
curl http://localhost:8080/v1/weeks

# Sessions de la semaine 2025-W42
curl http://localhost:8080/v1/weeks/2025-W42/sessions

# Détails d'une session
curl http://localhost:8080/v1/weeks/2025-W42/sessions/session_001
```

### 📄 Rapports

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/v1/weeks/{week}/report` | Rapport hebdomadaire (JSON) |
| `GET` | `/v1/weeks/{week}/report/pdf` | Télécharge le PDF |
| `GET` | `/v1/weeks/{week}/report/signed` | URL signée pour le PDF |
| `GET` | `/v1/reports/history` | Historique des rapports |
| `GET` | `/v1/reports/trends?weeks=4` | Tendances sur N semaines |

**Exemple :**
```bash
# Rapport JSON
curl http://localhost:8080/v1/weeks/2025-W42/report

# Télécharger PDF
curl http://localhost:8080/v1/weeks/2025-W42/report/pdf -o report.pdf

# Historique
curl http://localhost:8080/v1/reports/history

# Tendances
curl http://localhost:8080/v1/reports/trends?weeks=4
```

### ⚙️ Orchestration

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/v1/run-week` | Génère le rapport hebdomadaire (Cloud Run Job) |
| `POST` | `/v1/run-session` | Retraite une session |
| `GET` | `/v1/pipeline/status/{execution_id}` | Status d'une exécution |
| `POST` | `/v1/pipeline/logs` | Logs du pipeline |

**Exemple :**
```bash
# Générer le rapport hebdomadaire
curl -X POST http://localhost:8080/v1/run-week \
  -H "Content-Type: application/json" \
  -d '{"week":"2025-W42"}'

# Récupérer les logs
curl -X POST http://localhost:8080/v1/pipeline/logs \
  -H "Content-Type: application/json" \
  -d '{"week":"2025-W42","limit":50}'
```

## 🧪 Tests

### Test complet de l'API

```bash
# Lancer tous les tests
chmod +x scripts/test_api.sh
./scripts/test_api.sh

# Tester avec une API déployée
API_URL=https://mj-api-xxx-ew.a.run.app ./scripts/test_api.sh
```

### Tests unitaires (TODO)

```bash
pytest api/tests/
```

## 🏗️ Architecture

```
api/
├── main.py              # Point d'entrée FastAPI
├── routers/             # Routes organisées par domaine
│   ├── health.py        # Santé & méta
│   ├── upload.py        # Upload & ingestion
│   ├── sessions.py      # Sessions & semaines
│   ├── reports.py       # Rapports
│   └── orchestration.py # Pipeline & logs
├── services/            # Logique métier (à venir)
├── schemas/             # Modèles Pydantic (à venir)
├── Dockerfile           # Container pour Cloud Run
└── requirements.txt     # Dépendances Python
```

## 🔧 Configuration

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PROJECT_ID` | ID du projet GCP | `build-unicorn25par-4813` |
| `REGION` | Région GCP | `europe-west1` |
| `BUCKET_RAW` | Bucket audio brut | `mj-audio-raw-*` |
| `BUCKET_ANALYTICS` | Bucket analytics | `mj-analytics-*` |
| `BUCKET_REPORTS` | Bucket rapports | `mj-reports-*` |
| `GEMINI_MODEL` | Modèle Gemini | `gemini-2.0-flash-exp` |
| `GOOGLE_CLOUD_LOCATION` | Location Gemini | `global` |

### CORS

Les origines autorisées sont configurées dans `api/main.py` :
- `http://localhost:3000` (dev Next.js)
- `https://*.vercel.app` (Vercel preview/prod)

## 📊 Performance

**Latences typiques (p95) :**
- `/healthz` : ~10ms
- `/v1/sign-upload` : ~100ms (génération URL)
- `/v1/ingest/finish` : ~60-120s (STT + Gemini)
- `/v1/run-week` : ~2-5min (Cloud Run Job asynchrone)

**Limites Cloud Run :**
- Memory : 2Gi
- CPU : 2 vCPU
- Timeout : 300s (5 min)
- Max instances : 10

## 🛡️ Sécurité

### Production checklist

- [ ] Activer IAP (Identity-Aware Proxy) pour `/v1/*`
- [ ] Ajouter middleware JWT (Firebase Auth)
- [ ] Limiter CORS aux domaines de production
- [ ] Rate limiting (Cloud Armor)
- [ ] Rotation des URLs signées (TTL 1h)
- [ ] Audit logs (Cloud Logging)

## 🐛 Debugging

### Logs locaux

```bash
# Logs détaillés
uvicorn api.main:app --log-level debug
```

### Logs Cloud Run

```bash
# Via gcloud
gcloud run services logs read mj-api --region europe-west1 --limit 50

# Via MCP (si configuré)
# Voir docs/MCP_SETUP.md
```

## 🔗 Intégration Frontend

Exemple avec TanStack Query :

```typescript
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = {
  weeks: {
    list: () => fetch(`${API_URL}/v1/weeks`).then(r => r.json()),
  },
  sessions: {
    list: (week: string) => 
      fetch(`${API_URL}/v1/weeks/${week}/sessions`).then(r => r.json()),
    get: (week: string, sessionId: string) =>
      fetch(`${API_URL}/v1/weeks/${week}/sessions/${sessionId}`).then(r => r.json()),
  },
  reports: {
    get: (week: string) =>
      fetch(`${API_URL}/v1/weeks/${week}/report`).then(r => r.json()),
  },
};

// Dashboard.tsx
const { data: weeks } = useQuery({
  queryKey: ['weeks'],
  queryFn: api.weeks.list,
});
```

## 📚 Documentation

- **Swagger UI** : `/docs` (interface interactive)
- **ReDoc** : `/redoc` (documentation lisible)
- **OpenAPI JSON** : `/openapi.json` (spec machine)

## 🤝 Contribution

1. Créer une branche feature
2. Ajouter des tests
3. Mettre à jour cette doc si nouvelles routes
4. PR vers `main`

## 📝 License

MIT - Mental Journal Project
