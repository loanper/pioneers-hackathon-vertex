#!/bin/bash
# Script d'installation de Google Cloud CLI et déploiement

set -e

echo "🚀 Installation et déploiement de la pipeline avec analyse prosodique"
echo ""

# Vérifier si gcloud est installé
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI n'est pas installé"
    echo ""
    echo "📥 Installation de Google Cloud CLI..."
    echo ""
    
    # Télécharger et installer gcloud
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "Détecté: Linux"
        curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz
        tar -xf google-cloud-cli-linux-x86_64.tar.gz
        ./google-cloud-sdk/install.sh --quiet
        rm google-cloud-cli-linux-x86_64.tar.gz
        
        # Ajouter au PATH
        echo 'export PATH=$PATH:$HOME/google-cloud-sdk/bin' >> ~/.zshrc
        export PATH=$PATH:$HOME/google-cloud-sdk/bin
        
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "Détecté: macOS"
        if command -v brew &> /dev/null; then
            brew install --cask google-cloud-sdk
        else
            curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-darwin-x86_64.tar.gz
            tar -xf google-cloud-cli-darwin-x86_64.tar.gz
            ./google-cloud-sdk/install.sh --quiet
            rm google-cloud-cli-darwin-x86_64.tar.gz
            export PATH=$PATH:$HOME/google-cloud-sdk/bin
        fi
    else
        echo "❌ OS non supporté: $OSTYPE"
        exit 1
    fi
    
    echo "✅ Google Cloud CLI installé"
    echo ""
fi

# Authentification
echo "🔐 Authentification GCP..."
echo ""
echo "Tu vas être redirigé vers le navigateur pour te connecter avec: devstar4813@gcplab.me"
echo ""
gcloud auth login

# Configurer le projet
echo ""
echo "⚙️  Configuration du projet..."
gcloud config set project build-unicorn25par-4813
echo "✅ Projet configuré: build-unicorn25par-4813"
echo ""

# Vérifier la configuration
echo "📋 Configuration actuelle:"
echo "  Projet: $(gcloud config get-value project)"
echo "  Compte: $(gcloud config get-value account)"
echo "  Region: europe-west1"
echo ""

# Demander confirmation
read -p "🚀 Lancer le déploiement complet ? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Déploiement en cours..."
    echo ""
    
    # Lancer le déploiement
    ./scripts/deploy_pizza_full.sh
    
    echo ""
    echo "✅ Déploiement terminé !"
    echo ""
    echo "📊 Vérifier l'API:"
    API_URL=$(gcloud run services describe pz-api --region=europe-west1 --format='value(status.url)')
    echo "  $API_URL/docs"
    echo ""
else
    echo ""
    echo "❌ Déploiement annulé"
    echo ""
    echo "💡 Pour déployer manuellement plus tard:"
    echo "   ./scripts/deploy_pizza_full.sh"
    echo ""
fi
