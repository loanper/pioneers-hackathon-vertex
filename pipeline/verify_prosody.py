#!/usr/bin/env python3
"""
Script de vérification simple pour tester l'analyse prosodique
Usage: python verify_prosody.py <audio_file.wav>
"""

import sys
import librosa
import numpy as np
from prosody_emotion_analyzer import StreamingProsodyAnalyzer

def verify_prosody(audio_file: str):
    """Test l'analyzer avec un fichier audio réel"""
    print(f"🎵 Chargement de {audio_file}...")
    
    # Charger l'audio
    audio, sr = librosa.load(audio_file, sr=16000, mono=True)
    print(f"✅ Audio chargé: {len(audio)} samples, {sr} Hz, durée: {len(audio)/sr:.2f}s")
    
    # Créer l'analyzer
    analyzer = StreamingProsodyAnalyzer(sample_rate=sr)
    print("✅ Analyzer créé")
    
    # Simuler du streaming par chunks de 0.5s
    chunk_size = int(0.5 * sr)  # 0.5 secondes
    num_chunks = len(audio) // chunk_size
    
    print(f"\n🔄 Traitement en {num_chunks} chunks de 0.5s...")
    
    results = []
    for i in range(num_chunks):
        start = i * chunk_size
        end = start + chunk_size
        chunk = audio[start:end]
        
        result = analyzer.process_chunk(chunk)
        if result:
            results.append(result)
            emotion = result["dominant_emotion"]
            conf = result["confidence"]
            print(f"  Chunk {i+1}/{num_chunks}: {emotion} ({conf:.2f})")
    
    # Résumé
    if results:
        print(f"\n📊 RÉSUMÉ:")
        print(f"  Total d'analyses: {len(results)}")
        
        # Émotion la plus fréquente
        emotions = [r["dominant_emotion"] for r in results]
        most_common = max(set(emotions), key=emotions.count)
        frequency = emotions.count(most_common) / len(emotions) * 100
        
        print(f"  Émotion dominante: {most_common} ({frequency:.1f}% du temps)")
        
        # Confiance moyenne
        avg_conf = np.mean([r["confidence"] for r in results])
        print(f"  Confiance moyenne: {avg_conf:.2f}")
        
        # Dernier résultat complet
        print(f"\n🎯 DERNIER RÉSULTAT:")
        import json
        print(json.dumps(results[-1], indent=2, ensure_ascii=False))
    else:
        print("❌ Aucun résultat obtenu")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python verify_prosody.py <audio_file.wav>")
        sys.exit(1)
    
    verify_prosody(sys.argv[1])
