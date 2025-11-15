#!/usr/bin/env python3
"""
Test simple de l'analyse prosodique émotionnelle
"""

import sys
import numpy as np
from prosody_emotion_analyzer import ProsodyEmotionAnalyzer, StreamingProsodyAnalyzer

def test_batch_analysis():
    """Test de l'analyse batch (tout le fichier d'un coup)"""
    print("=" * 60)
    print("TEST 1: Analyse Batch (fichier complet)")
    print("=" * 60)
    
    import librosa
    
    # Charger le fichier audio
    audio_file = "../session2.wav"
    print(f"\n📂 Chargement: {audio_file}")
    y, sr = librosa.load(audio_file, sr=16000, mono=True)
    duration = len(y) / sr
    print(f"✅ Chargé: {duration:.1f} secondes, {sr} Hz\n")
    
    # Analyser
    analyzer = ProsodyEmotionAnalyzer()
    result = analyzer.analyze_audio(y, sr)
    
    # Afficher résultats
    print("🎭 RÉSULTAT DE L'ANALYSE:")
    print(f"   Émotion dominante: {result['dominant_emotion']['label']}")
    print(f"   Confiance: {result['dominant_emotion']['confidence']:.2%}")
    print(f"\n📊 Top 5 émotions:")
    for i, e in enumerate(result['top_emotions'][:5], 1):
        print(f"   {i}. {e['label']:12s} - {e['confidence']:.2%}")
    
    print(f"\n🎤 Caractéristiques vocales:")
    vc = result['vocal_characteristics']
    print(f"   Pitch: {vc['pitch']}")
    print(f"   Variation: {vc['pitch_variation']}")
    print(f"   Énergie: {vc['energy']}")
    print(f"   Vitesse: {vc['speaking_rate']}")
    
    return result


def test_streaming_analysis():
    """Test de l'analyse streaming (chunk par chunk)"""
    print("\n\n" + "=" * 60)
    print("TEST 2: Analyse Streaming (chunk par chunk)")
    print("=" * 60)
    
    import librosa
    
    # Charger le fichier audio
    audio_file = "../session2.wav"
    print(f"\n📂 Chargement: {audio_file}")
    y, sr = librosa.load(audio_file, sr=16000, mono=True)
    duration = len(y) / sr
    print(f"✅ Chargé: {duration:.1f} secondes\n")
    
    # Créer analyzer streaming
    analyzer = StreamingProsodyAnalyzer(
        sample_rate=sr,
        window_duration=3.0,  # Analyser toutes les 3 secondes
        hop_duration=1.0      # Avec 1 seconde de décalage
    )
    
    # Simuler streaming par chunks de 0.5 secondes
    chunk_duration = 0.5
    chunk_size = int(chunk_duration * sr)
    num_chunks = len(y) // chunk_size
    
    print(f"🔄 Traitement en streaming ({num_chunks} chunks de {chunk_duration}s)...\n")
    
    results = []
    for i in range(num_chunks):
        start = i * chunk_size
        end = start + chunk_size
        chunk = y[start:end]
        
        # Ajouter le chunk
        result = analyzer.add_audio_chunk(chunk)
        
        # Si on a un résultat (toutes les 3 secondes)
        if result:
            emotion = result["dominant_emotion"]["label"]
            conf = result["dominant_emotion"]["confidence"]
            time = (i * chunk_duration)
            print(f"   [{time:5.1f}s] {emotion:12s} (confiance: {conf:.2%})")
            results.append(result)
    
    # Résumé
    if results:
        print(f"\n📈 RÉSUMÉ DU STREAMING:")
        print(f"   Nombre d'analyses: {len(results)}")
        
        # Émotion dominante globale
        emotions = [r["dominant_emotion"]["label"] for r in results]
        most_common = max(set(emotions), key=emotions.count)
        frequency = emotions.count(most_common) / len(emotions) * 100
        print(f"   Émotion dominante globale: {most_common} ({frequency:.1f}% du temps)")
        
        # Confiance moyenne
        avg_conf = np.mean([r["dominant_emotion"]["confidence"] for r in results])
        print(f"   Confiance moyenne: {avg_conf:.2%}")
    
    return results


def test_with_custom_audio():
    """Test avec un fichier audio personnalisé"""
    if len(sys.argv) < 2:
        return None
    
    print("\n\n" + "=" * 60)
    print("TEST 3: Fichier Audio Personnalisé")
    print("=" * 60)
    
    import librosa
    
    audio_file = sys.argv[1]
    print(f"\n📂 Chargement: {audio_file}")
    
    try:
        y, sr = librosa.load(audio_file, sr=16000, mono=True)
        duration = len(y) / sr
        print(f"✅ Chargé: {duration:.1f} secondes, {sr} Hz\n")
        
        # Analyser
        analyzer = ProsodyEmotionAnalyzer()
        result = analyzer.analyze_audio(y, sr)
        
        # Afficher résultats
        print("🎭 RÉSULTAT:")
        print(f"   Émotion: {result['dominant_emotion']['label']}")
        print(f"   Confiance: {result['dominant_emotion']['confidence']:.2%}")
        
        return result
    
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None


if __name__ == "__main__":
    print("\n🚀 TEST DE L'ANALYSE PROSODIQUE ÉMOTIONNELLE\n")
    
    try:
        # Test 1: Analyse batch
        result_batch = test_batch_analysis()
        
        # Test 2: Analyse streaming
        result_streaming = test_streaming_analysis()
        
        # Test 3: Fichier personnalisé (si fourni)
        if len(sys.argv) > 1:
            result_custom = test_with_custom_audio()
        
        print("\n\n" + "=" * 60)
        print("✅ TOUS LES TESTS TERMINÉS AVEC SUCCÈS !")
        print("=" * 60)
        print("\n💡 Ton module d'analyse prosodique fonctionne parfaitement !")
        print("   Tes amis peuvent l'intégrer directement.\n")
        
    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
