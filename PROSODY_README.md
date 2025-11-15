# Module d'Analyse Prosodique Émotionnelle 🎭

Module pour détecter les émotions en temps réel à partir de la prosodie vocale.

## 📦 Fichiers ajoutés

```
pioneers-hackathon-vertex/
├── pipeline/
│   ├── prosody_emotion_analyzer.py          # Module principal
│   ├── verify_prosody.py                     # Script de test
│   └── example_integration_gemini_live.py    # Exemple d'intégration
└── api/routers/
    └── live_prosody.py                       # WebSocket endpoint (optionnel)
```

## 🚀 Installation

```bash
# Les dépendances sont déjà dans requirements.txt
pip install librosa soundfile numpy scipy
```

## 💻 Utilisation - Ami #1 (Gemini Live API)

### Code à ajouter (4 lignes)

```python
from prosody_emotion_analyzer import StreamingProsodyAnalyzer

# 1. Créer l'analyzer au début de la session
analyzer = StreamingProsodyAnalyzer(sample_rate=16000)

# 2. Dans la boucle qui reçoit l'audio de Gemini Live API
emotion_result = analyzer.process_chunk(audio_chunk)  # audio_chunk = numpy array

# 3. Envoyer le résultat à n8n si disponible
if emotion_result:
    send_to_n8n({
        "emotion": emotion_result["dominant_emotion"],
        "confidence": emotion_result["confidence"]
    })
```

### Exemple complet

Voir `pipeline/example_integration_gemini_live.py`

## 🔗 Utilisation - Ami #2 (n8n + ElevenLabs)

### Webhook n8n

Recevoir depuis l'ami #1:
```json
{
  "emotion": "stress",
  "confidence": 0.85,
  "vocal_characteristics": {
    "pitch": "high",
    "energy": "very_high"
  }
}
```

### Mapper vers ElevenLabs

Dans n8n:
```javascript
const emotionToVoiceStyle = {
  "stress": { stability: 0.3, similarity_boost: 0.8 },
  "tristesse": { stability: 0.7, similarity_boost: 0.4 },
  "joie": { stability: 0.5, similarity_boost: 0.9 },
  "colère": { stability: 0.2, similarity_boost: 1.0 },
  "calme": { stability: 0.9, similarity_boost: 0.6 },
  "peur": { stability: 0.4, similarity_boost: 0.7 },
  "excitation": { stability: 0.3, similarity_boost: 0.95 },
  "neutre": { stability: 0.5, similarity_boost: 0.75 }
};

const voiceSettings = emotionToVoiceStyle[$json.emotion];

return {
  text: $json.llm_response,
  voice_settings: voiceSettings
};
```

## 🧪 Tester

### Test avec fichier audio
```bash
cd pipeline
python verify_prosody.py chemin/vers/audio.wav
```

### Test de l'intégration Gemini Live (simulé)
```bash
python example_integration_gemini_live.py
```

## 📊 Émotions détectées

- **joie** - Voix joyeuse, énergique
- **tristesse** - Voix basse, lente
- **colère** - Voix forte, rapide
- **stress** - Pitch élevé, variation importante
- **calme** - Voix stable, pauses régulières
- **peur** - Pitch élevé, énergie moyenne
- **excitation** - Pitch moyen-haut, très énergique
- **neutre** - Caractéristiques moyennes

## 🔄 Flow complet

```
User parle → Gemini Live API
              ↓ (audio stream)
           Ami #1: prosody_emotion_analyzer.py
              ↓ ({"emotion": "stress", "confidence": 0.85})
           Ami #2: n8n webhook
              ↓ (map emotion → voice style)
           ElevenLabs API
              ↓
           Audio avec émotion adaptée
```

## 📝 Intégration dans le pipeline existant

Le module est déjà intégré dans `pipeline/main.py`:
- La fonction `extract_prosody()` appelle automatiquement l'analyzer
- Les résultats sont sauvegardés dans `prosody_features.json`
- Champs ajoutés: `prosody_emotion`, `prosody_confidence`, `vocal_characteristics`

## 🎯 Pour le hackathon

**Ami #1**: Utilise `StreamingProsodyAnalyzer` pour analyser l'audio en temps réel
**Ami #2**: Reçoit les émotions via webhook et ajuste la voix ElevenLabs
**Toi**: Module opérationnel, prêt à l'emploi ✅
