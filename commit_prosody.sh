#!/bin/bash
# Script de commit pour pusher l'analyse prosodique

cd /home/loan/hackathon/pioneers-hackathon-vertex

echo "📦 Ajout des fichiers d'analyse prosodique..."

# Ajouter les nouveaux fichiers
git add pipeline/prosody_emotion_analyzer.py
git add pipeline/verify_prosody.py
git add pipeline/example_integration_gemini_live.py
git add api/routers/live_prosody.py
git add PROSODY_README.md

# Ajouter les modifications
git add pipeline/main.py
git add api/main.py
git add api/routers/__init__.py

echo "✅ Fichiers ajoutés"
echo ""
echo "📝 Fichiers à committer:"
git status --short

echo ""
echo "💡 Pour committer et pusher:"
echo "   git commit -m 'feat: Add real-time prosody emotion analysis'"
echo "   git push"
