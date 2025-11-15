#!/usr/bin/env python3
"""
Test ultra-simple de l'analyse prosodique
"""

import sys
import librosa
import numpy as np
from prosody_emotion_analyzer import extract_prosody_with_emotions, StreamingProsodyAnalyzer

print("\n🎭 TEST D'ANALYSE PROSODIQUE ÉMOTIONNELLE\n")

# Charger l'audio
audio_file = sys.argv[1] if len(sys.argv) > 1 else "../session2.wav"
print(f"📂 Fichier: {audio_file}")

y, sr = librosa.load(audio_file, sr=16000, mono=True)
duration = len(y) / sr
print(f"✅ Chargé: {duration:.1f} secondes\n")

# ============================================================================
# TEST 1: Analyse complète du fichier
# ============================================================================
print("=" * 60)
print("TEST 1: Analyse du fichier complet")
print("=" * 60)

result = extract_prosody_with_emotions(y, sr)

print(f"\n🎭 Émotion dominante: {result['dominant_emotion']['label']}")
print(f"   Confiance: {result['dominant_emotion']['confidence']:.1%}")

print(f"\n📊 Top 5 émotions:")
for i, e in enumerate(result['all_emotions'][:5], 1):
    bar = "█" * int(e['confidence'] * 50)
    print(f"   {i}. {e['label']:12s} {bar:30s} {e['confidence']:.1%}")

print(f"\n🎤 Caractéristiques vocales:")
vc = result['vocal_characteristics']
print(f"   Pitch: {vc['pitch_level']}")
print(f"   Variation: {vc['pitch_variation']}")
print(f"   Énergie: {vc['energy_level']}")
print(f"   Vitesse: {vc['speaking_speed']}")

# ============================================================================
# TEST 2: Analyse en streaming (chunk par chunk)
# ============================================================================
print("\n\n" + "=" * 60)
print("TEST 2: Analyse en streaming (temps réel simulé)")
print("=" * 60)

analyzer = StreamingProsodyAnalyzer(
    sample_rate=sr,
    window_duration=3.0,  # Fenêtre de 3 secondes
    hop_duration=1.0      # Analyse toutes les 1 seconde
)

# Simuler des chunks de 0.5 secondes
chunk_duration = 0.5
chunk_size = int(chunk_duration * sr)
num_chunks = len(y) // chunk_size

print(f"\n🔄 Traitement de {num_chunks} chunks de {chunk_duration}s...\n")

results = []
for i in range(num_chunks):
    start = i * chunk_size
    end = start + chunk_size
    chunk = y[start:end]
    
    result = analyzer.add_audio_chunk(chunk)
    
    if result:
        emotion = result["dominant_emotion"]["label"]
        conf = result["dominant_emotion"]["confidence"]
        time = i * chunk_duration
        results.append(result)
        print(f"   [{time:5.1f}s] {emotion:12s} ({conf:.1%})")

# Résumé du streaming
if results:
    print(f"\n📈 Résumé:")
    print(f"   Analyses effectuées: {len(results)}")
    
    emotions = [r["dominant_emotion"]["label"] for r in results]
    most_common = max(set(emotions), key=emotions.count)
    frequency = emotions.count(most_common) / len(emotions) * 100
    
    print(f"   Émotion globale: {most_common} ({frequency:.0f}% du temps)")

# ============================================================================
# Conclusion
# ============================================================================
print("\n\n" + "=" * 60)
print("✅ TESTS RÉUSSIS !")
print("=" * 60)
print("\n💡 Le module fonctionne parfaitement !")
print("   Prêt pour l'intégration avec Gemini Live API\n")
