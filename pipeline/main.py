#!/usr/bin/env python3
"""
Pizza Pipeline - Weekly Pipeline
Orchestrates Speech-to-Text, Prosody Analysis, NLU, and Report Generation
"""

import os
import json
import datetime as dt
import sys
from google.cloud import storage, speech_v2
from google.cloud import aiplatform
from google.cloud import logging as cloud_logging
import librosa
import numpy as np
import soundfile as sf
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

# =============================================================================
# Configuration from environment variables
# =============================================================================
PROJECT_ID = os.environ.get("PROJECT_ID")
REGION = os.environ.get("REGION", "europe-west1")
BUCKET_RAW = os.environ.get("BUCKET_RAW")
BUCKET_PROC = os.environ.get("BUCKET_PROC")
BUCKET_ANALYTICS = os.environ.get("BUCKET_ANALYTICS")
BUCKET_REPORTS = os.environ.get("BUCKET_REPORTS")
USER_TZ = os.environ.get("USER_TZ", "Europe/Paris")

# Gemini model configuration (Gemini 2.x series)
# - gemini-2.0-flash-exp: Fast, cost-effective for real-time NLU (demo/prod)
# - gemini-2.5-pro: Advanced reasoning for weekly synthesis
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash-exp")
GEMINI_LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "global")  # Global required for Gemini 2.5

# =============================================================================
# Initialize clients
# =============================================================================
client_storage = storage.Client()
log_client = cloud_logging.Client()
log_client.setup_logging()

# Initialize Vertex AI with global location for Gemini 2.x models
# Gemini 2.5-pro and 2.0-flash are available in global endpoint
aiplatform.init(project=PROJECT_ID, location=GEMINI_LOCATION)


# =============================================================================
# Audio listing
# =============================================================================
def list_week_audio(prefix: str):
    """List all audio files for a given week prefix."""
    bucket = client_storage.bucket(BUCKET_RAW)
    blobs = bucket.list_blobs(prefix=prefix)
    uris = []
    for blob in blobs:
        if blob.name.endswith((".wav", ".mp3", ".flac")):
            uri = f"gs://{BUCKET_RAW}/{blob.name}"
            uris.append(uri)
    return uris


# =============================================================================
# Speech-to-Text (STT)
# =============================================================================
def stt_transcribe(gcs_uri: str, language_code="auto"):
    """
    Transcribe audio using Google Speech-to-Text v2 with batch recognition.
    
    Uses long-running recognition for audio files of any length (no 60s limit).
    Now supports automatic language detection!
    """
    client = speech_v2.SpeechClient()
    # Speech-to-Text v2 requires recognizer to be in global location
    recognizer = f"projects/{PROJECT_ID}/locations/global/recognizers/_"
    
    # Handle automatic language detection
    if language_code == "auto":
        # Support multiple common languages
        language_codes = ["fr-FR", "en-US", "es-ES", "ar-SA"]
        print(f"    🌍 Using automatic language detection: {', '.join(language_codes)}")
    else:
        language_codes = [language_code]
        print(f"    🗣️  Using language: {language_code}")
    
    # Configure batch recognition for longer audio files
    config = speech_v2.RecognitionConfig(
        auto_decoding_config=speech_v2.AutoDetectDecodingConfig(),
        language_codes=language_codes,
        model="long",  # Use 'long' model for general audio transcription
        features=speech_v2.RecognitionFeatures(
            enable_word_time_offsets=True,
            enable_automatic_punctuation=True,
        ),
    )
    
    file_metadata = speech_v2.BatchRecognizeFileMetadata(uri=gcs_uri)
    
    request = speech_v2.BatchRecognizeRequest(
        recognizer=recognizer,
        config=config,
        files=[file_metadata],
        recognition_output_config=speech_v2.RecognitionOutputConfig(
            inline_response_config=speech_v2.InlineOutputConfig(),
        ),
    )
    
    # Start long-running operation
    operation = client.batch_recognize(request=request)
    print(f"    Waiting for transcription to complete...")
    response = operation.result(timeout=300)  # 5 minute timeout
    
    # Extract results from batch response
    text_parts = []
    words = []
    
    # Debug: print response structure
    print(f"    Response type: {type(response)}")
    
    # Access the results for the specific URI
    if gcs_uri in response.results:
        file_result = response.results[gcs_uri]
        print(f"    File result type: {type(file_result)}")
        
        # Check for errors first
        if hasattr(file_result, 'error') and file_result.error and file_result.error.code != 0:
            error_code = file_result.error.code if hasattr(file_result.error, 'code') else 'UNKNOWN'
            error_msg = file_result.error.message if hasattr(file_result.error, 'message') else 'No error message'
            print(f"    ERROR in transcription - Code: {error_code}, Message: {error_msg}")
            raise Exception(f"Transcription failed (code {error_code}): {error_msg}")
        
        # Check if transcript exists
        if hasattr(file_result, 'transcript') and file_result.transcript:
            transcript = file_result.transcript
            
            if hasattr(transcript, 'results') and len(transcript.results) > 0:
                print(f"    Transcript results count: {len(transcript.results)}")
                
                for result in transcript.results:
                    if result.alternatives:
                        alt = result.alternatives[0]
                        text_parts.append(alt.transcript)
                        
                        # Extract word-level timestamps
                        if hasattr(alt, 'words'):
                            for w in alt.words:
                                words.append({
                                    "start": w.start_offset.total_seconds() if hasattr(w, 'start_offset') else 0,
                                    "end": w.end_offset.total_seconds() if hasattr(w, 'end_offset') else 0,
                                    "word": w.word,
                                    "confidence": w.confidence if hasattr(w, 'confidence') else 1.0
                                })
            else:
                print(f"    WARNING: Transcript exists but has no results (possibly silent audio or unsupported format)")
        elif hasattr(file_result, 'uri') and file_result.uri:
            # Results might be stored in GCS
            print(f"    Transcript stored in GCS: {file_result.uri}")
            raise Exception("GCS output not supported. Results should be inline.")
        else:
            print(f"    WARNING: No transcript found in file result")
            print(f"    This usually means the audio is silent, too short, or in an unsupported format.")
    else:
        available_keys = list(response.results.keys()) if hasattr(response, 'results') else []
        print(f"    ERROR: GCS URI '{gcs_uri}' not found in results. Available: {available_keys}")
        raise Exception(f"GCS URI not found in batch response results")
    
    text = " ".join(text_parts)
    
    if not text:
        print(f"    WARNING: Empty transcript returned. Audio may be silent or invalid.")
    
    return text, words


# =============================================================================
# File download helper
# =============================================================================
def download_to_tmp(gcs_uri: str) -> str:
    """Download GCS file to /tmp and return local path."""
    assert gcs_uri.startswith("gs://"), f"Invalid GCS URI: {gcs_uri}"
    
    # Parse gs://bucket/path
    parts = gcs_uri[5:].split("/", 1)
    bucket_name = parts[0]
    blob_path = parts[1]
    
    local = f"/tmp/{os.path.basename(blob_path)}"
    client_storage.bucket(bucket_name).blob(blob_path).download_to_filename(local)
    
    return local


# =============================================================================
# Prosody Analysis
# =============================================================================
def extract_prosody(local_path: str):
    """
    Extract prosodic features from audio:
    - Pitch (fundamental frequency)
    - Energy (RMS)
    - Pauses
    """
    # Load audio
    y, sr = librosa.load(local_path, sr=16000, mono=True)
    duration = librosa.get_duration(y=y, sr=sr)
    
    # Extract pitch using YIN algorithm
    f0 = librosa.yin(y, fmin=50, fmax=400)
    
    # Extract energy (RMS)
    rms = librosa.feature.rms(y=y)[0]
    energy_mean = float(np.mean(rms))
    energy_std = float(np.std(rms))
    
    # Pitch statistics (remove NaN values)
    f0 = f0[~np.isnan(f0)]
    pitch_mean = float(np.mean(f0)) if f0.size > 0 else 0.0
    pitch_std = float(np.std(f0)) if f0.size > 0 else 0.0
    
    # Detect pauses (segments where RMS is below threshold)
    threshold = np.percentile(rms, 20)
    pauses = rms < threshold
    
    # Count pause groups (transitions from non-pause to pause)
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


# =============================================================================
# NLU - Events & Emotions via Gemini
# =============================================================================
def nlu_events_emotions(transcript: str):
    """
    Use Gemini to extract:
    - Events mentioned
    - Emotions with confidence scores
    - Main themes
    """
    from vertexai.generative_models import GenerativeModel
    
    # Use Gemini 2.0 Flash for fast, cost-effective NLU processing
    # Upgrade path: gemini-1.5-* → gemini-2.0-flash (prod demo) / gemini-2.5-pro (weekly synthesis)
    model = GenerativeModel(GEMINI_MODEL)
    
    prompt = f"""
    From the following French journal transcript, list concise 'events' (bullet strings),
    infer emotions with confidences (0-1), and main themes (1-5 keywords).
    Return strict JSON with keys: events, emotions:[{{label,confidence}}], themes.
    
    Transcript:
    {transcript}
    """
    
    out = model.generate_content(
        prompt,
        generation_config={"response_mime_type": "application/json"}
    )
    
    return json.loads(out.text)


# =============================================================================
# Emotion Index Computation
# =============================================================================
def compute_index(emotions_list):
    """
    Compute mental health index (0-100) from emotions.
    Simple mapping - adjust later with more sophisticated scoring.
    """
    pos = {"joy", "gratitude", "calm", "hope", "happiness", "excitement"}
    neg = {"sadness", "anger", "fear", "anxiety", "stress", "worry"}
    
    score = 50  # Neutral baseline
    
    for e in emotions_list:
        label = e.get("label", "").lower()
        confidence = float(e.get("confidence", 0))
        
        if label in pos:
            score += 20 * confidence
        if label in neg:
            score -= 20 * confidence
    
    return max(0, min(100, score))


# =============================================================================
# Upload JSON to GCS
# =============================================================================
def upload_json(bucket_name, path, obj):
    """Upload Python object as JSON to GCS."""
    blob = client_storage.bucket(bucket_name).blob(path)
    blob.upload_from_string(
        json.dumps(obj, ensure_ascii=False, indent=2),
        content_type="application/json"
    )


# =============================================================================
# Report Generation
# =============================================================================
def render_weekly_report(week_key: str, sessions, emotion_index, trend, prosody_agg):
    """
    Generate HTML and PDF reports using Jinja2 template.
    """
    env = Environment(loader=FileSystemLoader("templates"))
    tpl = env.get_template("weekly.html.j2")
    
    html = tpl.render(
        week=week_key,
        sessions=sessions,
        emotion_index=emotion_index,
        trend=trend,
        prosody=prosody_agg
    )
    
    html_path = f"/tmp/{week_key}.html"
    pdf_path = f"/tmp/{week_key}.pdf"
    
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    
    HTML(filename=html_path).write_pdf(pdf_path)
    
    return html_path, pdf_path


# =============================================================================
# Main Pipeline
# =============================================================================
def main():
    """
    Main orchestration function.
    Accepts week key as argument (e.g., 2025-W41).
    """
    # Parse week key from command line
    week_key = sys.argv[1] if len(sys.argv) > 1 else dt.date.today().strftime("%G-W%V")
    
    print(f"🚀 Starting Mental Journal Pipeline for week: {week_key}")
    print(f"📍 Project: {PROJECT_ID}, Region: {REGION}")
    
    # List audio files for the week
    prefix = f"{week_key}/"
    uris = list_week_audio(prefix)
    print(f"🎵 Found {len(uris)} audio files under {prefix}")
    
    if len(uris) == 0:
        print("⚠️  No audio files found. Exiting.")
        return
    
    # Process each audio file
    transcripts = []
    prosodies = []
    emotions = []
    
    for i, uri in enumerate(uris, 1):
        print(f"\n📝 Processing file {i}/{len(uris)}: {uri}")
        
        # Extract session ID from filename
        sid = os.path.splitext(os.path.basename(uri))[0]
        
        # 1. Speech-to-Text
        print(f"  🎤 Transcribing...")
        text, words = stt_transcribe(uri)
        transcript_obj = {
            "session_id": sid,
            "audio_uri": uri,
            "language_code": "fr-FR",
            "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "transcript": text,
            "words": words,
        }
        transcripts.append(transcript_obj)
        upload_json(BUCKET_ANALYTICS, f"{week_key}/{sid}/transcript.json", transcript_obj)
        print(f"  ✅ Transcript: {len(text)} chars, {len(words)} words")
        
        # 2. Prosody Analysis
        print(f"  🎵 Analyzing prosody...")
        local = download_to_tmp(uri)
        pf = extract_prosody(local)
        pf.update({
            "session_id": sid,
            "created_at": dt.datetime.now(dt.timezone.utc).isoformat()
        })
        prosodies.append(pf)
        upload_json(BUCKET_ANALYTICS, f"{week_key}/{sid}/prosody_features.json", pf)
        print(f"  ✅ Prosody: pitch={pf['pitch_mean']:.1f}Hz, energy={pf['energy_mean']:.4f}")
        
        # 3. NLU - Events & Emotions
        print(f"  🧠 Extracting events & emotions...")
        nlu = nlu_events_emotions(text)
        
        # Calculate emotion index for this session
        session_score = compute_index(nlu.get("emotions", []))
        
        nlu.update({
            "session_id": sid,
            "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "emotion_index": round(session_score, 1)  # Add score to each session
        })
        emotions.append(nlu)
        upload_json(BUCKET_ANALYTICS, f"{week_key}/{sid}/events_emotions.json", nlu)
        print(f"  ✅ Events: {len(nlu.get('events', []))}, Emotions: {len(nlu.get('emotions', []))}, Score: {session_score:.1f}/100")
    
    # =============================================================================
    # Fusion & Weekly Report
    # =============================================================================
    print(f"\n📊 Generating weekly report...")
    
    # Compute emotion index for the week (average of all session scores)
    all_scores = [e.get("emotion_index", 50.0) for e in emotions if "emotion_index" in e]
    emotion_index = float(np.mean(all_scores)) if all_scores else 50.0
    
    # Collect individual session summaries with their scores
    session_summaries = []
    for i, nlu in enumerate(emotions):
        session_summary = {
            "session_id": nlu.get("session_id", f"session_{i+1}"),
            "emotion_index": nlu.get("emotion_index", 50.0),
            "events": nlu.get("events", [])[:3],  # Top 3 events
            "emotions": nlu.get("emotions", [])[:5],  # Top 5 emotions
        }
        session_summaries.append(session_summary)
    
    # TODO: Compare with last week to determine trend
    trend = "flat"
    
    # Aggregate prosody features
    prosody_agg = {
        "pitch_mean": float(np.mean([p["pitch_mean"] for p in prosodies])) if prosodies else 0,
        "energy_mean": float(np.mean([p["energy_mean"] for p in prosodies])) if prosodies else 0,
        "pause_rate": (
            float(np.mean([p["pause_count"] for p in prosodies])) /
            max(1, float(np.sum([p["duration_sec"] for p in prosodies])))
        ) if prosodies else 0
    }
    
    # Collect and prioritize highlights (limit to 6 most important)
    all_highlights = []
    for session_data in emotions:
        for event in session_data.get("events", []):
            # Score events by length and content (longer, more detailed events are prioritized)
            score = len(event.split())
            all_highlights.append((score, event))
    
    # Sort by score (descending) and take top 6
    all_highlights.sort(reverse=True, key=lambda x: x[0])
    top_highlights = [h[1] for h in all_highlights[:6]]
    
    # Create weekly report object
    weekly = {
        "week": week_key,
        "user_tz": USER_TZ,
        "sessions_count": len(uris),
        "emotion_index": round(emotion_index, 1),
        "trend": trend,
        "session_summaries": session_summaries,  # Individual session details with scores
        "highlights": top_highlights,
        "prosody_summary": prosody_agg,
    }
    
    # Upload weekly report JSON
    upload_json(BUCKET_ANALYTICS, f"{week_key}/weekly_report.json", weekly)
    
    # Generate HTML/PDF reports
    html_path, pdf_path = render_weekly_report(
        week_key,
        weekly["sessions_count"],
        weekly["emotion_index"],
        trend,
        prosody_agg
    )
    
    # Upload reports to GCS
    client_storage.bucket(BUCKET_REPORTS).blob(f"{week_key}/weekly_report.html").upload_from_filename(
        html_path, content_type="text/html"
    )
    client_storage.bucket(BUCKET_REPORTS).blob(f"{week_key}/weekly_report.pdf").upload_from_filename(
        pdf_path, content_type="application/pdf"
    )
    
    print(f"\n✨ Pipeline completed successfully!")
    print(f"📈 Weekly Emotion Index: {weekly['emotion_index']}/100 (average of {len(session_summaries)} sessions)")
    for summary in session_summaries:
        print(f"   • {summary['session_id']}: {summary['emotion_index']}/100")
    print(f"📊 Sessions Processed: {weekly['sessions_count']}")
    print(f"📄 Reports uploaded to: gs://{BUCKET_REPORTS}/{week_key}/")


if __name__ == "__main__":
    main()
