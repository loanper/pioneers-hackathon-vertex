#!/usr/bin/env bash
#
# Pizza Pipeline - Quick Start
# Commandes rapides pour déployer et tester
#

echo "🍕 Pizza Pipeline - Quick Start Guide"
echo "======================================"
echo ""

echo "📋 Projet: build-unicorn25par-4813"
echo "👤 Compte: devstar4813@gcplab.me"
echo "🌍 Région: europe-west1"
echo ""

echo "🚀 Pour déployer la pipeline complète:"
echo ""
echo "   cd /Users/robinqueriaux/Documents/GitHub/GCPU-hackathon/GCPU-hackathon-vertex"
echo "   gcloud auth login devstar4813@gcplab.me"
echo "   gcloud config set project build-unicorn25par-4813"
echo "   ./scripts/deploy_pizza_full.sh"
echo ""

echo "🧪 Pour tester après le déploiement:"
echo ""
echo "   WEEK=\$(date +'%G-W%V')"
echo "   ./scripts/upload_session_simple.sh test_audio.wav \$WEEK session_001"
echo "   ./scripts/run_pipeline.sh \$WEEK"
echo "   ./scripts/check_results.sh \$WEEK"
echo ""

echo "📚 Documentation:"
echo "   - DEPLOYMENT_PIZZA.md : Guide de déploiement complet"
echo "   - MIGRATION_SUMMARY.md : Résumé des changements"
echo "   - README.md : Documentation générale"
echo ""

echo "✅ La pipeline est prête à être déployée!"
