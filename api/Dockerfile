# Mental Journal API - Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for audio processing and PDF generation
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    libxml2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libjpeg62-turbo \
    && rm -rf /var/lib/apt/lists/*

# Copy shared requirements and install Python dependencies
COPY pipeline/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy API code
COPY api/ /app/api/

# Copy pipeline code (needed for shared functions)
COPY pipeline/ /app/pipeline/

# Copy templates (needed for report generation)
COPY templates/ /app/report_templates/

# Environment variables
ENV PROJECT_ID=""
ENV REGION="europe-west1"
ENV BUCKET_RAW=""
ENV BUCKET_ANALYTICS=""
ENV BUCKET_REPORTS=""
ENV GEMINI_MODEL="gemini-2.0-flash-exp"
ENV GOOGLE_CLOUD_LOCATION="global"

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Run FastAPI with Uvicorn
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "info"]
