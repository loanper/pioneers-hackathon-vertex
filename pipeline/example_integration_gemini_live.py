#!/usr/bin/env python3
"""
Exemple d'intégration côté ami #1 (Gemini Live API)
Ce script montre comment intégrer l'analyse prosodique avec Gemini Live API
"""

import asyncio
import numpy as np
from prosody_emotion_analyzer import StreamingProsodyAnalyzer

async def gemini_live_with_prosody():
    """
    Exemple d'intégration avec Gemini Live API
    
    Ton ami #1 doit:
    1. Recevoir les chunks audio du Gemini Live API
    2. Les passer à l'analyzer
    3. Envoyer les émotions détectées à l'ami #2 (n8n)
    """
    
    # 1. Créer l'analyzer (une seule fois au début de la session)
    analyzer = StreamingProsodyAnalyzer(sample_rate=16000)
    print("✅ Analyzer créé, prêt pour le streaming")
    
    # 2. Simuler la réception de chunks depuis Gemini Live API
    # En vrai, ça vient de: gemini_live_client.receive_audio_chunk()
    
    async for audio_chunk in simulate_gemini_live_stream():
        # 3. Analyser le chunk
        result = analyzer.process_chunk(audio_chunk)
        
        # 4. Si on a un résultat (toutes les 2 secondes)
        if result:
            emotion = result["dominant_emotion"]
            confidence = result["confidence"]
            
            print(f"\n🎭 Émotion détectée: {emotion} (confiance: {confidence:.2f})")
            print(f"📊 Caractéristiques vocales: {result['vocal_characteristics']}")
            
            # 5. Envoyer à l'ami #2 (n8n) via webhook ou API
            await send_to_n8n(result)
    
    # 6. À la fin de la session, récupérer le résumé
    summary = analyzer.get_emotion_summary()
    print(f"\n📈 Résumé de la session:")
    print(f"   Total d'analyses: {summary['total_analyses']}")
    print(f"   Émotion dominante: {summary['dominant_emotion_overall']}")
    print(f"   Distribution: {summary['emotion_distribution']}")


async def simulate_gemini_live_stream():
    """
    Simule le stream audio de Gemini Live API
    
    En vrai, ton ami #1 recevra ça de:
    async for chunk in gemini_live_session.receive():
        audio_data = chunk.audio  # numpy array ou bytes
        yield audio_data
    """
    # Générer 10 chunks de 0.5 secondes (total 5 secondes)
    sample_rate = 16000
    chunk_duration = 0.5  # secondes
    chunk_size = int(sample_rate * chunk_duration)
    
    for i in range(10):
        # Générer un chunk audio simulé
        # En vrai, ça vient directement de Gemini Live API
        audio_chunk = np.random.randn(chunk_size).astype(np.float32) * 0.1
        
        # Simuler un délai réseau
        await asyncio.sleep(0.5)
        
        yield audio_chunk


async def send_to_n8n(emotion_result: dict):
    """
    Envoyer le résultat de l'analyse à n8n (webhook)
    
    Ton ami #2 configure un webhook n8n qui reçoit:
    POST https://n8n.example.com/webhook/prosody-emotion
    
    Body:
    {
        "emotion": "stress",
        "confidence": 0.85,
        "vocal_characteristics": {...}
    }
    """
    import aiohttp
    
    # URL du webhook n8n (à configurer par l'ami #2)
    N8N_WEBHOOK_URL = "https://your-n8n-instance.com/webhook/prosody-emotion"
    
    payload = {
        "emotion": emotion_result["dominant_emotion"],
        "confidence": emotion_result["confidence"],
        "top_emotions": emotion_result["top_emotions"],
        "vocal_characteristics": emotion_result["vocal_characteristics"]
    }
    
    # En vrai, décommenter cette partie:
    # async with aiohttp.ClientSession() as session:
    #     async with session.post(N8N_WEBHOOK_URL, json=payload) as response:
    #         print(f"   → Envoyé à n8n: {response.status}")
    
    print(f"   → À envoyer à n8n: {payload['emotion']} ({payload['confidence']:.2f})")


if __name__ == "__main__":
    print("🚀 Exemple d'intégration Gemini Live API + Analyse Prosodique\n")
    asyncio.run(gemini_live_with_prosody())
