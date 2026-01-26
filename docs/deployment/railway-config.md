# Configuration Railway

## Fichiers de configuration

### railway.json

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "bun install && bun run build"
  },
  "deploy": {
    "startCommand": "bun run start",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

| Champ | Description |
|-------|-------------|
| `builder` | Nixpacks = auto-détection de l'environnement |
| `buildCommand` | Installe les deps + build Angular |
| `startCommand` | Lance le serveur Bun |
| `healthcheckPath` | Railway vérifie que l'app répond |
| `restartPolicyType` | Redémarre en cas de crash |

### .node-version

```
22
```

Force Node.js 22+ (requis par Angular CLI 21).

### package.json (scripts)

```json
{
  "scripts": {
    "start": "bun run ./server/server.ts",
    "build": "ng build --configuration production",
    "dev": "ng serve",
    "dev:server": "bun run --watch ./server/server.ts"
  },
  "engines": {
    "node": ">=22"
  }
}
```

## Railway CLI

### Installation

```bash
# macOS
brew install railway

# Ou via npm
npm install -g @railway/cli
```

### Commandes essentielles

```bash
# Connexion
railway login

# Lier le projet (une seule fois)
railway link

# Déployer
railway up

# Logs en temps réel
railway logs

# Logs filtrés
railway logs --filter "@level:error"

# Variables d'environnement
railway variables

# Ouvrir le dashboard
railway open

# Lister les services
railway service
```

### Déploiement manuel vs automatique

**Manuel (actuel):**
```bash
railway up
```

**Automatique (optionnel):**
Dans le dashboard Railway :
1. Settings → Source
2. Connecter le repo GitHub
3. Activer "Automatic Deployments"

Chaque push sur `main` déclenchera un déploiement.

## Dashboard Railway

URL: https://railway.com/project/ee35d72d-b12e-4c38-9da6-7e281de0887a

### Sections importantes

| Section | Usage |
|---------|-------|
| **Deployments** | Historique, logs, rollback |
| **Settings** | Domaine, variables, restart policy |
| **Metrics** | CPU, RAM, réseau |
| **Logs** | Temps réel + recherche |

## Domaine personnalisé

Pour ajouter un domaine custom :

1. Dashboard → Settings → Domains
2. Add Custom Domain
3. Configurer DNS :
   - Type: `CNAME`
   - Name: `chat` (ou `@` pour apex)
   - Value: `jumble-chat-production.up.railway.app`
4. Attendre propagation DNS (5-30 min)
5. Railway génère automatiquement le certificat SSL
