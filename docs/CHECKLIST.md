# ✅ Checklist de Déploiement

## 📋 Pré-déploiement

### Configuration GCP
- [ ] Compte GCP créé
- [ ] Compte de facturation actif et lié
- [ ] `gcloud` CLI installé localement
- [ ] Authentification effectuée (`gcloud auth login`)
- [ ] Permissions admin sur le projet

### Variables d'environnement
- [ ] Copier `.env.example` vers `.env`
- [ ] Remplir `BILLING_ACCOUNT` dans `.env`
- [ ] Définir `PROJECT_ID` (par défaut: mental-journal-dev)
- [ ] Définir `REGION` (par défaut: europe-west1)
- [ ] Sourcer les variables: `source .env` ou utiliser `export`

```bash
export PROJECT_ID="mental-journal-dev"
export BILLING_ACCOUNT="XXXX-XXXX-XXXX-XXXX"
export REGION="europe-west1"
```

---

## 🚀 Déploiement Initial

### Étape 1 : Setup Infrastructure (5-10 min)
```bash
./setup.sh
```

**Ce script fait:**
- [x] Création du projet GCP
- [x] Activation des APIs (11 services)
- [x] Création du service account
- [x] Attribution des rôles IAM
- [x] Création des 4 buckets GCS
- [x] Configuration KMS (CMEK)
- [x] Application des politiques de lifecycle
- [x] Création du dataset BigQuery (optionnel)

**Vérification:**
```bash
# Vérifier que les buckets existent
gsutil ls -p $PROJECT_ID

# Vérifier le service account
gcloud iam service-accounts list --project=$PROJECT_ID

# Vérifier les APIs
gcloud services list --enabled --project=$PROJECT_ID
```

### Étape 2 : Build & Deploy Pipeline (5-15 min)
```bash
./deploy.sh
```

**Ce script fait:**
- [x] Build de l'image Docker
- [x] Push vers GCR (Google Container Registry)
- [x] Création du Cloud Run Job
- [x] Configuration des variables d'environnement

**Vérification:**
```bash
# Vérifier l'image
gcloud container images list --project=$PROJECT_ID

# Vérifier le job
gcloud run jobs describe mj-weekly-pipeline --region=$REGION --project=$PROJECT_ID
```

---

## 🧪 Test Initial

### Étape 3 : Upload d'un fichier audio de test
```bash
# Option A : Utiliser le script
./upload_test_audio.sh 2025-W42 votre-audio.wav

# Option B : Upload manuel
WEEK=$(date +'%G-W%V')
gsutil cp votre-audio.wav gs://mj-audio-raw-$PROJECT_ID/$WEEK/test_session.wav
```

**Formats supportés:**
- ✅ WAV (recommandé)
- ✅ MP3
- ✅ FLAC

### Étape 4 : Exécution manuelle du pipeline
```bash
# Pour la semaine courante
./run_pipeline.sh

# Pour une semaine spécifique
./run_pipeline.sh 2025-W42
```

**Durée estimée:** 2-5 min par session audio

### Étape 5 : Vérification des résultats
```bash
./check_results.sh

# Ou pour une semaine spécifique
./check_results.sh 2025-W42
```

**Attendu:**
- [x] Transcriptions JSON dans `mj-analytics`
- [x] Prosody features JSON dans `mj-analytics`
- [x] Events & Emotions JSON dans `mj-analytics`
- [x] Weekly report JSON dans `mj-analytics`
- [x] Rapports HTML/PDF dans `mj-reports`

---

## 🔄 Configuration Automatique (Optionnel)

### Étape 6 : Déploiement du Workflow
```bash
gcloud workflows deploy mj-run-job \
  --source=workflows/trigger_job.yaml \
  --location=$REGION \
  --project=$PROJECT_ID

# Autoriser le service account
gcloud workflows add-iam-policy-binding mj-run-job \
  --location=$REGION \
  --member=serviceAccount:pipeline-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/workflows.invoker \
  --project=$PROJECT_ID
```

- [x] Workflow déployé
- [x] Permissions configurées

### Étape 7 : Configuration du Cloud Scheduler
```bash
gcloud scheduler jobs create http mj-weekly \
  --project=$PROJECT_ID \
  --location=$REGION \
  --schedule="55 23 * * SUN" \
  --time-zone="Europe/Paris" \
  --http-method=POST \
  --uri="https://workflowexecutions.googleapis.com/v1/projects/$PROJECT_ID/locations/$REGION/workflows/mj-run-job/executions" \
  --oauth-service-account-email=pipeline-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --headers="Content-Type=application/json" \
  --message-body='{"argument": {"week": "AUTO"}}'
```

- [x] Scheduler créé
- [x] Cron configuré (Dimanche 23:55)
- [x] Timezone correcte (Europe/Paris)

**Test du scheduler:**
```bash
# Déclencher manuellement
gcloud scheduler jobs run mj-weekly --location=$REGION --project=$PROJECT_ID
```

---

## 📊 Monitoring & Maintenance

### Logs
```bash
# Via script
make logs

# Ou directement
gcloud logging read "resource.type=cloud_run_job" \
  --limit 50 \
  --project=$PROJECT_ID
```

### Status
```bash
# Via Makefile
make status

# Ou vérifications manuelles
gcloud run jobs list --project=$PROJECT_ID
gcloud workflows list --project=$PROJECT_ID
gcloud scheduler jobs list --location=$REGION --project=$PROJECT_ID
```

### Métriques à surveiller
- [ ] Taux de succès des executions
- [ ] Latence moyenne par session
- [ ] Confidence scores STT
- [ ] Coûts mensuels (Budget GCP)
- [ ] Taille des buckets

---

## 🔧 Dépannage

### Problèmes courants

#### ❌ "Project already exists"
```bash
# Utiliser le projet existant
gcloud config set project $PROJECT_ID
# Puis relancer setup.sh
```

#### ❌ "Billing account required"
```bash
# Lister vos comptes
gcloud billing accounts list

# Lier manuellement
gcloud beta billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT
```

#### ❌ "Permission denied"
```bash
# Vérifier vos permissions
gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:user:YOUR_EMAIL"

# Demander le rôle Owner ou Editor
```

#### ❌ "No audio files found"
```bash
# Vérifier l'upload
gsutil ls -r gs://mj-audio-raw-$PROJECT_ID/

# Re-uploader si nécessaire
./upload_test_audio.sh 2025-W42 test.wav
```

#### ❌ "STT API error"
```bash
# Vérifier que l'API est activée
gcloud services enable speech.googleapis.com --project=$PROJECT_ID

# Vérifier les quotas
gcloud alpha quotas list --service=speech.googleapis.com --project=$PROJECT_ID
```

---

## 🎯 Commandes Rapides (via Makefile)

```bash
make help          # Afficher toutes les commandes
make setup         # Setup infrastructure
make deploy        # Build & deploy
make run           # Exécuter maintenant
make check         # Vérifier résultats
make logs          # Voir les logs
make status        # Status des ressources
make clean         # Nettoyer fichiers locaux
```

---

## 📈 Prochaines Étapes

### Intégration Raspberry Pi
- [ ] Installer microphone USB
- [ ] Script d'enregistrement automatique
- [ ] Upload automatique vers GCS
- [ ] Trigger du pipeline après upload

### Améliorations Pipeline
- [ ] Détection de tendances (N vs N-1)
- [ ] Alertes sur seuils critiques
- [ ] Visualisations Looker Studio
- [ ] Export BigQuery pour analytics

### Production
- [ ] Multi-utilisateurs (séparation par user_id)
- [ ] Chiffrement end-to-end
- [ ] Backup & disaster recovery
- [ ] Tests automatisés (CI/CD)

---

## 📞 Support & Documentation

- **README.md** - Vue d'ensemble du projet
- **QUICKSTART.md** - Guide de démarrage détaillé
- **ARCHITECTURE.md** - Documentation technique complète
- **Ce fichier** - Checklist de déploiement

**Ressources GCP:**
- [Vertex AI Docs](https://cloud.google.com/vertex-ai/docs)
- [Speech-to-Text v2](https://cloud.google.com/speech-to-text/v2/docs)
- [Cloud Run Jobs](https://cloud.google.com/run/docs/create-jobs)

---

## ✅ Validation Finale

Avant de considérer le déploiement terminé, vérifier :

- [ ] ✅ Tous les scripts sont exécutables
- [ ] ✅ Le setup.sh a réussi sans erreur
- [ ] ✅ Le deploy.sh a créé l'image et le job
- [ ] ✅ Un test avec audio réel a généré un rapport
- [ ] ✅ Les rapports HTML/PDF sont lisibles
- [ ] ✅ Les logs sont accessibles
- [ ] ✅ Le Cloud Scheduler est configuré (si automatique)
- [ ] ✅ Les coûts sont surveillés (Budget Alert)

**🎉 Déploiement réussi !**
