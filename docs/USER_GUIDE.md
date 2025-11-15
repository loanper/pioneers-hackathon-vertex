# Mental Journal - Complete User Guide

## 📋 Overview

This guide shows you how to upload audio recordings, get transcripts and emotional analysis, and generate weekly reports using the Mental Journal API.

---

## 🚀 Quick Start (Recommended)

The **simplest way** to upload and process audio:

```bash
# Upload a session (direct to GCS)
./scripts/upload_session_simple.sh my_journal.wav 2025-W44 session_001

# Generate weekly report
bash scripts/run_pipeline.sh 2025-W44
```

**What it does:**
1. ✅ Uploads your audio file directly to Google Cloud Storage
2. ✅ Triggers automatic transcription (Speech-to-Text v2)
3. ✅ Extracts emotions and events (Gemini 2.0)
4. ✅ Analyzes prosody features (pitch, energy, pauses)

**Two upload methods available:**
- **`upload_session_simple.sh`** ⭐ (Recommended): Direct GCS upload, no signed URLs needed
- **`upload_session.sh`**: 3-step API workflow with signed URLs (requires API credentials)

---

## 🎯 Detailed Steps: Upload & Process (Manual Method)

### Step 1: Get a Signed Upload URL

Request a pre-signed URL to upload your audio file to Google Cloud Storage:

```bash
curl -X POST https://mj-api-34701717619.europe-west1.run.app/v1/sign-upload \
  -H "Content-Type: application/json" \
  -d '{
    "week": "2025-W43",
    "session_id": "session_001",
    "content_type": "audio/wav"
  }'
```

**Response:**
```json
{
  "upload_url": "https://storage.googleapis.com/mj-audio-raw-mental-journal-dev/2025-W43/session_001.wav?X-Goog-Algorithm=...",
  "gcs_uri": "gs://mj-audio-raw-mental-journal-dev/2025-W43/session_001.wav",
  "expires_in": 3600
}
```

**Parameters:**
- `week`: ISO week format (YYYY-Www), e.g., "2025-W43"
- `session_id`: Unique identifier for this session (e.g., "session_001", "session_002")
- `content_type`: Audio MIME type ("audio/wav", "audio/mp3", "audio/flac")

---

### Step 2: Upload Your Audio File

Use the signed URL from Step 1 to upload your audio recording:

```bash
curl -X PUT "<UPLOAD_URL_FROM_STEP_1>" \
  -H "Content-Type: audio/wav" \
  --data-binary @/path/to/your/audio.wav
```

**Example:**
```bash
curl -X PUT "https://storage.googleapis.com/mj-audio-raw-mental-journal-dev/2025-W43/session_001.wav?X-Goog-Algorithm=..." \
  -H "Content-Type: audio/wav" \
  --data-binary @my_journal_entry.wav
```

**Supported Formats:**
- ✅ WAV (recommended)
- ✅ MP3
- ✅ FLAC
- ✅ Any length (no 60-second limit!)
- ✅ Auto language detection (English, French, Spanish, Arabic)

---

### Step 3: Trigger Processing

Once uploaded, trigger the complete processing pipeline:

```bash
curl -X POST https://mj-api-34701717619.europe-west1.run.app/v1/ingest/finish \
  -H "Content-Type: application/json" \
  -d '{
    "week": "2025-W43",
    "session_id": "session_001"
  }'
```

**Response:**
```json
{
  "session_id": "session_001",
  "week": "2025-W43",
  "artifacts": {
    "transcript": "gs://mj-analytics-mental-journal-dev/2025-W43/session_001/transcript.json",
    "prosody": "gs://mj-analytics-mental-journal-dev/2025-W43/session_001/prosody_features.json",
    "nlu": "gs://mj-analytics-mental-journal-dev/2025-W43/session_001/events_emotions.json",
    "audio_uri": "gs://mj-audio-raw-mental-journal-dev/2025-W43/session_001.wav"
  }
}
```

**Processing Time:** ~30-60 seconds per minute of audio

---

## 📊 What Gets Generated

### 1. **Transcript** (`transcript.json`)

Full transcription with word-level timestamps:

```bash
gsutil cat gs://mj-analytics-mental-journal-dev/2025-W43/session_001/transcript.json
```

**Contains:**
- Full text transcript
- Word-by-word timestamps
- Confidence scores
- Detected language

### 2. **Prosody Analysis** (`prosody_features.json`)

Audio characteristics analysis:

```bash
gsutil cat gs://mj-analytics-mental-journal-dev/2025-W43/session_001/prosody_features.json
```

**Metrics:**
- **Pitch**: Mean frequency (Hz) - indicates emotional state
- **Energy**: RMS amplitude - reflects intensity/engagement
- **Pauses**: Count and duration - can indicate hesitation or reflection
- **Duration**: Total audio length

### 3. **NLU Results** (`events_emotions.json`)

AI-powered emotional and event analysis using Gemini 2.0:

```bash
gsutil cat gs://mj-analytics-mental-journal-dev/2025-W43/session_001/events_emotions.json
```

**Contains:**
- **Events**: Specific occurrences mentioned (e.g., "Had presentation at work")
- **Emotions**: Detected emotions with confidence scores (e.g., {"label": "Anxious", "confidence": 0.85})
- **Themes**: Main topics (e.g., "Work Stress", "Social Connection")

---

## 📅 Generate Weekly Report

After uploading all sessions for a week, generate a comprehensive report:

```bash
cd /path/to/GCPU-hackathon-vertex
bash scripts/run_pipeline.sh 2025-W43
```

**Output:**
- ✅ `weekly_report.html` - Visual HTML report
- ✅ `weekly_report.pdf` - Printable PDF version
- ✅ `weekly_report.json` - Structured data

**Location:**
```
gs://mj-reports-mental-journal-dev/2025-W43/
```

**Download Report:**
```bash
# Download HTML
gsutil cp gs://mj-reports-mental-journal-dev/2025-W43/weekly_report.html ./

# Download PDF
gsutil cp gs://mj-reports-mental-journal-dev/2025-W43/weekly_report.pdf ./

# Open in browser
open weekly_report.html
```

---

## 🔄 Complete Workflow Example

Here's a complete example of recording and processing multiple sessions for week 2025-W43:

### Upload Session 1 (Monday)
```bash
# 1. Get upload URL
RESPONSE=$(curl -s -X POST https://mj-api-34701717619.europe-west1.run.app/v1/sign-upload \
  -H "Content-Type: application/json" \
  -d '{"week":"2025-W43","session_id":"monday_morning","content_type":"audio/wav"}')

# 2. Extract upload URL
UPLOAD_URL=$(echo $RESPONSE | jq -r '.upload_url')

# 3. Upload audio
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: audio/wav" \
  --data-binary @monday_morning.wav

# 4. Process
curl -X POST https://mj-api-34701717619.europe-west1.run.app/v1/ingest/finish \
  -H "Content-Type: application/json" \
  -d '{"week":"2025-W43","session_id":"monday_morning"}'
```

### Upload Session 2 (Wednesday)
```bash
# Repeat steps 1-4 with different session_id
curl -X POST https://mj-api-34701717619.europe-west1.run.app/v1/sign-upload \
  -H "Content-Type: application/json" \
  -d '{"week":"2025-W43","session_id":"wednesday_evening","content_type":"audio/wav"}'

# ... upload and process
```

### Upload Session 3 (Friday)
```bash
# Repeat steps 1-4 with different session_id
curl -X POST https://mj-api-34701717619.europe-west1.run.app/v1/sign-upload \
  -H "Content-Type: application/json" \
  -d '{"week":"2025-W43","session_id":"friday_night","content_type":"audio/wav"}'

# ... upload and process
```

### Generate Weekly Report
```bash
bash scripts/run_pipeline.sh 2025-W43
```

---

## 🎤 Recording Guidelines

### Audio Requirements
- **Format**: WAV, MP3, or FLAC
- **Length**: Any duration (no limits!)
- **Sample Rate**: 16kHz+ recommended
- **Channels**: Mono or stereo
- **Bitrate**: 128kbps+ for MP3

### Recording Tips
1. **Quiet Environment**: Minimize background noise
2. **Clear Speech**: Speak naturally at normal volume
3. **Close to Mic**: 6-12 inches from microphone
4. **Language**: English, French, Spanish, or Arabic (auto-detected)
5. **Duration**: 1-5 minutes is ideal per session

### Content Suggestions
Talk about:
- How you're feeling today
- Events that happened
- Things that made you happy/sad/anxious
- Interactions with others
- Work or personal challenges
- Hopes or concerns

---

## 📈 Understanding Your Results

### Emotion Index (0-100)
- **0-30**: Predominantly negative emotions
- **31-50**: Mixed or neutral emotional state
- **51-70**: Mostly positive with some concerns
- **71-100**: Very positive emotional state

### Prosody Indicators

**Pitch (Fundamental Frequency)**
- Low pitch (80-120 Hz): May indicate sadness, fatigue
- Normal pitch (120-200 Hz): Neutral emotional state
- High pitch (200+ Hz): Excitement, anxiety, or stress

**Energy (RMS)**
- Low energy (< 0.02): Quiet, tired, withdrawn
- Normal energy (0.02-0.05): Engaged, conversational
- High energy (> 0.05): Excited, animated, intense

**Pause Rate**
- Low (< 0.3): Fluent, confident speech
- Normal (0.3-0.6): Natural conversational flow
- High (> 0.6): Hesitation, reflection, searching for words

---

## 🔧 API Reference

### Base URL
```
https://mj-api-34701717619.europe-west1.run.app
```

### Endpoints

#### POST `/v1/sign-upload`
Get signed URL for uploading audio

**Request:**
```json
{
  "week": "string (YYYY-Www)",
  "session_id": "string",
  "content_type": "string"
}
```

**Response:**
```json
{
  "upload_url": "string",
  "gcs_uri": "string",
  "expires_in": 3600
}
```

#### POST `/v1/ingest/finish`
Process uploaded audio

**Request:**
```json
{
  "week": "string (YYYY-Www)",
  "session_id": "string"
}
```

**Response:**
```json
{
  "session_id": "string",
  "week": "string",
  "artifacts": {
    "transcript": "string (GCS URI)",
    "prosody": "string (GCS URI)",
    "nlu": "string (GCS URI)",
    "audio_uri": "string (GCS URI)"
  }
}
```

#### GET `/docs`
Interactive API documentation (Swagger UI)

```bash
open https://mj-api-34701717619.europe-west1.run.app/docs
```

---

## 🐛 Troubleshooting

### "Empty transcript" Error
**Cause**: Language mismatch or silent audio  
**Solution**: 
- Ensure audio has clear speech
- API now auto-detects English, French, Spanish, Arabic
- Check audio isn't corrupted: `ffprobe your_audio.wav`

### "Audio file not found" Error
**Cause**: File wasn't uploaded or wrong session_id  
**Solution**:
- Verify upload succeeded (Step 2 returns HTTP 200)
- Use exact same `week` and `session_id` in all steps
- Check file exists: `gsutil ls gs://mj-audio-raw-mental-journal-dev/2025-W43/`

### Upload URL Expired
**Cause**: Signed URL is valid for 1 hour  
**Solution**: Request new URL from Step 1

### Processing Takes Too Long
**Normal**: 30-60 seconds per minute of audio  
**If Stuck**: Check logs:
```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="mj-api"' \
  --limit=20 --project=mental-journal-dev
```

---

## 📦 Data Storage

All your data is stored in Google Cloud Storage:

```
📁 mj-audio-raw-mental-journal-dev/
   └── 2025-W43/
       ├── session_001.wav
       ├── monday_morning.wav
       └── wednesday_evening.wav

📁 mj-analytics-mental-journal-dev/
   └── 2025-W43/
       ├── session_001/
       │   ├── transcript.json
       │   ├── prosody_features.json
       │   └── events_emotions.json
       └── weekly_report.json

📁 mj-reports-mental-journal-dev/
   └── 2025-W43/
       ├── weekly_report.html
       └── weekly_report.pdf
```

---

## 🔐 Privacy & Security

- ✅ All audio stored in private GCS buckets
- ✅ API uses Google Cloud authentication
- ✅ Transcripts processed in secure environment
- ✅ Signed URLs expire after 1 hour
- ✅ No data shared with third parties
- ✅ You control your data retention

---

## 💡 Tips & Best Practices

1. **Consistent Naming**: Use descriptive session IDs (e.g., "monday_morning", "therapy_session_01")
2. **Regular Sessions**: Record 2-3 times per week for best insights
3. **Natural Speech**: Don't over-think, just talk naturally
4. **Weekly Reviews**: Generate reports at week end to track patterns
5. **Backup**: Download important transcripts locally
6. **Language**: Speak one language per recording for best accuracy

---

## 📞 Support

- **Documentation**: `/docs` folder in repository
- **API Docs**: https://mj-api-34701717619.europe-west1.run.app/docs
- **Logs**: Use `gcloud logging read` commands above

---

## 🎉 Success Checklist

- [ ] Audio uploaded successfully via signed URL
- [ ] Processing returns artifacts with GCS URIs
- [ ] Transcript contains actual text
- [ ] Emotions detected in NLU results
- [ ] Weekly report generated with HTML/PDF
- [ ] Emotion index calculated (0-100)

**You're all set! Happy journaling! 📝✨**
