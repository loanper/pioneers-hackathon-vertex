"""
Live Prosody Analysis WebSocket Endpoint
Pour l'intégration avec Gemini Live API en temps réel
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import numpy as np
import json
import base64
import logging

# Import le module d'analyse prosodique
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../pipeline'))
from prosody_emotion_analyzer import StreamingProsodyAnalyzer

router = APIRouter()
logger = logging.getLogger(__name__)

# Store active analyzers per session
active_sessions: Dict[str, StreamingProsodyAnalyzer] = {}


@router.websocket("/ws/prosody/{session_id}")
async def websocket_prosody_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint pour l'analyse prosodique en temps réel
    
    Le client envoie des chunks audio (base64 ou raw bytes)
    Le serveur retourne l'analyse émotionnelle quand disponible
    
    Format des messages reçus:
    {
        "audio": "base64_encoded_audio",  // ou bytes directement
        "sample_rate": 16000
    }
    
    Format des messages envoyés:
    {
        "type": "emotion_update",
        "dominant_emotion": "stress",
        "confidence": 0.85,
        "top_emotions": [...],
        "vocal_characteristics": {...}
    }
    """
    await websocket.accept()
    logger.info(f"🎙️ WebSocket connection established for session {session_id}")
    
    # Create analyzer for this session
    analyzer = StreamingProsodyAnalyzer(sample_rate=16000)
    active_sessions[session_id] = analyzer
    
    try:
        while True:
            # Receive audio chunk
            data = await websocket.receive()
            
            # Handle text (JSON) messages
            if "text" in data:
                message = json.loads(data["text"])
                
                # Decode base64 audio if present
                if "audio" in message:
                    audio_bytes = base64.b64decode(message["audio"])
                    audio_array = np.frombuffer(audio_bytes, dtype=np.float32)
                    
                    # Process the chunk
                    result = analyzer.process_chunk(audio_array)
                    
                    # Send result if available (every 2 seconds)
                    if result:
                        await websocket.send_json({
                            "type": "emotion_update",
                            "session_id": session_id,
                            **result
                        })
            
            # Handle binary messages (raw audio bytes)
            elif "bytes" in data:
                audio_array = np.frombuffer(data["bytes"], dtype=np.float32)
                
                # Process the chunk
                result = analyzer.process_chunk(audio_array)
                
                # Send result if available
                if result:
                    await websocket.send_json({
                        "type": "emotion_update",
                        "session_id": session_id,
                        **result
                    })
    
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket disconnected for session {session_id}")
        # Get final summary
        if session_id in active_sessions:
            summary = active_sessions[session_id].get_emotion_summary()
            logger.info(f"📊 Session summary: {summary}")
            del active_sessions[session_id]
    
    except Exception as e:
        logger.error(f"❌ WebSocket error for session {session_id}: {e}")
        if session_id in active_sessions:
            del active_sessions[session_id]
        await websocket.close(code=1011, reason=str(e))


@router.get("/prosody/session/{session_id}/summary")
async def get_session_summary(session_id: str):
    """
    Récupère le résumé émotionnel d'une session en cours
    
    Retourne:
    {
        "session_id": "session_123",
        "total_analyses": 50,
        "emotion_distribution": {
            "stress": 0.4,
            "calm": 0.3,
            "neutral": 0.3
        },
        "dominant_emotion_overall": "stress",
        "average_confidence": 0.78
    }
    """
    if session_id not in active_sessions:
        return {
            "error": "Session not found or not active",
            "session_id": session_id
        }
    
    analyzer = active_sessions[session_id]
    summary = analyzer.get_emotion_summary()
    
    return {
        "session_id": session_id,
        **summary
    }


@router.post("/prosody/session/{session_id}/reset")
async def reset_session(session_id: str):
    """
    Réinitialise l'analyzer pour une session
    Utile pour démarrer une nouvelle conversation
    """
    if session_id in active_sessions:
        del active_sessions[session_id]
    
    # Create new analyzer
    active_sessions[session_id] = StreamingProsodyAnalyzer(sample_rate=16000)
    
    return {
        "message": "Session reset successfully",
        "session_id": session_id
    }
