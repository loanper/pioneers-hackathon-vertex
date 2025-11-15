FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libffi8 libxml2 libxslt1.1 libpango-1.0-0 libpangoft2-1.0-0 \
    libcairo2 libjpeg62-turbo \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pipeline/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pipeline/*.py .
COPY templates ./templates

# Entrypoint accepts a week key, e.g. 2025-W41
ENTRYPOINT ["python", "main.py"]
