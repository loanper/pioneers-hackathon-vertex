#!/usr/bin/env python3
"""
Audio Upload Trigger
Automatically triggers the weekly pipeline when new audio is uploaded
"""

import os
import functions_framework
from google.cloud import run_v2
from cloudevents.http import CloudEvent

from datetime import datetime, timedelta
import os

PROJECT_ID = os.environ.get("PROJECT_ID", "build-unicorn25par-4813")
REGION = os.environ.get("REGION", "europe-west1")
JOB_NAME = "pz-weekly-pipeline"


@functions_framework.cloud_event
def trigger_pipeline(cloud_event: CloudEvent):
    """
    Triggered when a new audio file is uploaded to the raw bucket.
    Extracts the week from the file path and triggers the pipeline.
    """
    data = cloud_event.data
    
    # Get the file name from the event
    file_name = data["name"]
    bucket = data["bucket"]
    
    print(f"📁 New file uploaded: gs://{bucket}/{file_name}")
    
    # Extract week from path (format: YYYY-WXX/session_*/audio.wav)
    parts = file_name.split("/")
    if len(parts) < 2:
        print(f"⚠️  Skipping: File path doesn't contain week folder")
        return
    
    week = parts[0]
    
    # Validate week format (YYYY-WXX)
    if not week or len(week) != 8 or not week.startswith("20") or "-W" not in week:
        print(f"⚠️  Skipping: Invalid week format '{week}'")
        return
    
    # Only trigger for audio files
    if not file_name.endswith((".wav", ".mp3", ".flac", ".webm")):
        print(f"⚠️  Skipping: Not an audio file")
        return
    
    print(f"🚀 Triggering pipeline for week: {week}")
    
    # Trigger Cloud Run Job
    try:
        client = run_v2.JobsClient()
        job_path = f"projects/{PROJECT_ID}/locations/{REGION}/jobs/{JOB_NAME}"
        
        request = run_v2.RunJobRequest(
            name=job_path,
            overrides=run_v2.RunJobRequest.Overrides(
                container_overrides=[
                    run_v2.RunJobRequest.Overrides.ContainerOverride(
                        args=[week]
                    )
                ]
            )
        )
        
        operation = client.run_job(request=request)
        execution = operation.result()
        
        print(f"✅ Pipeline triggered successfully!")
        print(f"   Execution: {execution.name}")
        
    except Exception as e:
        print(f"❌ Error triggering pipeline: {e}")
        raise
