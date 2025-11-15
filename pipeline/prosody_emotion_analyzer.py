#!/usr/bin/env python3
"""
Prosody-based Emotion Detection Module
Analyse les caractéristiques prosodiques pour détecter les émotions en temps réel

Basé sur la recherche en phonétique affective:
- Stress/Anxiété: pitch élevé + variation haute + rythme rapide
- Tristesse: pitch bas + variation faible + pauses longues
- Joie: pitch moyen-haut + variation haute + énergie élevée
- Colère: pitch élevé + énergie très haute + rythme rapide
- Calme: pitch stable + variation faible + pauses régulières
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class EmotionLabel(str, Enum):
    """Émotions détectables par analyse prosodique"""
    JOY = "joie"
    SADNESS = "tristesse"
    ANGER = "colère"
    STRESS = "stress"
    CALM = "calme"
    FEAR = "peur"
    EXCITEMENT = "excitation"
    NEUTRAL = "neutre"


@dataclass
class EmotionScore:
    """Score d'émotion avec confiance"""
    label: EmotionLabel
    confidence: float  # 0.0 to 1.0
    
    def to_dict(self) -> dict:
        return {
            "label": self.label.value,
            "confidence": round(self.confidence, 3)
        }


@dataclass
class ProsodyFeatures:
    """Features prosodiques extraites de l'audio"""
    # Pitch (fundamental frequency)
    pitch_mean: float  # Hz
    pitch_std: float   # Hz (variation)
    pitch_range: float # Hz (max - min)
    
    # Energy
    energy_mean: float
    energy_std: float
    energy_max: float
    
    # Timing
    duration_sec: float
    speaking_rate: float  # words per minute (if available)
    pause_count: int
    pause_ratio: float    # % of time in pause
    
    # Rhythm
    syllable_rate: Optional[float] = None  # syllables per second
    
    def to_dict(self) -> dict:
        return {
            "pitch_mean_hz": round(self.pitch_mean, 2),
            "pitch_std_hz": round(self.pitch_std, 2),
            "pitch_range_hz": round(self.pitch_range, 2),
            "energy_mean": round(self.energy_mean, 4),
            "energy_std": round(self.energy_std, 4),
            "energy_max": round(self.energy_max, 4),
            "duration_sec": round(self.duration_sec, 2),
            "speaking_rate_wpm": round(self.speaking_rate, 1) if self.speaking_rate else None,
            "pause_count": self.pause_count,
            "pause_ratio": round(self.pause_ratio, 3)
        }


class ProsodyEmotionAnalyzer:
    """
    Analyseur d'émotions basé sur la prosodie
    
    Utilise des règles basées sur la recherche en phonétique affective
    pour détecter les émotions à partir des caractéristiques vocales.
    """
    
    # Référence normative (adulte moyen, conversation calme)
    BASELINE_PITCH_MEAN = 150.0  # Hz (homme: ~120, femme: ~210)
    BASELINE_PITCH_STD = 20.0    # Hz
    BASELINE_ENERGY = 0.03
    BASELINE_PAUSE_RATIO = 0.15
    
    def __init__(
        self, 
        baseline_pitch: float = BASELINE_PITCH_MEAN,
        baseline_energy: float = BASELINE_ENERGY
    ):
        """
        Args:
            baseline_pitch: Pitch de référence pour la normalisation (Hz)
            baseline_energy: Énergie de référence pour la normalisation
        """
        self.baseline_pitch = baseline_pitch
        self.baseline_energy = baseline_energy
    
    def analyze_emotions(
        self, 
        features: ProsodyFeatures,
        top_n: int = 3
    ) -> List[EmotionScore]:
        """
        Analyse les features prosodiques et retourne les émotions détectées
        
        Args:
            features: Features prosodiques extraites
            top_n: Nombre d'émotions à retourner (triées par confiance)
            
        Returns:
            Liste des émotions détectées avec scores de confiance
        """
        scores = {}
        
        # Calcul des ratios normalisés
        pitch_ratio = features.pitch_mean / self.baseline_pitch
        pitch_var_ratio = features.pitch_std / self.BASELINE_PITCH_STD
        energy_ratio = features.energy_mean / self.baseline_energy
        pause_ratio = features.pause_ratio
        
        # === JOIE ===
        # Pitch moyen-haut, variation élevée, énergie haute, pauses courtes
        joy_score = 0.0
        if pitch_ratio > 1.1:  # Pitch 10% au-dessus baseline
            joy_score += 0.3
        if pitch_var_ratio > 1.3:  # Variation importante
            joy_score += 0.3
        if energy_ratio > 1.2:  # Énergie élevée
            joy_score += 0.25
        if pause_ratio < 0.12:  # Peu de pauses
            joy_score += 0.15
        scores[EmotionLabel.JOY] = joy_score
        
        # === TRISTESSE ===
        # Pitch bas, variation faible, énergie basse, pauses longues
        sadness_score = 0.0
        if pitch_ratio < 0.9:  # Pitch bas
            sadness_score += 0.35
        if pitch_var_ratio < 0.7:  # Variation faible
            sadness_score += 0.25
        if energy_ratio < 0.8:  # Énergie basse
            sadness_score += 0.25
        if pause_ratio > 0.20:  # Pauses longues
            sadness_score += 0.15
        scores[EmotionLabel.SADNESS] = sadness_score
        
        # === COLÈRE ===
        # Pitch très élevé, variation haute, énergie très haute, rythme rapide
        anger_score = 0.0
        if pitch_ratio > 1.25:  # Pitch très haut
            anger_score += 0.3
        if features.pitch_range > 100:  # Grande amplitude
            anger_score += 0.25
        if energy_ratio > 1.5:  # Énergie très élevée
            anger_score += 0.3
        if pause_ratio < 0.10:  # Très peu de pauses (parle vite)
            anger_score += 0.15
        scores[EmotionLabel.ANGER] = anger_score
        
        # === STRESS/ANXIÉTÉ ===
        # Pitch élevé, variation haute, rythme irrégulier, pauses courtes
        stress_score = 0.0
        if pitch_ratio > 1.15:  # Pitch élevé
            stress_score += 0.25
        if pitch_var_ratio > 1.4:  # Variation très haute (voix tremblante)
            stress_score += 0.35
        if features.pause_count > features.duration_sec * 0.8:  # Pauses fréquentes
            stress_score += 0.25
        if energy_ratio > 1.1:  # Énergie légèrement élevée
            stress_score += 0.15
        scores[EmotionLabel.STRESS] = stress_score
        
        # === CALME ===
        # Pitch stable, variation faible, énergie modérée, pauses régulières
        calm_score = 0.0
        if 0.95 < pitch_ratio < 1.05:  # Pitch proche baseline
            calm_score += 0.3
        if pitch_var_ratio < 1.0:  # Variation faible
            calm_score += 0.3
        if 0.85 < energy_ratio < 1.15:  # Énergie modérée
            calm_score += 0.25
        if 0.12 < pause_ratio < 0.18:  # Pauses normales
            calm_score += 0.15
        scores[EmotionLabel.CALM] = calm_score
        
        # === PEUR ===
        # Pitch élevé, variation haute, énergie moyenne-haute, pauses irrégulières
        fear_score = 0.0
        if pitch_ratio > 1.2:  # Pitch élevé
            fear_score += 0.3
        if pitch_var_ratio > 1.3:  # Variation haute
            fear_score += 0.25
        if energy_ratio > 1.0:  # Énergie élevée
            fear_score += 0.2
        if features.pause_count > features.duration_sec * 0.6:  # Pauses fréquentes
            fear_score += 0.25
        scores[EmotionLabel.FEAR] = fear_score
        
        # === EXCITATION ===
        # Pitch moyen-haut, variation haute, énergie très haute, rythme rapide
        excitement_score = 0.0
        if pitch_ratio > 1.1:  # Pitch élevé
            excitement_score += 0.25
        if pitch_var_ratio > 1.2:  # Variation haute
            excitement_score += 0.25
        if energy_ratio > 1.4:  # Énergie très haute
            excitement_score += 0.35
        if features.speaking_rate and features.speaking_rate > 150:  # Parle vite
            excitement_score += 0.15
        scores[EmotionLabel.EXCITEMENT] = excitement_score
        
        # === NEUTRE ===
        # Tous les indicateurs proches de la baseline
        neutral_score = 0.0
        if 0.9 < pitch_ratio < 1.1:
            neutral_score += 0.3
        if 0.8 < pitch_var_ratio < 1.2:
            neutral_score += 0.3
        if 0.9 < energy_ratio < 1.1:
            neutral_score += 0.25
        if 0.10 < pause_ratio < 0.20:
            neutral_score += 0.15
        scores[EmotionLabel.NEUTRAL] = neutral_score
        
        # Normalisation des scores (softmax-like)
        total = sum(scores.values())
        if total > 0:
            scores = {k: v/total for k, v in scores.items()}
        
        # Conversion en EmotionScore et tri par confiance
        emotion_scores = [
            EmotionScore(label=label, confidence=score)
            for label, score in scores.items()
        ]
        emotion_scores.sort(key=lambda x: x.confidence, reverse=True)
        
        return emotion_scores[:top_n]
    
    def get_dominant_emotion(self, features: ProsodyFeatures) -> EmotionScore:
        """Retourne l'émotion dominante"""
        emotions = self.analyze_emotions(features, top_n=1)
        return emotions[0] if emotions else EmotionScore(EmotionLabel.NEUTRAL, 0.5)
    
    def get_emotional_state_summary(self, features: ProsodyFeatures) -> dict:
        """
        Retourne un résumé complet de l'état émotionnel
        
        Returns:
            Dict avec émotions détectées + interprétations des features
        """
        emotions = self.analyze_emotions(features, top_n=3)
        dominant = emotions[0]
        
        # Interprétation qualitative des features
        pitch_level = self._interpret_pitch(features.pitch_mean)
        energy_level = self._interpret_energy(features.energy_mean)
        speaking_speed = self._interpret_speaking_rate(features.speaking_rate, features.pause_ratio)
        pitch_variation = self._interpret_pitch_variation(features.pitch_std)
        
        return {
            "dominant_emotion": dominant.to_dict(),
            "all_emotions": [e.to_dict() for e in emotions],
            "vocal_characteristics": {
                "pitch_level": pitch_level,
                "pitch_variation": pitch_variation,
                "energy_level": energy_level,
                "speaking_speed": speaking_speed
            },
            "prosody_raw": features.to_dict()
        }
    
    def _interpret_pitch(self, pitch_mean: float) -> str:
        """Interprète le pitch moyen en terme qualitatif"""
        ratio = pitch_mean / self.baseline_pitch
        if ratio < 0.85:
            return "very_low"
        elif ratio < 0.95:
            return "low"
        elif ratio < 1.05:
            return "normal"
        elif ratio < 1.15:
            return "high"
        else:
            return "very_high"
    
    def _interpret_energy(self, energy_mean: float) -> str:
        """Interprète l'énergie en terme qualitatif"""
        ratio = energy_mean / self.baseline_energy
        if ratio < 0.7:
            return "very_low"
        elif ratio < 0.9:
            return "low"
        elif ratio < 1.1:
            return "normal"
        elif ratio < 1.3:
            return "high"
        else:
            return "very_high"
    
    def _interpret_pitch_variation(self, pitch_std: float) -> str:
        """Interprète la variation de pitch"""
        ratio = pitch_std / self.BASELINE_PITCH_STD
        if ratio < 0.6:
            return "monotone"
        elif ratio < 0.9:
            return "low_variation"
        elif ratio < 1.2:
            return "normal_variation"
        elif ratio < 1.5:
            return "high_variation"
        else:
            return "very_expressive"
    
    def _interpret_speaking_rate(self, speaking_rate: Optional[float], pause_ratio: float) -> str:
        """Interprète la vitesse d'élocution"""
        # Si on a le speaking rate (mots/min)
        if speaking_rate:
            if speaking_rate < 100:
                return "very_slow"
            elif speaking_rate < 130:
                return "slow"
            elif speaking_rate < 170:
                return "normal"
            elif speaking_rate < 200:
                return "fast"
            else:
                return "very_fast"
        
        # Sinon, on estime via le pause_ratio
        if pause_ratio > 0.25:
            return "very_slow"
        elif pause_ratio > 0.18:
            return "slow"
        elif pause_ratio > 0.12:
            return "normal"
        elif pause_ratio > 0.08:
            return "fast"
        else:
            return "very_fast"


def extract_prosody_with_emotions(
    y: np.ndarray,
    sr: int,
    word_count: Optional[int] = None
) -> dict:
    """
    Fonction helper pour extraire les features prosodiques ET analyser les émotions
    
    Args:
        y: Signal audio (numpy array)
        sr: Sample rate
        word_count: Nombre de mots (optionnel, pour calcul speaking rate)
    
    Returns:
        Dict avec features + émotions détectées
    """
    import librosa
    
    duration = librosa.get_duration(y=y, sr=sr)
    
    # Extract pitch using YIN algorithm
    f0 = librosa.yin(y, fmin=50, fmax=400)
    f0_clean = f0[~np.isnan(f0)]
    
    pitch_mean = float(np.mean(f0_clean)) if f0_clean.size > 0 else 150.0
    pitch_std = float(np.std(f0_clean)) if f0_clean.size > 0 else 0.0
    pitch_min = float(np.min(f0_clean)) if f0_clean.size > 0 else pitch_mean
    pitch_max = float(np.max(f0_clean)) if f0_clean.size > 0 else pitch_mean
    pitch_range = pitch_max - pitch_min
    
    # Extract energy (RMS)
    rms = librosa.feature.rms(y=y)[0]
    energy_mean = float(np.mean(rms))
    energy_std = float(np.std(rms))
    energy_max = float(np.max(rms))
    
    # Detect pauses
    threshold = np.percentile(rms, 20)
    pauses = rms < threshold
    pause_count = int(np.sum((~pauses[:-1] & pauses[1:])))
    pause_frames = np.sum(pauses)
    pause_ratio = float(pause_frames / len(rms))
    
    # Speaking rate (if word count available)
    speaking_rate = None
    if word_count and duration > 0:
        speaking_rate = (word_count / duration) * 60  # words per minute
    
    # Create ProsodyFeatures object
    features = ProsodyFeatures(
        pitch_mean=pitch_mean,
        pitch_std=pitch_std,
        pitch_range=pitch_range,
        energy_mean=energy_mean,
        energy_std=energy_std,
        energy_max=energy_max,
        duration_sec=duration,
        speaking_rate=speaking_rate,
        pause_count=pause_count,
        pause_ratio=pause_ratio
    )
    
    # Analyze emotions
    analyzer = ProsodyEmotionAnalyzer(baseline_pitch=pitch_mean * 0.95)  # Auto-calibration
    emotional_state = analyzer.get_emotional_state_summary(features)
    
    return emotional_state


# =============================================================================
# Real-time streaming support
# =============================================================================
class StreamingProsodyAnalyzer:
    """
    Analyseur prosodique pour streaming audio en temps réel
    
    Accumule les chunks audio et analyse par fenêtres glissantes
    """
    
    def __init__(
        self,
        sample_rate: int = 16000,
        window_duration: float = 3.0,  # secondes
        hop_duration: float = 1.0      # secondes
    ):
        """
        Args:
            sample_rate: Taux d'échantillonnage de l'audio
            window_duration: Durée de la fenêtre d'analyse
            hop_duration: Décalage entre chaque analyse
        """
        self.sr = sample_rate
        self.window_size = int(window_duration * sample_rate)
        self.hop_size = int(hop_duration * sample_rate)
        
        self.buffer = np.array([], dtype=np.float32)
        self.analyzer = ProsodyEmotionAnalyzer()
        
        self.emotion_history: List[EmotionScore] = []
    
    def add_audio_chunk(self, chunk: np.ndarray) -> Optional[dict]:
        """
        Ajoute un chunk audio et retourne l'analyse si fenêtre complète
        
        Args:
            chunk: Nouveau chunk audio (numpy array)
            
        Returns:
            Analyse émotionnelle si fenêtre complète, None sinon
        """
        # Ajouter au buffer
        self.buffer = np.concatenate([self.buffer, chunk])
        
        # Si on a assez de données, analyser
        if len(self.buffer) >= self.window_size:
            # Analyser la fenêtre
            window = self.buffer[:self.window_size]
            result = extract_prosody_with_emotions(window, self.sr)
            
            # Garder historique
            dominant = result['dominant_emotion']
            self.emotion_history.append(
                EmotionScore(
                    label=EmotionLabel(dominant['label']),
                    confidence=dominant['confidence']
                )
            )
            
            # Décaler le buffer
            self.buffer = self.buffer[self.hop_size:]
            
            return result
        
        return None
    
    def get_emotion_trend(self, last_n: int = 5) -> EmotionLabel:
        """
        Retourne l'émotion dominante sur les N dernières analyses
        
        Args:
            last_n: Nombre d'analyses à considérer
            
        Returns:
            Émotion la plus fréquente
        """
        if not self.emotion_history:
            return EmotionLabel.NEUTRAL
        
        recent = self.emotion_history[-last_n:]
        
        # Compter les occurrences
        counts = {}
        for emotion in recent:
            counts[emotion.label] = counts.get(emotion.label, 0) + emotion.confidence
        
        # Retourner la plus fréquente
        return max(counts.items(), key=lambda x: x[1])[0]
    
    def reset(self):
        """Reset le buffer et l'historique"""
        self.buffer = np.array([], dtype=np.float32)
        self.emotion_history = []
