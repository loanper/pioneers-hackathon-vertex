# Upload d'un fichier audio sur la pipeline

## **Méthode en 3 étapes (recommandée)**

### **Étape 1 : Obtenir une URL signée**
```bash
curl -X POST https://mj-api-34701717619.europe-west1.run.app/v1/sign-upload \
  -H "Content-Type: application/json" \
  -d '{
    "week": "2025-W43",
    "session_id": "session_001",
    "content_type": "audio/wav"
  }'
```

Cette commande retourne :
```json
{
  "upload_url": "https://storage.googleapis.com/...",
  "object_path": "2025-W43/session_001.wav",
  "bucket": "mj-audio-raw-mental-journal-dev",
  "expires_in_seconds": 3600
}
```

### **Étape 2 : Uploader le fichier avec l'URL signée**
```bash
curl -X PUT "<upload_url>" \
  -H "Content-Type: audio/wav" \
  --data-binary @votre_fichier.wav
```

**Note :** Remplacez `<upload_url>` par l'URL retournée à l'étape 1.

### **Étape 3 : Déclencher le traitement**
```bash
curl -X POST https://mj-api-34701717619.europe-west1.run.app/v1/ingest/finish \
  -H "Content-Type: application/json" \
  -d '{
    "week": "2025-W43",
    "session_id": "session_001"
  }'
```

---

## **Exemple complet**

```bash
# 1. Obtenir l'URL signée et extraire l'upload_url
RESPONSE=$(curl -s -X POST https://mj-api-34701717619.europe-west1.run.app/v1/sign-upload \
  -H "Content-Type: application/json" \
  -d '{
    "week": "2025-W43",
    "session_id": "session_001",
    "content_type": "audio/wav"
  }')

UPLOAD_URL=$(echo $RESPONSE | jq -r '.upload_url')

# 2. Uploader le fichier
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: audio/wav" \
  --data-binary @mon_audio.wav

# 3. Déclencher le traitement
curl -X POST https://mj-api-34701717619.europe-west1.run.app/v1/ingest/finish \
  -H "Content-Type: application/json" \
  -d '{
    "week": "2025-W43",
    "session_id": "session_001"
  }'
```

---

## **Paramètres**

- **week** : Format `YYYY-Www` (ex: `2025-W43`)
- **session_id** : Identifiant unique de la session (ex: `session_001`)
- **content_type** : Type MIME du fichier audio (par défaut: `audio/wav`)

---

## **Avantages de cette méthode**

- ✅ Upload direct vers Google Cloud Storage (pas de timeout API)
- ✅ Pas de charge sur le serveur API
- ✅ URL signée valide 1 heure
- ✅ Support de fichiers audio volumineux
