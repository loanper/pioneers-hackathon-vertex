FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir flask google-cloud-run gunicorn
COPY trigger_service.py .
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 trigger_service:app
