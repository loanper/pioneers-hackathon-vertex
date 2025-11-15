# ☁️ Vertex / GCP – Mental Journal Pipeline (step‑by‑step)

**Regions & names (you can keep or change):**

* **Region:** `europe-west1` (Belgium)
* **PROJECT_ID:** `build-unicorn25par-4813`
* **GCS buckets:**

  * `mj-audio-raw-<PROJECT_ID>` (source WAV/MP3/FLAC)
  * `mj-audio-processed-<PROJECT_ID>` (normalized wav + features)
  * `mj-analytics-<PROJECT_ID>` (JSON artifacts)
  * `mj-reports-<PROJECT_ID>` (weekly HTML/PDF)
* **BQ dataset (optional Looker Studio):** `journaling`
* **Service account:** `pipeline-sa@<PROJECT_ID>.iam.gserviceaccount.com`

---

## Étape 0 — Prérequis locaux

* Installe **gcloud** et initialise : `gcloud init`
* Active les APIs :

  ```bash
  gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    aiplatform.googleapis.com \
    speech.googleapis.com \
    cloudkms.googleapis.com \
    workflows.googleapis.com \
    logging.googleapis.com \
    pubsub.googleapis.com \
    bigquery.googleapis.com
  ```

---

## Étape 1 — Setup (Projet, IAM, GCS, KMS)

```bash
# 1) Créer le projet
PROJECT_ID=build-unicorn25par-4813
BILLING_ACCOUNT=<YOUR_BILLING_ACCOUNT>
gcloud projects create $PROJECT_ID --name="Mental Journal Dev"
gcloud beta billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT

gcloud config set project $PROJECT_ID
REGION=europe-west1

# 2) Créer service account
SA=pipeline-sa
gcloud iam service-accounts create $SA \
  --display-name="Pipeline Service Account"

# 3) Rôles minimaux (principe du moindre privilège)
ROLES=( \
  roles/run.admin \
  roles/run.invoker \
  roles/storage.admin \
  roles/aiplatform.user \
  roles/speech.admin \
  roles/iam.serviceAccountUser \
  roles/secretmanager.secretAccessor \
  roles/logging.logWriter \
  roles/workflows.invoker \
  roles/pubsub.editor \
  roles/bigquery.admin \
)
for r in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member=serviceAccount:$SA@$PROJECT_ID.iam.gserviceaccount.com \
    --role=$r
done

# 4) Buckets GCS
for b in mj-audio-raw mj-audio-processed mj-analytics mj-reports; do
  gsutil mb -l $REGION gs://$b-$PROJECT_ID
done

# 5) KMS (CMEK)
KEYRING=mj-ring
KEY=mj-key
gcloud kms keyrings create $KEYRING --location=$REGION
gcloud kms keys create $KEY --keyring=$KEYRING --location=$REGION --purpose=encryption
KMS_RESOURCE="projects/$PROJECT_ID/locations/$REGION/keyRings/$KEYRING/cryptoKeys/$KEY"

# 6) Appliquer la clé KMS aux buckets
for b in mj-audio-raw mj-audio-processed mj-analytics mj-reports; do
  gsutil kms encryption -k $KMS_RESOURCE gs://$b-$PROJECT_ID
  gsutil bucketpolicyonly set on gs://$b-$PROJECT_ID
  # Lifecycle : rétention 90 jours pour analytics + processed (conservation stricte)
  cat > /tmp/lifecycle.json << EOF
  {
    "rule": [
      {"action": {"type": "Delete"}, "condition": {"age": 90}}
    ]
  }
EOF
  gsutil lifecycle set /tmp/lifecycle.json gs://$b-$PROJECT_ID
done
```

**Schémas JSON (placer dans `schemas/`)**

`schemas/transcript.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Transcript",
  "type": "object",
  "properties": {
    "session_id": {"type": "string"},
    "audio_uri": {"type": "string"},
    "language_code": {"type": "string"},
    "created_at": {"type": "string", "format": "date-time"},
    "transcript": {"type": "string"},
    "words": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "start": {"type": "number"},
          "end": {"type": "number"},
          "word": {"type": "string"},
          "confidence": {"type": "number"}
        },
        "required": ["start", "end", "word"]
      }
    }
  },
  "required": ["session_id", "audio_uri", "language_code", "created_at", "transcript"]
}
```

`schemas/prosody_features.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ProsodyFeatures",
  "type": "object",
  "properties": {
    "session_id": {"type": "string"},
    "created_at": {"type": "string", "format": "date-time"},
    "sr": {"type": "integer"},
    "duration_sec": {"type": "number"},
    "pitch_mean": {"type": "number"},
    "pitch_std": {"type": "number"},
    "energy_mean": {"type": "number"},
    "energy_std": {"type": "number"},
    "pause_count": {"type": "integer"},
    "pause_total_sec": {"type": "number"}
  },
  "required": ["session_id", "created_at", "sr", "duration_sec"]
}
```

`schemas/events_emotions.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "EventsEmotions",
  "type": "object",
  "properties": {
    "session_id": {"type": "string"},
    "created_at": {"type": "string", "format": "date-time"},
    "events": {"type": "array", "items": {"type": "string"}},
    "emotions": {
      "type": "array",
      "items": {"type": "object", "properties": {
        "label": {"type": "string"},
        "confidence": {"type": "number"}
      }, "required": ["label"]}
    },
    "themes": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["session_id", "created_at", "events", "emotions"]
}
```

`schemas/weekly_report.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "WeeklyReport",
  "type": "object",
  "properties": {
    "week": {"type": "string"},
    "user_tz": {"type": "string"},
    "sessions": {"type": "integer"},
    "emotion_index": {"type": "number"},
    "trend": {"type": "string", "enum": ["up", "down", "flat"]},
    "highlights": {"type": "array", "items": {"type": "string"}},
    "prosody_summary": {
      "type": "object",
      "properties": {
        "pitch_mean": {"type": "number"},
        "energy_mean": {"type": "number"},
        "pause_rate": {"type": "number"}
      }
    }
  },
  "required": ["week", "sessions", "emotion_index", "trend"]
}
```

---

## Étape 2 — Cloud Run **Job** (squelette) + Container

**Fichiers du repo `pipeline/`:**

```
Dockerfile
requirements.txt
main.py
report_templates/weekly.html.j2
```

**`requirements.txt`**

```
google-cloud-storage
google-cloud-speech
google-cloud-aiplatform
google-cloud-logging
librosa
soundfile
numpy
scipy
jinja2
weasyprint
```

**`Dockerfile`** (Python 3.11 + ffmpeg deps + WeasyPrint deps)

```Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libffi8 libxml2 libxslt1.1 libpango-1.0-0 libpangoft2-1.0-0 \
    libcairo2 libjpeg62-turbo \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Entrypoint accepts a week key, e.g. 2025-W41
ENTRYPOINT ["python", "main.py"]
```

**`main.py`** (squelette orchestrateur semaine)

```python
import os, json, datetime as dt
from google.cloud import storage, speech_v2
from google.cloud import aiplatform
from google.cloud import logging as cloud_logging
import librosa, numpy as np, soundfile as sf
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

PROJECT_ID = os.environ.get("PROJECT_ID")
REGION = os.environ.get("REGION", "europe-west1")
BUCKET_RAW = os.environ.get("BUCKET_RAW")
BUCKET_PROC = os.environ.get("BUCKET_PROC")
BUCKET_ANALYTICS = os.environ.get("BUCKET_ANALYTICS")
BUCKET_REPORTS = os.environ.get("BUCKET_REPORTS")
USER_TZ = os.environ.get("USER_TZ", "Europe/Paris")

client_storage = storage.Client()
log_client = cloud_logging.Client()
log_client.setup_logging()

aiplatform.init(project=PROJECT_ID, location=REGION)

def list_week_audio(prefix: str):
    bucket = client_storage.bucket(BUCKET_RAW)
    return [b"gs://" + f.name.encode() for f in bucket.list_blobs(prefix=prefix) if f.name.endswith((".wav", ".mp3", ".flac"))]

def stt_transcribe(gcs_uri: str, language_code="fr-FR"):
    # Minimal Speech-to-Text v2 sample (sync for short clips; upgrade to long-running for >1min)
    client = speech_v2.SpeechClient()
    recognizer = f"projects/{PROJECT_ID}/locations/{REGION}/recognizers/_"
    req = speech_v2.RecognizeRequest(
        recognizer=recognizer,
        config=speech_v2.RecognitionConfig(
            auto_decoding_config=speech_v2.AutoDetectDecodingConfig(),
            language_codes=[language_code],
            features=speech_v2.RecognitionFeatures(enable_word_time_offsets=True),
        ),
        uri=gcs_uri
    )
    resp = client.recognize(request=req)
    text = " ".join([r.alternatives[0].transcript for r in resp.results])
    words = []
    for r in resp.results:
        for w in r.alternatives[0].words:
            words.append({"start": w.start_offset.total_seconds(), "end": w.end_offset.total_seconds(), "word": w.word, "confidence": w.confidence})
    return text, words

def download_to_tmp(gcs_uri: str) -> str:
    # gs://bucket/path -> local /tmp/file
    assert gcs_uri.startswith("gs://")
    bucket_name, blob_path = gcs_uri[5:].split("/", 1)
    local = f"/tmp/{os.path.basename(blob_path)}"
    client_storage.bucket(bucket_name).blob(blob_path).download_to_filename(local)
    return local

def extract_prosody(local_path: str):
    y, sr = librosa.load(local_path, sr=16000, mono=True)
    duration = librosa.get_duration(y=y, sr=sr)
    f0 = librosa.yin(y, fmin=50, fmax=400)
    rms = librosa.feature.rms(y=y)[0]
    energy_mean, energy_std = float(np.mean(rms)), float(np.std(rms))
    f0 = f0[~np.isnan(f0)]
    pitch_mean = float(np.mean(f0)) if f0.size else 0.0
    pitch_std = float(np.std(f0)) if f0.size else 0.0
    # Pauses = segments where rms below threshold
    thr = np.percentile(rms, 20)
    pauses = rms < thr
    # naive count of pause groups
    pause_count = int(np.sum((~pauses[:-1] & pauses[1:])))
    pause_total = float(np.sum(pauses) / sr)
    return {
        "sr": sr,
        "duration_sec": duration,
        "pitch_mean": pitch_mean,
        "pitch_std": pitch_std,
        "energy_mean": energy_mean,
        "energy_std": energy_std,
        "pause_count": pause_count,
        "pause_total_sec": pause_total,
    }

def nlu_events_emotions(transcript: str):
    from vertexai.generative_models import GenerativeModel
    model = GenerativeModel("gemini-1.5-pro")
    prompt = f"""
    From the following French journal transcript, list concise 'events' (bullet strings),
    infer emotions with confidences (0-1), and main themes (1-5 keywords).
    Return strict JSON with keys: events, emotions:[{{label,confidence}}], themes.
    Transcript:\n{transcript}
    """
    out = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
    return json.loads(out.text)


def compute_index(emotions_list):
    # Simple mapping; adjust later.
    pos = {"joy", "gratitude", "calm", "hope"}
    neg = {"sadness", "anger", "fear", "anxiety", "stress"}
    score = 50
    for e in emotions_list:
        label = e.get("label", "").lower()
        c = float(e.get("confidence", 0))
        if label in pos:
            score += 20 * c
        if label in neg:
            score -= 20 * c
    return max(0, min(100, score))


def upload_json(bucket_name, path, obj):
    blob = client_storage.bucket(bucket_name).blob(path)
    blob.upload_from_string(json.dumps(obj, ensure_ascii=False, indent=2), content_type="application/json")


def render_weekly_report(week_key: str, sessions, emotion_index, trend, prosody_agg):
    env = Environment(loader=FileSystemLoader("report_templates"))
    tpl = env.get_template("weekly.html.j2")
    html = tpl.render(week=week_key, sessions=sessions, emotion_index=emotion_index, trend=trend, prosody=prosody_agg)
    html_path = f"/tmp/{week_key}.html"
    pdf_path = f"/tmp/{week_key}.pdf"
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    HTML(filename=html_path).write_pdf(pdf_path)
    return html_path, pdf_path


def main():
    # Accept week key as arg: e.g., 2025-W41
    import sys
    week_key = sys.argv[1] if len(sys.argv) > 1 else dt.date.today().strftime("%G-W%V")
    prefix = f"{week_key}/"  # Expect raw audio under mj-audio-raw/week/... files
    uris = list_week_audio(prefix)
    print(f"Found {len(uris)} files under {prefix}")

    transcripts = []
    prosodies = []
    emotions = []

    for uri in uris:
        sid = os.path.splitext(os.path.basename(uri.decode()))[0]
        text, words = stt_transcribe(uri.decode())
        transcripts.append({
            "session_id": sid,
            "audio_uri": uri.decode(),
            "language_code": "fr-FR",
            "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "transcript": text,
            "words": words,
        })
        upload_json(BUCKET_ANALYTICS, f"{week_key}/{sid}/transcript.json", transcripts[-1])

        local = download_to_tmp(uri.decode())
        pf = extract_prosody(local)
        pf.update({"session_id": sid, "created_at": dt.datetime.now(dt.timezone.utc).isoformat()})
        prosodies.append(pf)
        upload_json(BUCKET_ANALYTICS, f"{week_key}/{sid}/prosody_features.json", pf)

        nlu = nlu_events_emotions(text)
        nlu.update({"session_id": sid, "created_at": dt.datetime.now(dt.timezone.utc).isoformat()})
        emotions.append(nlu)
        upload_json(BUCKET_ANALYTICS, f"{week_key}/{sid}/events_emotions.json", nlu)

    # Fusion + index
    all_scores = [compute_index(e.get("emotions", [])) for e in emotions]
    emotion_index = float(np.mean(all_scores)) if all_scores else 50.0
    trend = "flat"  # TODO: compare with last week stored in mj-analytics
    sessions = len(uris)
    prosody_agg = {
        "pitch_mean": float(np.mean([p["pitch_mean"] for p in prosodies])) if prosodies else 0,
        "energy_mean": float(np.mean([p["energy_mean"] for p in prosodies])) if prosodies else 0,
        "pause_rate": float(np.mean([p["pause_count"] for p in prosodies]))/max(1, float(np.sum([p["duration_sec"] for p in prosodies]))) if prosodies else 0
    }

    weekly = {
        "week": week_key,
        "user_tz": USER_TZ,
        "sessions": sessions,
        "emotion_index": round(emotion_index, 1),
        "trend": trend,
        "highlights": [e for x in emotions for e in x.get("events", [])],
        "prosody_summary": prosody_agg,
    }

    upload_json(BUCKET_ANALYTICS, f"{week_key}/weekly_report.json", weekly)
    html_path, pdf_path = render_weekly_report(week_key, sessions, weekly["emotion_index"], trend, prosody_agg)

    client_storage.bucket(BUCKET_REPORTS).blob(f"{week_key}/weekly_report.html").upload_from_filename(html_path, content_type="text/html")
    client_storage.bucket(BUCKET_REPORTS).blob(f"{week_key}/weekly_report.pdf").upload_from_filename(pdf_path, content_type="application/pdf")

if __name__ == "__main__":
    main()
```

**`report_templates/weekly.html.j2`** (minimal)

```html
<!doctype html>
<html lang="fr">
<meta charset="utf-8" />
<title>Rapport hebdo – {{ week }}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; }
  .kpi { display: flex; gap: 2rem; }
  .card { border: 1px solid #ddd; padding: 1rem; border-radius: .5rem; }
</style>
<h1>Rapport hebdomadaire – {{ week }}</h1>
<div class="kpi">
  <div class="card"><strong>Sessions</strong><div>{{ sessions }}</div></div>
  <div class="card"><strong>Indice émotion</strong><div>{{ emotion_index }}</div></div>
  <div class="card"><strong>Tendance</strong><div>{{ trend }}</div></div>
</div>
<h2>Prosodie (moyennes)</h2>
<ul>
  <li>Pitch moyen: {{ prosody.pitch_mean | round(1) }}</li>
  <li>Énergie moyenne: {{ prosody.energy_mean | round(4) }}</li>
  <li>Taux de pauses: {{ prosody.pause_rate | round(4) }}</li>
</ul>
```

**Build & déploiement Job**

```bash
# Build
gcloud builds submit --tag gcr.io/$PROJECT_ID/mj-pipeline:latest pipeline/

# Créer un Cloud Run Job
gcloud run jobs create mj-weekly-pipeline \
  --image gcr.io/$PROJECT_ID/mj-pipeline:latest \
  --region=$REGION \
  --service-account=$SA@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars=PROJECT_ID=$PROJECT_ID,REGION=$REGION,BUCKET_RAW=mj-audio-raw-$PROJECT_ID,BUCKET_PROC=mj-audio-processed-$PROJECT_ID,BUCKET_ANALYTICS=mj-analytics-$PROJECT_ID,BUCKET_REPORTS=mj-reports-$PROJECT_ID,USER_TZ=Europe/Paris \
  --max-retries=1 --task-timeout=3600s

# Exécution manuelle (avec la semaine courante)
WEEK=$(date +"%G-W%V")
gcloud run jobs execute mj-weekly-pipeline --region=$REGION --args=$WEEK
```

---

## Étape 3 — Cloud Scheduler ➜ Workflows ➜ Run Job (sans serveur « glue »)

**Workflow YAML `workflows/trigger_job.yaml`**

```yaml
main:
  params: [week]
  steps:
  - callRunJob:
      call: http.post
      args:
        url: https://run.googleapis.com/apis/run.googleapis.com/v1/projects/${sys.get_env("GOOGLE_CLOUD_PROJECT")}/locations/europe-west1/jobs/mj-weekly-pipeline:run
        auth:
          type: OAuth2
        body:
          overrides:
            containerOverrides:
              - args: ["${week}"]
      result: r
  - returnResult:
      return: ${r.body}
```

**Déployer workflow + autorisations**

```bash
WORKFLOW=mj-run-job
gcloud workflows deploy $WORKFLOW --source=workflows/trigger_job.yaml --location=$REGION
# Autoriser SA à invoquer le workflow
gcloud workflows add-iam-policy-binding $WORKFLOW \
  --location=$REGION \
  --member=serviceAccount:$SA@$PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/workflows.invoker
```

**Cloud Scheduler** (tous les dimanches 23:55 Europe/Paris, lancer la semaine courante)

```bash
# Publique en HTTP direct sur Workflows (via exécution avec param)
CRON="55 23 * * SUN"
PAYLOAD=$(jq -n --arg w "$(date +"%G-W%V")" '{argument: {week: $w}}')

gcloud scheduler jobs create http mj-weekly \
  --schedule="$CRON" \
  --time-zone="Europe/Paris" \
  --http-method=POST \
  --uri="https://workflowexecutions.googleapis.com/v1/projects/$PROJECT_ID/locations/$REGION/workflows/$WORKFLOW/executions" \
  --oauth-service-account-email=$SA@$PROJECT_ID.iam.gserviceaccount.com \
  --headers="Content-Type=application/json" \
  --message-body="$PAYLOAD"
```

> Variante **Pub/Sub**: créer un job Scheduler Pub/Sub qui publie `{week:"YYYY-Www"}` sur `weekly-run`, puis un **Workflow** déclenché par EventArc (ou une petite **Cloud Run Service**) qui lit le message et appelle le même endpoint `:run`. Gardons la version HTTP ci-dessus pour la simplicité.

---

## Étape 4 — STT (Speech‑to‑Text v2)

* Les fichiers audio hebdo sont stockés sous `gs://mj-audio-raw-<PROJECT_ID>/<YYYY-Www>/...`.
* Le code `stt_transcribe` ci‑dessus utilise la reconnaissance **v2** avec offsets des mots.
* Pour des enregistrements longs, remplacer `recognize` par une **opération longue** (LRO `batch_recognize`) et attendre le résultat.

---

## Étape 5 — Prosodie (librosa)

* Extraction : pitch (YIN), énergie (RMS), pauses (seuil quantile 20%).
* Stockage : `gs://mj-analytics-.../<week>/<session>/prosody_features.json` (schéma fourni).
* Améliorations futures : normalisation par locuteur, VAD (webrtcvad), jitter/shimmer.

---

## Étape 6 — NLU (Gemini sur Vertex)

* Prompt JSON strict (déjà dans `main.py`).
* Modèle par défaut : `gemini-1.5-pro` en `europe-west1`.
* Sortie : `events_emotions.json` avec `{events[], emotions[{label,confidence}], themes[]}`.

---

## Étape 7 — Fusion & indice + Rapport HTML/PDF

* Calcul d’un **indice émotion** 0–100 (baseline 50, +/-20 par émotions pondérées).
* Tendance simple (`flat`) — TODO: comparer avec `weekly_report.json` de la semaine `W-1`.
* Génération `weekly_report.json`, `weekly_report.html`, `weekly_report.pdf` ➜ bucket `mj-reports-...`.

---

## Étape 8 — Sécurité & conformité

* **CMEK** activé sur tous les buckets.
* **IAM** : seulement le `pipeline-sa` écrit dans GCS/BQ, un rôle lecteur pour Looker.
* **Logs d’accès** : Cloud Audit Logging est activé par défaut. Créer un **sink** si besoin d’archiver.

```bash
# Exemple: sink vers BigQuery
bq --location=$REGION mk --dataset $PROJECT_ID:logsink
LOG_SINK=access-logs
gcloud logging sinks create $LOG_SINK bigquery.googleapis.com/projects/$PROJECT_ID/datasets/logsink \
  --log-filter='resource.type="gcs_bucket"'
```

---

## Étape 9 — Demo & Export (Looker Studio optionnel)

### 9.1 Bouton **“Générer maintenant”**

* Exécution manuelle :

```bash
WEEK=$(date +"%G-W%V")
gcloud run jobs execute mj-weekly-pipeline --region=$REGION --args=$WEEK
```

* Ou exécuter le **Workflow** :

```bash
gcloud workflows run $WORKFLOW --location=$REGION --data='{"week":"'$(date +"%G-W%V")'"}'
```

### 9.2 BigQuery (pour Looker Studio)

```bash
bq --location=$REGION mk --dataset $PROJECT_ID:journaling
# Charger/append les weekly_report.json en table partitionnée par semaine
bq load --autodetect --source_format=NEWLINE_DELIMITED_JSON \
  $PROJECT_ID:journaling.weekly_reports \
  gs://mj-analytics-$PROJECT_ID/*/weekly_report.json
```

* Dans Looker Studio : connecter la table BQ `journaling.weekly_reports`.

---

## Étape 10 — Runbook

* **Upload audio** (depuis le Pi) vers `gs://mj-audio-raw-<PROJECT_ID>/<YYYY-Www>/<session>.wav` (ou mp3/flac).
* **Test local** : `docker run -e ... gcr.io/<PROJECT_ID>/mj-pipeline:latest 2025-W41`.
* **Prod** : vérifier les logs Cloud Run Jobs (Log Explorer) et les objets crées dans GCS.

---

## Étape 11 — Améliorations futures

* LRO STT `batch_recognize` + diarization.
* Prosodie enrichie (formants, jitter, shimmer) et VAD robuste.
* Index émotion calibré (EMA hebdo, z‑score par individu).
* Signaux d’alerte (thresholds + Pub/Sub notif).
* Signature et chiffrage côté client (Pi) avant upload.
* Data Catalog + policy tags si export BQ.
