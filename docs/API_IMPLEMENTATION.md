# 🎉 API FastAPI Mental Journal - Récapitulatif

## ✅ Ce qui a été créé

### 📂 Structure complète

```
api/
├── main.py                 # Point d'entrée FastAPI avec CORS et exception handling
├── routers/                # Routes organisées par domaine
│   ├── __init__.py
│   ├── health.py          # GET /healthz, GET /config
│   ├── upload.py          # POST /v1/sign-upload, POST /v1/ingest/finish
│   ├── sessions.py        # GET /v1/weeks, GET /v1/weeks/{week}/sessions, etc.
│   ├── reports.py         # GET /v1/weeks/{week}/report, PDF, trends
│   └── orchestration.py   # POST /v1/run-week, status, logs
├── schemas/               # (Vide pour l'instant, modèles Pydantic à venir)
├── services/              # (Vide pour l'instant, logique métier à venir)
├── Dockerfile             # Container pour Cloud Run
├── cloudbuild.yaml        # Configuration Cloud Build
├── requirements.txt       # Dépendances Python
├── .env.example           # Template de configuration
├── .gitignore             # Exclusions Git
└── README.md              # Documentation complète
```

### 🛠️ Scripts de déploiement et test

```
scripts/
├── deploy_api.sh          # Déploiement Cloud Run (gcloud builds + gcloud run deploy)
└── test_api.sh            # Tests complets de toutes les routes
```

### 📚 Documentation

```
docs/
└── API_ROUTES.md          # Guide complet de toutes les routes avec exemples frontend
```

---

## 🚀 Routes implémentées (15 routes)

### 1️⃣ Santé & Méta (2 routes)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/healthz` | GET | Health check pour load balancer |
| `/config` | GET | Configuration projet (buckets, région, modèle) |

### 2️⃣ Upload & Ingestion (2 routes)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/v1/sign-upload` | POST | Génère URL signée pour upload direct GCS |
| `/v1/ingest/finish` | POST | Traite une session (STT + Prosody + NLU) |

### 3️⃣ Sessions & Semaines (3 routes)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/v1/weeks` | GET | Liste toutes les semaines |
| `/v1/weeks/{week}/sessions` | GET | Liste les sessions d'une semaine |
| `/v1/weeks/{week}/sessions/{sid}` | GET | Détails complets d'une session |

### 4️⃣ Rapports (5 routes)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/v1/weeks/{week}/report` | GET | Rapport hebdomadaire (JSON) |
| `/v1/weeks/{week}/report/pdf` | GET | Télécharge le PDF |
| `/v1/weeks/{week}/report/signed` | GET | URL signée pour le PDF |
| `/v1/reports/history` | GET | Historique des rapports |
| `/v1/reports/trends?weeks=N` | GET | Tendances multi-semaines |

### 5️⃣ Orchestration (3 routes)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/v1/run-week` | POST | Génère le rapport hebdomadaire (Cloud Run Job) |
| `/v1/pipeline/status/{execution_id}` | GET | Status d'une exécution |
| `/v1/pipeline/logs` | POST | Logs du pipeline |

---

## 📋 Prochaines étapes

### 1. **Tester l'API localement**

```bash
# 1. Installer les dépendances
cd api
pip install -r requirements.txt

# 2. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec tes valeurs

# 3. Lancer le serveur
uvicorn api.main:app --reload --host 0.0.0.0 --port 8080

# 4. Ouvrir la documentation
open http://localhost:8080/docs

# 5. Tester toutes les routes
cd ..
./scripts/test_api.sh
```

### 2. **Déployer sur Cloud Run**

```bash
# Depuis la racine du projet
./scripts/deploy_api.sh

# Cela va :
# - Build l'image Docker avec Cloud Build
# - Déployer sur Cloud Run
# - Afficher l'URL de l'API
```

### 3. **Intégrer avec le frontend Next.js**

```typescript
// frontend/.env.local
NEXT_PUBLIC_API_URL=https://mj-api-xxx-ew.a.run.app

// frontend/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = {
  weeks: {
    list: () => fetch(`${API_URL}/v1/weeks`).then(r => r.json()),
  },
  // ... (voir docs/API_ROUTES.md pour tous les exemples)
};
```

### 4. **Ajouter les routes manquantes (optionnelles)**

Routes suggérées à ajouter si besoin :

- **WebSocket Live** : `GET /ws/live` (pour mode "confident" temps réel)
- **Auth JWT** : Middleware Firebase Auth ou Cloud IAP
- **Batch Upload** : `POST /v1/upload/batch` (uploader plusieurs sessions)
- **Session Metadata** : `PUT /v1/weeks/{week}/sessions/{sid}/metadata` (ajouter notes, tags)
- **Analytics** : `GET /v1/analytics/summary` (stats globales)
- **Admin** : `GET /v1/admin/costs`, `GET /v1/admin/metrics` (via MCP)

---

## 🧪 Tests à effectuer

### Tests fonctionnels

1. **Upload & traitement d'une session**
   ```bash
   # 1. Obtenir URL signée
   curl -X POST http://localhost:8080/v1/sign-upload \
     -H "Content-Type: application/json" \
     -d '{"week":"2025-W42","session_id":"test_001","content_type":"audio/wav"}'
   
   # 2. Upload (remplacer <upload_url> par la réponse)
   curl -X PUT "<upload_url>" --upload-file test_audio.wav
   
   # 3. Traiter
   curl -X POST http://localhost:8080/v1/ingest/finish \
     -H "Content-Type: application/json" \
     -d '{"week":"2025-W42","session_id":"test_001"}'
   ```

2. **Générer un rapport hebdomadaire**
   ```bash
   curl -X POST http://localhost:8080/v1/run-week \
     -H "Content-Type: application/json" \
     -d '{"week":"2025-W42"}'
   ```

3. **Vérifier les artefacts**
   ```bash
   # Sessions
   curl http://localhost:8080/v1/weeks/2025-W42/sessions
   
   # Rapport
   curl http://localhost:8080/v1/weeks/2025-W42/report
   
   # Tendances
   curl http://localhost:8080/v1/reports/trends?weeks=4
   ```

### Tests de charge (optionnel)

```bash
# Installer hey
go install github.com/rakyll/hey@latest

# Tester /healthz
hey -n 1000 -c 10 http://localhost:8080/healthz

# Tester /v1/weeks
hey -n 100 -c 5 http://localhost:8080/v1/weeks
```

---

## 🔒 Sécurité (Production)

### Checklist avant mise en production

- [ ] **Activer IAP** (Identity-Aware Proxy) pour `/v1/*`
- [ ] **CORS restreint** : Remplacer `*` par domaines spécifiques
- [ ] **Rate limiting** : Cloud Armor (100 req/min par IP)
- [ ] **JWT Auth** : Middleware Firebase ou custom
- [ ] **HTTPS uniquement** : Cloud Run force déjà HTTPS
- [ ] **Rotation secrets** : URLs signées TTL 1h max
- [ ] **Monitoring** : Cloud Logging + alertes
- [ ] **Budget alerts** : Notification si coût > 10€/jour

---

## 📊 Performance attendue

**Latences typiques (p95) :**

| Route | Latence | Notes |
|-------|---------|-------|
| `/healthz` | ~10ms | Simple return |
| `/config` | ~20ms | Env vars |
| `/v1/sign-upload` | ~100ms | Génération URL GCS |
| `/v1/weeks` | ~200ms | List GCS blobs |
| `/v1/weeks/{w}/sessions` | ~300ms | List + parse |
| `/v1/weeks/{w}/sessions/{s}` | ~500ms | 3x download JSON |
| `/v1/ingest/finish` | **60-120s** | STT + Gemini (long) |
| `/v1/run-week` | **2-5min** | Cloud Run Job async |

**Optimisations possibles :**

1. **Cache Redis** : Mettre en cache les réponses `/v1/weeks`, `/v1/reports/history` (TTL 5min)
2. **CDN** : Cloud CDN devant Cloud Run pour routes GET statiques
3. **Batch processing** : Regrouper plusieurs sessions en un seul appel STT/Gemini
4. **Pub/Sub** : Remplacer `/v1/ingest/finish` par message Pub/Sub → traitement asynchrone

---

## 🐛 Troubleshooting

### Erreur : Import "fastapi" could not be resolved

**Cause :** Dépendances pas installées

**Solution :**
```bash
cd api
pip install -r requirements.txt
```

### Erreur : Authentication failed

**Cause :** Credentials GCP manquants

**Solution :**
```bash
# Authentifier avec gcloud
gcloud auth application-default login

# Ou définir la variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
```

### Erreur : 404 Not Found sur `/v1/weeks/{week}/report`

**Cause :** Rapport pas encore généré

**Solution :**
```bash
# Générer le rapport d'abord
curl -X POST http://localhost:8080/v1/run-week \
  -H "Content-Type: application/json" \
  -d '{"week":"2025-W42"}'

# Attendre ~2min, puis réessayer
curl http://localhost:8080/v1/weeks/2025-W42/report
```

### Erreur : CORS policy blocking

**Cause :** Frontend sur domaine non autorisé

**Solution :** Ajouter le domaine dans `api/main.py` :
```python
allow_origins=[
    "http://localhost:3000",
    "https://your-app.vercel.app",  # Ajouter ici
],
```

---

## 🎯 Résumé final

**✅ API FastAPI complète avec 15 routes**  
**✅ Documentation interactive Swagger/ReDoc**  
**✅ Scripts de déploiement Cloud Run**  
**✅ Scripts de test automatisés**  
**✅ Exemples d'intégration frontend Next.js + TanStack Query**  
**✅ Guide complet dans `docs/API_ROUTES.md`**  

**Prochaine étape : Tester l'API localement puis la déployer !** 🚀

---

**Commandes rapides :**

```bash
# Lancer l'API localement
cd api && uvicorn api.main:app --reload --port 8080

# Tester toutes les routes
./scripts/test_api.sh

# Déployer sur Cloud Run
./scripts/deploy_api.sh

# Documentation
open http://localhost:8080/docs
```
