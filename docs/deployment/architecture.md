# Architecture de Déploiement

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│                      Railway                             │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Service: jumble-chat                │    │
│  │                                                  │    │
│  │   ┌──────────────────────────────────────────┐  │    │
│  │   │           Bun Server (server.ts)          │  │    │
│  │   │                                           │  │    │
│  │   │  ┌─────────────┐    ┌─────────────────┐  │  │    │
│  │   │  │   Static    │    │   WebSocket     │  │  │    │
│  │   │  │   Files     │    │   Handler       │  │  │    │
│  │   │  │  (Angular)  │    │   (/ws)         │  │  │    │
│  │   │  └─────────────┘    └─────────────────┘  │  │    │
│  │   │                                           │  │    │
│  │   │  ┌─────────────────────────────────────┐ │  │    │
│  │   │  │         Health Check (/health)       │ │  │    │
│  │   │  └─────────────────────────────────────┘ │  │    │
│  │   └──────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Service: MongoDB                    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Pourquoi un seul service ?

### Problème initial
- Angular frontend nécessite une URL WebSocket
- Déployer frontend et backend séparément = CORS + URL dynamique complexe

### Solution adoptée
Un serveur Bun unique qui :
1. **Sert les fichiers statiques** Angular depuis `/dist/jumble-chat/browser/`
2. **Gère les WebSockets** sur `/ws`
3. **Expose un health check** sur `/health`

### Avantages
- Pas de CORS (même origine)
- URL WebSocket simple (`wss://${window.location.host}/ws`)
- Un seul déploiement
- Coût réduit (1 service au lieu de 2)

## Flux de requêtes

```
Client Request
      │
      ▼
┌─────────────────┐
│  Bun.serve()    │
│  fetch handler  │
└────────┬────────┘
         │
    ┌────┴────┬─────────────┐
    ▼         ▼             ▼
 /health    /ws         /* (autres)
    │         │             │
    ▼         ▼             ▼
 Response  WebSocket    Fichier statique
  "OK"     Upgrade      ou index.html
                        (SPA fallback)
```

## Structure des fichiers clés

```
jumble-chat/
├── server/
│   └── server.ts          # Serveur Bun (entry point en prod)
├── src/
│   ├── environments/
│   │   ├── environment.ts      # Config dev (ws://localhost:3200)
│   │   └── environment.prod.ts # Config prod (wss://current-host)
│   └── app/
│       └── services/
│           └── socket-client.service.ts  # Utilise environment.wsUrl
├── dist/
│   └── jumble-chat/
│       └── browser/       # Build Angular (servi par Bun)
├── railway.json           # Config Railway
├── .node-version          # Force Node 22
└── package.json           # Scripts build/start
```

## Variables d'environnement

| Variable | Source | Description |
|----------|--------|-------------|
| `PORT` | Railway (auto) | Port d'écoute (8080 en prod) |

Railway injecte automatiquement `PORT`. Le serveur l'utilise via :
```typescript
const PORT = Number(process.env['PORT']) || 3200;
```
