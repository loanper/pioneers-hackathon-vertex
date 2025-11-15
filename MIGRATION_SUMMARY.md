# 🍕 Pizza Pipeline - Migration Summary

## ✅ Migration complétée

La pipeline a été complètement renommée de "Kura/Mental Journal" vers "Pizza" et configurée pour le projet GCP `build-unicorn25par-4813`.

## 📋 Changements effectués

### 1. Identifiants du projet
- **Ancien**: `mental-journal-dev`
- **Nouveau**: `build-unicorn25par-4813`
- **Compte**: `devstar4813@gcplab.me`
- **Project Number**: `298539766629`

### 2. Préfixes des ressources
Tous les préfixes ont été modifiés :
- `mj-` → `pz-` (pizza)
- `mental-journal` → `pizza`
- Toutes les références à "kura" ont été supprimées

### 3. Buckets GCS
| Ancien nom | Nouveau nom |
|------------|-------------|
| `mj-audio-raw-mental-journal-dev` | `pz-audio-raw-build-unicorn25par-4813` |
| `mj-audio-processed-mental-journal-dev` | `pz-audio-processed-build-unicorn25par-4813` |
| `mj-analytics-mental-journal-dev` | `pz-analytics-build-unicorn25par-4813` |
| `mj-reports-mental-journal-dev` | `pz-reports-build-unicorn25par-4813` |

### 4. Services Cloud Run
| Ancien nom | Nouveau nom |
|------------|-------------|
| `mj-weekly-pipeline` | `pz-weekly-pipeline` |
| `mj-api` | `pz-api` |
| `mj-pipeline` (image) | `pz-pipeline` (image) |

### 5. Ressources KMS
| Ancien nom | Nouveau nom |
|------------|-------------|
| `mj-ring` | `pz-ring` |
| `mj-key` | `pz-key` |

## 📝 Fichiers modifiés

### Configuration
- ✅ `Makefile` - Variables et commandes mises à jour
- ✅ `.env.example` - Configuration par défaut
- ✅ `api/.env.example` - Configuration API
- ✅ `README.md` - Documentation principale

### Scripts de déploiement
- ✅ `scripts/setup.sh` - Infrastructure setup
- ✅ `scripts/deploy.sh` - Pipeline deployment
- ✅ `scripts/deploy_api.sh` - API deployment
- ✅ `scripts/deploy_pizza_full.sh` - **NOUVEAU** Script de déploiement complet
- ✅ `scripts/run_pipeline.sh` - Exécution manuelle
- ✅ `scripts/check_results.sh` - Vérification des résultats
- ✅ `scripts/upload_test_audio.sh` - Upload de fichiers de test
- ✅ `scripts/upload_session_simple.sh` - Upload simplifié
- ✅ `scripts/generate_test_data.sh` - Génération de données de test

### Code source
- ✅ `pipeline/main.py` - Pipeline principal
- ✅ `api/main.py` - API FastAPI
- ✅ `api/routers/sessions.py` - Routes sessions
- ✅ `api/routers/reports.py` - Routes reports
- ✅ `api/routers/upload.py` - Routes upload

### Documentation
- ✅ `DEPLOYMENT_PIZZA.md` - **NOUVEAU** Guide de déploiement complet

## 🚀 Déploiement

### Option rapide (recommandée)
```bash
cd /Users/robinqueriaux/Documents/GitHub/GCPU-hackathon/GCPU-hackathon-vertex

# Authentification
gcloud auth login devstar4813@gcplab.me
gcloud config set project build-unicorn25par-4813

# Déploiement complet
./scripts/deploy_pizza_full.sh
```

Cette commande va :
1. Activer toutes les APIs nécessaires
2. Créer le service account avec les permissions
3. Créer les buckets GCS avec chiffrement KMS
4. Builder et déployer le pipeline Docker
5. Créer le Cloud Run Job
6. Builder et déployer l'API
7. Configurer toutes les variables d'environnement

### Option pas à pas
```bash
# 1. Infrastructure
./scripts/setup.sh

# 2. Pipeline
./scripts/deploy.sh

# 3. API
./scripts/deploy_api.sh
```

## ✅ Vérifications

Aucune référence aux anciens noms ne devrait subsister :
- ❌ Aucune référence à "kura"
- ❌ Aucune référence à "mental-journal"  
- ❌ Aucune référence à "mj-"
- ✅ Toutes les ressources utilisent "pizza" ou "pz-"
- ✅ Projet configuré sur `build-unicorn25par-4813`
- ✅ Compte configuré sur `devstar4813@gcplab.me`

## 🧪 Test du déploiement

Après le déploiement, tester avec :

```bash
# Obtenir la semaine courante
WEEK=$(date +'%G-W%V')

# Uploader un fichier audio de test
./scripts/upload_session_simple.sh test_audio.wav $WEEK session_001

# Exécuter la pipeline
./scripts/run_pipeline.sh $WEEK

# Vérifier les résultats
./scripts/check_results.sh $WEEK

# Télécharger le rapport
gsutil cp gs://pz-reports-build-unicorn25par-4813/$WEEK/weekly_report.html .
open weekly_report.html
```

## 📊 Ressources créées

Une fois déployé, les ressources suivantes existeront :

### GCS Buckets
- `pz-audio-raw-build-unicorn25par-4813`
- `pz-audio-processed-build-unicorn25par-4813`
- `pz-analytics-build-unicorn25par-4813`
- `pz-reports-build-unicorn25par-4813`

### Cloud Run
- Job : `pz-weekly-pipeline`
- Service : `pz-api`

### Container Registry
- `gcr.io/build-unicorn25par-4813/pz-pipeline:latest`
- `gcr.io/build-unicorn25par-4813/pz-api:latest`

### KMS
- Keyring : `pz-ring` (region: europe-west1)
- Key : `pz-key`

### IAM
- Service Account : `pipeline-sa@build-unicorn25par-4813.iam.gserviceaccount.com`

## 🔒 Sécurité

- ✅ Chiffrement KMS (CMEK) sur tous les buckets
- ✅ Uniform bucket-level access activé
- ✅ Politique de lifecycle (90 jours)
- ✅ Service account avec permissions minimales
- ✅ Pas de clés API ou secrets hardcodés

## 📚 Documentation

Pour plus de détails :
- [DEPLOYMENT_PIZZA.md](./DEPLOYMENT_PIZZA.md) - Guide de déploiement détaillé
- [README.md](./README.md) - Documentation générale
- [docs/](./docs/) - Documentation complète

## ✨ Prochaines étapes

1. **Déployer** : Exécuter `./scripts/deploy_pizza_full.sh`
2. **Tester** : Uploader un fichier audio et générer un rapport
3. **Monitorer** : Vérifier les logs dans Cloud Logging
4. **Configurer** : Optionnel - Cloud Scheduler pour automatisation hebdomadaire

---

**Date de migration** : 15 novembre 2025  
**Version** : 1.0.0  
**Projet** : Pizza Pipeline  
**Statut** : ✅ Prêt pour le déploiement
