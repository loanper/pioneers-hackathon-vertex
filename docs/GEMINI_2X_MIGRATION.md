# Migration vers Gemini 2.x

## ✅ Checklist "Prête pour Démo"

### 1. SDK Unifié Configuré
- ✅ Environment: `GOOGLE_CLOUD_LOCATION=global`
- ✅ Vertex AI activé dans le projet GCP
- ✅ Service Account avec permissions Vertex AI

### 2. Modèles Gemini 2.x

#### **gemini-2.0-flash-exp** (Production/Démo)
- **Usage**: NLU en temps réel, extraction événements/émotions
- **Avantages**: 
  - Rapide et cost-effective
  - Parfait pour démo/prod
  - Disponible en `global` endpoint
- **Configuration actuelle**: Par défaut dans `GEMINI_MODEL`

#### **gemini-2.5-pro** (Synthèse Hebdomadaire)
- **Usage**: Raisonnement avancé pour rapports hebdomadaires
- **Avantages**:
  - Meilleure compréhension contextuelle
  - Analyses plus nuancées
  - Recommandations thérapeutiques
- **Configuration**: Set `GEMINI_MODEL=gemini-2.5-pro` pour la synthèse

### 3. Migration depuis Gemini 1.5
```bash
# ❌ Déprécié (série 1.5)
gemini-1.5-pro
gemini-1.5-flash

# ✅ Recommandé (série 2.x)
gemini-2.0-flash-exp    # Remplace 1.5-flash
gemini-2.5-pro          # Remplace 1.5-pro (upgrade)
```

### 4. Configuration Région/Endpoint

```bash
# ❌ Ancien (régional, limité)
REGION=europe-west1
aiplatform.init(location="europe-west1")

# ✅ Nouveau (global, Gemini 2.x)
GOOGLE_CLOUD_LOCATION=global
aiplatform.init(location="global")
```

## 🚀 Pour la Démo Hackathon

### Setup Actuel
```python
# main.py
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash-exp")
GEMINI_LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "global")

aiplatform.init(project=PROJECT_ID, location=GEMINI_LOCATION)
model = GenerativeModel(GEMINI_MODEL)
```

### Variables d'Environnement (Cloud Run Job)
```bash
GEMINI_MODEL=gemini-2.0-flash-exp
GOOGLE_CLOUD_LOCATION=global
```

### Test du Modèle
```bash
# Test avec gemini-2.0-flash (par défaut)
gcloud run jobs execute mj-weekly-pipeline \
  --region=europe-west1 \
  --args=2025-W42

# Test avec gemini-2.5-pro (synthèse avancée)
gcloud run jobs execute mj-weekly-pipeline \
  --region=europe-west1 \
  --update-env-vars GEMINI_MODEL=gemini-2.5-pro \
  --args=2025-W42
```

## 📊 Comparaison Modèles

| Modèle | Usage | Vitesse | Coût | Qualité |
|--------|-------|---------|------|---------|
| `gemini-2.0-flash-exp` | NLU temps réel | ⚡⚡⚡ | 💰 | ⭐⭐⭐ |
| `gemini-2.5-pro` | Synthèse hebdo | ⚡⚡ | 💰💰 | ⭐⭐⭐⭐⭐ |

## 🔮 Roadmap Live API (Post-Hackathon)

Pour du bouton-parler en temps réel :
```python
# Future: Gemini 2.0 Flash Live API
from vertexai.preview.generative_models import GenerativeModel

model = GenerativeModel(
    "gemini-2.0-flash-live",  # Live streaming
    generation_config={
        "stream": True,
        "audio_enabled": True
    }
)
```

## ✅ État de Conformité

- ✅ Modèles Gemini 2.x officiels (IDs Vertex/Gemini API)
- ✅ Endpoint `global` configuré
- ✅ Migration complète depuis série 1.5 (dépréciée)
- ✅ Prêt pour démo hackathon
- ⏳ Live API (planning post-V1)

## 📝 Notes de Migration

**Changements effectués:**
1. `gemini-1.5-pro` → `gemini-2.0-flash-exp` (défaut)
2. `us-central1` → `global` (location)
3. Ajout variables `GEMINI_MODEL` et `GOOGLE_CLOUD_LOCATION`
4. Scripts `deploy.sh` mis à jour avec nouvelles env vars

**Aucun breaking change** dans l'API - juste changement de model ID.
