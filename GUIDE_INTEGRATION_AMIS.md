# 🎭 Module d'Analyse Prosodique Émotionnelle - Guide d'Intégration

## ✅ Tests Validés

```bash
cd pipeline
python test_final.py

# Ou avec ton propre fichier audio
python test_final.py chemin/vers/audio.wav
```

**Résultats des tests:**
- ✅ Analyse batch (fichier complet) : OK
- ✅ Analyse streaming (chunk par chunk) : OK
- ✅ Détection de 8 émotions : OK
- ✅ Confiance scores : OK

---

## 📦 Fichiers du Module

```
pioneers-hackathon-vertex/
├── pipeline/
│   ├── prosody_emotion_analyzer.py    ← Module principal (TOUT est là)
│   ├── test_final.py                  ← Test complet
│   └── example_integration_gemini_live.py  ← Exemple pour Gemini Live
└── api/routers/
    └── live_prosody.py                ← WebSocket endpoint (optionnel)
```

**1 SEUL fichier à importer:** `prosody_emotion_analyzer.py`

---

## 🚀 Intégration - Ami #1 (Gemini Live API)

### Code minimal (3 lignes)

```python
from prosody_emotion_analyzer import StreamingProsodyAnalyzer

# 1. Créer l'analyzer (une fois au début)
analyzer = StreamingProsodyAnalyzer(sample_rate=16000)

# 2. Dans ta boucle Gemini Live qui reçoit l'audio
result = analyzer.add_audio_chunk(audio_chunk)  # audio_chunk = numpy array

# 3. Si résultat disponible (toutes les 3 secondes)
if result:
    emotion = result["dominant_emotion"]["label"]
    confidence = result["dominant_emotion"]["confidence"]
    # → Envoyer à l'ami #2 via webhook
```

### Format de sortie

```json
{
  "dominant_emotion": {
    "label": "stress",
    "confidence": 0.25
  },
  "all_emotions": [
    {"label": "stress", "confidence": 0.25},
    {"label": "peur", "confidence": 0.21},
    {"label": "neutre", "confidence": 0.18}
  ],
  "vocal_characteristics": {
    "pitch_level": "high",
    "pitch_variation": "very_expressive",
    "energy_level": "high",
    "speaking_speed": "slow"
  }
}
```

---

## 🔗 Intégration - Ami #2 (n8n + ElevenLabs)

### Webhook n8n (JavaScript)

```javascript
// Recevoir de l'ami #1
const emotion = $json.dominant_emotion.label;
const confidence = $json.dominant_emotion.confidence;

// Mapper vers paramètres de voix ElevenLabs
const emotionToVoice = {
  "stress": { 
    stability: 0.3,        // Voix instable
    similarity_boost: 0.8,  // Haute expression
    style: 1.0             // Style accentué
  },
  "joie": { 
    stability: 0.5, 
    similarity_boost: 0.9,
    style: 0.8 
  },
  "tristesse": { 
    stability: 0.7,        // Voix stable
    similarity_boost: 0.4,  // Basse expression
    style: 0.3 
  },
  "colère": { 
    stability: 0.2, 
    similarity_boost: 1.0,
    style: 1.0 
  },
  "calme": { 
    stability: 0.9, 
    similarity_boost: 0.6,
    style: 0.2 
  },
  "peur": { 
    stability: 0.4, 
    similarity_boost: 0.7,
    style: 0.7 
  },
  "excitation": { 
    stability: 0.3, 
    similarity_boost: 0.95,
    style: 0.9 
  },
  "neutre": { 
    stability: 0.5, 
    similarity_boost: 0.75,
    style: 0.5 
  }
};

// Utiliser les paramètres
const voiceSettings = emotionToVoice[emotion] || emotionToVoice["neutre"];

return {
  text: $json.llm_response,  // Réponse de Gemini
  voice_settings: voiceSettings
};
```

---

## 📊 Émotions Détectées

| Émotion | Caractéristiques | Use Case |
|---------|------------------|----------|
| **stress** | Pitch élevé, variation haute, rapide | Personne anxieuse/stressée |
| **joie** | Pitch moyen-haut, énergique | Personne heureuse |
| **tristesse** | Pitch bas, lent, peu d'énergie | Personne triste |
| **colère** | Pitch très haut, très énergique | Personne en colère |
| **calme** | Pitch stable, pauses régulières | Personne détendue |
| **peur** | Pitch élevé, énergie moyenne | Personne effrayée |
| **excitation** | Pitch moyen-haut, très énergique | Personne excitée |
| **neutre** | Caractéristiques moyennes | État neutre |

---

## 🧪 Tester en Local (sans déployer)

```bash
# Test avec le fichier d'exemple
cd /home/loan/hackathon/pioneers-hackathon-vertex/pipeline
python test_final.py

# Test avec ton propre fichier
python test_final.py /chemin/vers/ton_audio.wav
```

**Output attendu:**
```
✅ Chargé: 96.0 secondes

🎭 Émotion dominante: stress
   Confiance: 20.4%

📊 Top 5 émotions:
   1. stress       ██████████                     20.4%
   2. peur         █████████                      18.4%
   3. neutre       █████████                      18.4%

📈 Résumé du streaming:
   Analyses effectuées: 94
   Émotion globale: stress (57% du temps)
```

---

## 🔄 Flow Complet

```
User parle 🗣️
    ↓
Gemini Live API (audio stream)
    ↓
[Ami #1] prosody_emotion_analyzer.py
    ↓ {"dominant_emotion": {"label": "stress", "confidence": 0.25}}
[Ami #2] n8n webhook → mapper emotion → voice settings
    ↓
ElevenLabs API
    ↓
🔊 Réponse vocale avec émotion adaptée
```

---

## 💡 Notes Importantes

1. **Sample Rate:** L'audio doit être à **16kHz** (le module le gère automatiquement avec librosa)
2. **Format audio:** numpy array float32
3. **Fréquence d'analyse:** Toutes les 3 secondes avec fenêtre glissante de 1 seconde
4. **Dépendances:** `librosa soundfile numpy scipy` (déjà dans `requirements.txt`)

---

## ✅ Checklist d'Intégration

### Ami #1 (Gemini Live):
- [ ] Import `from prosody_emotion_analyzer import StreamingProsodyAnalyzer`
- [ ] Créer analyzer au début de session
- [ ] Appeler `analyzer.add_audio_chunk()` pour chaque chunk reçu
- [ ] Envoyer résultat à n8n quand disponible

### Ami #2 (n8n):
- [ ] Créer webhook pour recevoir émotions
- [ ] Implémenter le mapping emotion → voice settings
- [ ] Tester avec des émotions simulées
- [ ] Intégrer avec ElevenLabs API

---

**Module testé et validé ✅**  
**Prêt pour le hackathon 🚀**
