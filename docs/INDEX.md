# 📚 Documentation Mental Journal

Index complet de la documentation du projet Mental Journal.

## 📋 Vue d'ensemble du projet

- **[README.md](../README.md)** - Vue d'ensemble et Quick Start
- **[ACCOMPLISSEMENT.md](./ACCOMPLISSEMENT.md)** - Récapitulatif complet du projet (310 lignes)
- **[RESUME_EXECUTIF.md](./RESUME_EXECUTIF.md)** - Résumé exécutif pour stakeholders
- **[PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md)** - Guide de setup détaillé (657 lignes)

## 🔧 Guides techniques

### Pipeline & Infrastructure
- **[GEMINI_2X_MIGRATION.md](./GEMINI_2X_MIGRATION.md)** - Migration Gemini 1.5 → 2.x

### API FastAPI
- **[API_GUIDE.md](./API_GUIDE.md)** - Guide d'utilisation de l'API (installation, déploiement, tests)
- **[API_ROUTES.md](./API_ROUTES.md)** - Référence complète des 15 routes avec exemples frontend
- **[API_IMPLEMENTATION.md](./API_IMPLEMENTATION.md)** - Récapitulatif de l'implémentation

### Outils de développement
- **[MCP_SETUP.md](./MCP_SETUP.md)** - Configuration et utilisation du Google Cloud MCP

## 🚀 Quick Links

### Démarrage rapide
1. **Setup initial** : [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md)
2. **Tester le pipeline** : [README.md](../README.md#test-du-pipeline)
3. **Lancer l'API** : [API_GUIDE.md](./API_GUIDE.md#quick-start)

### Développement
- **Routes API** : [API_ROUTES.md](./API_ROUTES.md)
- **Scripts disponibles** : [README.md](../README.md#scripts-disponibles)
- **MCP Tools** : [MCP_SETUP.md](./MCP_SETUP.md#tools-prioritaires)

### Production
- **Déploiement** : [API_GUIDE.md](./API_GUIDE.md#déploiement-cloud-run)
- **Sécurité** : [API_GUIDE.md](./API_GUIDE.md#sécurité)
- **Monitoring** : [MCP_SETUP.md](./MCP_SETUP.md#monitoring)

## 📂 Structure de la documentation

```
docs/
├── INDEX.md                    # Ce fichier
├── ACCOMPLISSEMENT.md          # Récapitulatif complet (historique, réalisations)
├── RESUME_EXECUTIF.md          # Résumé exécutif
├── PROJECT_ROADMAP.md          # Guide de setup détaillé
├── GEMINI_2X_MIGRATION.md      # Migration Gemini
├── API_GUIDE.md                # Guide API (installation, déploiement)
├── API_ROUTES.md               # Référence des routes API
├── API_IMPLEMENTATION.md       # Récapitulatif implémentation API
└── MCP_SETUP.md                # Configuration MCP
```

## 🎯 Guides par use case

### Je veux...

**Comprendre le projet**
→ [RESUME_EXECUTIF.md](./RESUME_EXECUTIF.md)

**Déployer l'infrastructure**
→ [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md)

**Utiliser l'API**
→ [API_ROUTES.md](./API_ROUTES.md)

**Déployer l'API sur Cloud Run**
→ [API_GUIDE.md](./API_GUIDE.md#déploiement-cloud-run)

**Intégrer le frontend**
→ [API_ROUTES.md](./API_ROUTES.md#6-flux-complets)

**Analyser les coûts GCP**
→ [MCP_SETUP.md](./MCP_SETUP.md#billing)

**Débugger le pipeline**
→ [MCP_SETUP.md](./MCP_SETUP.md#logging--error-reporting)

**Migrer vers Gemini 2.5 Pro**
→ [GEMINI_2X_MIGRATION.md](./GEMINI_2X_MIGRATION.md)

## 🔗 Ressources externes

- **GitHub Repository** : [Rqbln/GCPU-hackathon-vertex](https://github.com/Rqbln/GCPU-hackathon-vertex)
- **Google Cloud Console** : [build-unicorn25par-4813](https://console.cloud.google.com/home/dashboard?project=build-unicorn25par-4813)
- **FastAPI Documentation** : https://fastapi.tiangolo.com
- **Vertex AI Docs** : https://cloud.google.com/vertex-ai/docs
- **Gemini API** : https://ai.google.dev/gemini-api/docs

## 📝 Notes

- Tous les exemples de code sont testés et fonctionnels
- Documentation mise à jour le 22 octobre 2025
- Pour toute question : voir [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) ou issues GitHub
