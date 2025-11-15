# 🚀 Guide de Démarrage Rapide

Ce guide vous permet de mettre en place l'infrastructure Vertex AI pour le Mental Journal étape par étape.

## 📋 Prérequis

- [ ] Compte GCP avec un compte de facturation actif
- [ ] `gcloud` CLI installé ([instructions](https://cloud.google.com/sdk/docs/install))
- [ ] Permissions pour créer des projets et des ressources GCP

## 🎯 Étapes de Configuration

### 1️⃣ Configuration initiale de gcloud

```bash
# Initialiser gcloud
gcloud init

# Se connecter
gcloud auth login

# Lister vos comptes de facturation
gcloud billing accounts list
```

Notez votre `BILLING_ACCOUNT_ID` pour l'étape suivante.

### 2️⃣ Configuration des variables d'environnement

```bash
# Définir les variables
export PROJECT_ID="mental-journal-dev"
export BILLING_ACCOUNT="VOTRE-BILLING-ACCOUNT-ID"
export REGION="europe-west1"
```

💡 **Tip**: Ajoutez ces lignes à votre `~/.zshrc` pour les rendre permanentes.

### 3️⃣ Exécution du setup

```bash
# Rendre le script exécutable
chmod +x setup.sh

# Lancer le setup
./setup.sh
```

Ce script va :
- ✅ Créer le projet GCP
- ✅ Activer les APIs nécessaires
- ✅ Créer le service account avec les permissions
- ✅ Créer les 4 buckets GCS
- ✅ Configurer KMS pour le chiffrement
- ✅ Appliquer les politiques de lifecycle

⏱️ Durée estimée : **5-10 minutes**

### 4️⃣ Déploiement du pipeline

```bash
# Rendre le script exécutable
chmod +x deploy.sh

# Déployer le pipeline
./deploy.sh
```

Ce script va :
- ✅ Construire l'image Docker
- ✅ Pousser l'image vers GCR
- ✅ Créer le Cloud Run Job

⏱️ Durée estimée : **5-15 minutes** (selon votre connexion)

### 5️⃣ Test manuel

```bash
# Rendre le script exécutable
chmod +x run_pipeline.sh

# Exécuter pour la semaine courante
./run_pipeline.sh

# Ou pour une semaine spécifique
./run_pipeline.sh 2025-W42
```

## 📁 Structure des fichiers audio

Pour que le pipeline fonctionne, les fichiers audio doivent être organisés ainsi :

```
gs://mj-audio-raw-mental-journal-dev/
  └── 2025-W42/
      ├── session_001.wav
      ├── session_002.wav
      └── session_003.wav
```

### Upload d'un fichier de test

```bash
# Créer un dossier de test pour la semaine courante
WEEK=$(date +'%G-W%V')

# Uploader un fichier audio (remplacez par votre fichier)
gsutil cp votre-audio.wav gs://mj-audio-raw-$PROJECT_ID/$WEEK/test_session.wav
```

## 📊 Vérification des résultats

Après l'exécution du pipeline, vérifiez les résultats :

```bash
# Voir les transcriptions
gsutil ls gs://mj-analytics-$PROJECT_ID/$WEEK/

# Télécharger le rapport
gsutil cp gs://mj-reports-$PROJECT_ID/$WEEK/weekly_report.html .
gsutil cp gs://mj-reports-$PROJECT_ID/$WEEK/weekly_report.pdf .

# Ouvrir le rapport HTML
open weekly_report.html  # ou xdg-open sur Linux
```

## 🔄 Configuration du Cloud Scheduler (optionnel)

Pour exécuter automatiquement le pipeline chaque dimanche :

```bash
# Déployer le workflow
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

# Créer le Cloud Scheduler job
gcloud scheduler jobs create http mj-weekly \
  --project=$PROJECT_ID \
  --location=$REGION \
  --schedule="55 23 * * SUN" \
  --time-zone="Europe/Paris" \
  --http-method=POST \
  --uri="https://workflowexecutions.googleapis.com/v1/projects/$PROJECT_ID/locations/$REGION/workflows/mj-run-job/executions" \
  --oauth-service-account-email=pipeline-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --headers="Content-Type=application/json" \
  --message-body="{\"argument\": {\"week\": \"$(date +'%G-W%V')\"}}"
```

## 🐛 Dépannage

### Le projet existe déjà
```bash
# Simplement configurer le projet existant
gcloud config set project $PROJECT_ID
# Puis relancer le script setup.sh
```

### Erreur de facturation
```bash
# Vérifier vos comptes de facturation
gcloud billing accounts list

# Lier manuellement
gcloud beta billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT
```

### Erreur d'API non activée
```bash
# Activer manuellement les APIs
gcloud services enable aiplatform.googleapis.com speech.googleapis.com run.googleapis.com
```

### Logs du pipeline
```bash
# Voir les logs du dernier run
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=mj-weekly-pipeline" \
  --limit 50 \
  --format json \
  --project=$PROJECT_ID
```

## 📚 Prochaines étapes

- [ ] Intégrer avec le Raspberry Pi pour la capture audio
- [ ] Améliorer les prompts Gemini pour une meilleure analyse
- [ ] Ajouter des visualisations dans Looker Studio
- [ ] Implémenter la détection de tendances (comparaison semaine N vs N-1)
- [ ] Ajouter des alertes pour les indices critiques

## 📞 Support

Pour toute question, consultez :
- [Documentation GCP](https://cloud.google.com/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Speech-to-Text v2 Documentation](https://cloud.google.com/speech-to-text/v2/docs)
