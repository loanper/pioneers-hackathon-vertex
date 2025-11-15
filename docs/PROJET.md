# 🎙️ Mental Journal - Vertex AI Pipeline

![Status](https://img.shields.io/badge/status-ready-green)
![GCP](https://img.shields.io/badge/GCP-Vertex%20AI-blue)
![Python](https://img.shields.io/badge/python-3.11-blue)

> Journal vocal intelligent pour le suivi de santé mentale, propulsé par Vertex AI et Speech-to-Text.

---

## 📖 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Démarrage rapide](#démarrage-rapide)
- [Documentation](#documentation)
- [Structure du projet](#structure-du-projet)
- [Commandes utiles](#commandes-utiles)
- [Contribution](#contribution)

---

## 🎯 Vue d'ensemble

Mental Journal est un système d'analyse vocale automatisé qui :

1. **Capture** les enregistrements vocaux hebdomadaires
2. **Transcrit** via Speech-to-Text v2 (avec timestamps)
3. **Analyse** la prosodie (pitch, énergie, pauses)
4. **Extrait** émotions et événements via Gemini
5. **Génère** un rapport hebdomadaire de bien-être mental (0-100)

### Technologies

- **Backend**: Python 3.11, Cloud Run Jobs
- **AI/ML**: Vertex AI (Gemini 1.5 Pro), Speech-to-Text v2
- **Storage**: Cloud Storage (CMEK encrypted)
- **Audio**: librosa, soundfile
- **Reports**: Jinja2, WeasyPrint

---

## 🚀 Démarrage rapide

### 1. Prérequis

```bash
# Installer gcloud CLI
curl https://sdk.cloud.google.com | bash

# Se connecter
gcloud auth login
```

### 2. Configuration

```bash
# Cloner et configurer
cd vertex/

# Copier le fichier d'environnement
cp .env.example .env

# Éditer avec vos valeurs
nano .env  # ou vim, code, etc.

# Sourcer les variables
export PROJECT_ID="mental-journal-dev"
export BILLING_ACCOUNT="XXXX-XXXX-XXXX"
export REGION="europe-west1"
```

### 3. Déploiement (Une seule fois)

```bash
# Setup infrastructure GCP (5-10 min)
./setup.sh

# Build & deploy pipeline (5-15 min)
./deploy.sh
```

### 4. Test

```bash
# Uploader un fichier audio de test
./upload_test_audio.sh 2025-W42 mon_enregistrement.wav

# Exécuter le pipeline
./run_pipeline.sh 2025-W42

# Vérifier les résultats
./check_results.sh 2025-W42
```

Les rapports seront dans `./reports/2025-W42/weekly_report.html`

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [QUICKSTART.md](QUICKSTART.md) | Guide de démarrage détaillé pas-à-pas |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architecture technique complète |
| [CHECKLIST.md](CHECKLIST.md) | Checklist de déploiement |
| [README.md](README.md) | Documentation complète originale |

---

## 📁 Structure du projet

```
.
├── 📄 README.md                    # Ce fichier
├── 📄 QUICKSTART.md                # Guide rapide
├── 📄 ARCHITECTURE.md              # Doc architecture
├── 📄 CHECKLIST.md                 # Checklist déploiement
├── 📄 Makefile                     # Commandes simplifiées
│
├── 🔧 setup.sh                     # Setup infrastructure GCP
├── 🔧 deploy.sh                    # Build & deploy pipeline
├── 🔧 run_pipeline.sh              # Exécution manuelle
├── 🔧 check_results.sh             # Vérification résultats
├── 🔧 upload_test_audio.sh         # Upload fichiers test
│
├── 📂 pipeline/                    # Code du pipeline
│   ├── Dockerfile                  # Container image
│   ├── requirements.txt            # Dépendances Python
│   ├── main.py                     # Pipeline principal
│   └── report_templates/
│       └── weekly.html.j2          # Template rapport HTML
│
├── 📂 schemas/                     # Schémas JSON
│   ├── transcript.schema.json
│   ├── prosody_features.schema.json
│   ├── events_emotions.schema.json
│   └── weekly_report.schema.json
│
└── 📂 workflows/                   # Cloud Workflows
    └── trigger_job.yaml            # Workflow scheduler
```

---

## 🛠️ Commandes utiles

### Via Makefile (recommandé)

```bash
make help          # Afficher toutes les commandes
make setup         # Setup infrastructure
make deploy        # Build & deploy
make run           # Exécuter maintenant
make check         # Vérifier résultats
make logs          # Voir les logs
make status        # Status des ressources
```

### Scripts directs

```bash
# Setup complet
./setup.sh

# Déploiement
./deploy.sh

# Exécution
./run_pipeline.sh                 # Semaine courante
./run_pipeline.sh 2025-W42        # Semaine spécifique

# Vérification
./check_results.sh
./check_results.sh 2025-W42

# Upload
./upload_test_audio.sh 2025-W42 audio.wav
```

### Commandes GCP directes

```bash
# Voir les logs
gcloud logging read "resource.type=cloud_run_job" --limit 50

# Status du job
gcloud run jobs describe mj-weekly-pipeline --region=europe-west1

# Lister les buckets
gsutil ls -p mental-journal-dev

# Télécharger un rapport
gsutil cp gs://mj-reports-mental-journal-dev/2025-W42/weekly_report.pdf .
```

---

## 🏗️ Architecture

```
Audio → GCS → Cloud Run Job
         │      ├─ STT v2 (Transcription)
         │      ├─ Librosa (Prosodie)
         │      ├─ Gemini (NLU)
         │      └─ Fusion → Rapport
         └─→ Résultats → GCS
                          └─→ Looker Studio (optionnel)
```

**Sécurité:**
- ✅ CMEK encryption (KMS)
- ✅ IAM least privilege
- ✅ Lifecycle policies (90 jours)
- ✅ Audit logging

---

## 📊 Workflow hebdomadaire

### Automatique (via Cloud Scheduler)

```
Dimanche 23:55 (Europe/Paris)
  ↓
Cloud Scheduler déclenche Workflow
  ↓
Workflow exécute Cloud Run Job
  ↓
Pipeline traite la semaine
  ↓
Rapports générés dans GCS
```

### Manuel

```bash
# Semaine courante
./run_pipeline.sh

# Semaine spécifique
./run_pipeline.sh 2025-W42
```

---

## 🔐 Sécurité & Confidentialité

- **Chiffrement**: Toutes les données au repos (CMEK via Cloud KMS)
- **Isolation**: Service account dédié avec moindre privilège
- **Rétention**: Suppression automatique après 90 jours
- **Audit**: Logs d'accès complets via Cloud Audit Logs
- **Réseau**: Private Google Access (pas d'IP publique)

---

## 💰 Coûts estimés

**Par semaine (10 sessions × 2min):**
- Cloud Storage: ~0.02€
- Speech-to-Text: ~0.15€
- Vertex AI (Gemini): ~0.10€
- Cloud Run: ~0.01€

**Total: ~0.30€/semaine soit ~1.20€/mois**

---

## 🐛 Dépannage

### Erreur "Project already exists"
```bash
gcloud config set project mental-journal-dev
./setup.sh  # Relancer
```

### Erreur "No audio files found"
```bash
# Vérifier l'upload
gsutil ls gs://mj-audio-raw-mental-journal-dev/2025-W42/

# Re-uploader
./upload_test_audio.sh 2025-W42 test.wav
```

### Logs d'erreur
```bash
make logs  # Via Makefile
# ou
gcloud logging read "severity>=ERROR" --limit 50
```

---

## 🚧 Roadmap

### Phase 1 (Actuel) ✅
- [x] Infrastructure GCP
- [x] Pipeline batch hebdomadaire
- [x] STT + Prosodie + NLU
- [x] Rapports HTML/PDF

### Phase 2 (En cours)
- [ ] Intégration Raspberry Pi
- [ ] Détection de tendances
- [ ] Alertes automatiques
- [ ] Dashboard Looker Studio

### Phase 3 (Futur)
- [ ] Multi-utilisateurs
- [ ] API REST
- [ ] Application mobile
- [ ] ML personnalisé

---

## 🤝 Contribution

Ce projet a été développé pour le GCPU Hackathon.

**Équipe:**
- Architecture Vertex AI
- Pipeline de traitement vocal
- Analyse prosodique
- Génération de rapports

---

## 📄 Licence

Projet académique - GCPU Hackathon 2025

---

## 📞 Support

- **Documentation**: Voir les fichiers `*.md`
- **Issues**: Vérifier les logs avec `make logs`
- **GCP Console**: [console.cloud.google.com](https://console.cloud.google.com)

---

## 🎉 Démarrer maintenant

```bash
# 1. Configuration
export PROJECT_ID="mental-journal-dev"
export BILLING_ACCOUNT="XXXX-XXXX-XXXX"

# 2. Setup (une fois)
./setup.sh

# 3. Deploy (une fois)
./deploy.sh

# 4. Test
./upload_test_audio.sh 2025-W42 audio.wav
./run_pipeline.sh 2025-W42
./check_results.sh 2025-W42

# 5. Consulter le rapport
open ./reports/2025-W42/weekly_report.html
```

**C'est parti ! 🚀**
