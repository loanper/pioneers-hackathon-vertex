#!/usr/bin/env python3
"""
Mental Journal API - FastAPI Backend
Provides REST endpoints for the Next.js frontend
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os

from api.routers import health, upload, sessions, reports, orchestration, live_prosody

# =============================================================================
# Configuration
# =============================================================================
from google.auth.transport.requests import Request

# Environment
PROJECT_ID = os.environ.get("PROJECT_ID", "build-unicorn25par-4813")
REGION = os.environ.get("REGION", "europe-west1")

# =============================================================================
# FastAPI App
# =============================================================================
app = FastAPI(
    title="Mental Journal API",
    description="Backend API pour l'analyse vocale de journal mental hebdomadaire",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# =============================================================================
# CORS Middleware
# =============================================================================
# Allow frontend (local dev + production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://pizza-pipeline.app",  # Remplace par ton domaine prod
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# Logging Configuration
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# =============================================================================
# Exception Handler
# =============================================================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler for better error responses"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": str(exc),
            "path": str(request.url),
        },
    )

# =============================================================================
# Route Inclusion
# =============================================================================
# Santé & méta
app.include_router(health.router, tags=["Health"])

# Upload & ingestion
app.include_router(upload.router, prefix="/v1", tags=["Upload"])

# Sessions & semaines
app.include_router(sessions.router, prefix="/v1", tags=["Sessions"])

# Rapports
app.include_router(reports.router, prefix="/v1", tags=["Reports"])

# Orchestration (run pipeline)
app.include_router(orchestration.router, prefix="/v1", tags=["Orchestration"])

# Live prosody analysis (WebSocket for real-time emotion detection)
app.include_router(live_prosody.router, prefix="/v1", tags=["Live Prosody"])

# =============================================================================
# Startup Event
# =============================================================================
@app.on_event("startup")
async def startup_event():
    """Log startup information"""
    logger.info(f"🚀 Mental Journal API starting...")
    logger.info(f"📍 Project: {PROJECT_ID}")
    logger.info(f"🌍 Region: {REGION}")
    logger.info(f"📚 Docs: http://localhost:8080/docs")

# =============================================================================
# Root Endpoint
# =============================================================================
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint - API information
    """
    return {
        "service": "pizza-api",
        "version": "1.0.0",
        "project": PROJECT_ID,
        "region": REGION,
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="info")
