# Deployment Documentation

Ce dossier contient la documentation pour le déploiement de Jumble Chat sur Railway.

## Sommaire

| Fichier | Description |
|---------|-------------|
| [architecture.md](./architecture.md) | Architecture de déploiement et flux |
| [railway-config.md](./railway-config.md) | Configuration Railway détaillée |
| [maintenance.md](./maintenance.md) | Opérations courantes et monitoring |
| [troubleshooting.md](./troubleshooting.md) | Résolution de problèmes |

## Quick Start

```bash
# Déployer
bun run build && railway up

# Voir les logs
railway logs

# Ouvrir le dashboard
railway open
```

## URLs

- **Production:** https://jumble-chat-production.up.railway.app
- **Health check:** https://jumble-chat-production.up.railway.app/health
- **WebSocket:** wss://jumble-chat-production.up.railway.app/ws
