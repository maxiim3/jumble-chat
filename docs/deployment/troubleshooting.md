# Troubleshooting

## Problèmes de build

### "npm ci" échoue avec lock file mismatch

**Cause:** `package-lock.json` présent mais désynchronisé.

**Solution:** On utilise Bun, supprimer le lock npm :
```bash
rm package-lock.json
railway up
```

### Angular CLI requires Node.js v20.19+

**Cause:** Nixpacks utilise une vieille version de Node.

**Solution:** Fichier `.node-version` à la racine :
```
22
```

Et dans `package.json` :
```json
"engines": {
  "node": ">=22"
}
```

### Build timeout

**Cause:** Build trop long (>15 min).

**Solutions:**
1. Optimiser le build Angular (`budgets` dans `angular.json`)
2. Ajouter un `.dockerignore` :
```
node_modules
dist
.git
*.md
```

## Problèmes de runtime

### "Cannot find module" au démarrage

**Cause:** Dépendances manquantes en prod.

**Vérifier:**
1. La dépendance est dans `dependencies` (pas `devDependencies`)
2. `bun install` s'exécute bien dans le build

### WebSocket connection failed

**Causes possibles:**

1. **Mauvais protocole** : Utiliser `wss://` en prod (pas `ws://`)

   Vérifier `environment.prod.ts` :
   ```typescript
   const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
   ```

2. **Chemin incorrect** : Doit être `/ws`

3. **Timeout Railway** : Les WebSockets idle sont coupés après ~55s

   Solution : Implémenter un ping/pong :
   ```typescript
   // Client side
   setInterval(() => ws.send('ping'), 30000);
   ```

### 404 sur les routes Angular

**Cause:** Le serveur ne fait pas le SPA fallback.

**Vérifier** `server/server.ts` :
```typescript
// SPA fallback - renvoyer index.html
const indexFile = Bun.file(join(STATIC_DIR, 'index.html'));
if (await indexFile.exists()) {
  return new Response(indexFile);
}
```

### Health check failing

**Symptômes:** Service redémarre en boucle.

**Vérifier:**
1. Route `/health` existe et retourne 200
2. Le serveur démarre bien sur le bon PORT

```bash
# Tester
curl -I https://jumble-chat-production.up.railway.app/health
# Doit retourner: HTTP/2 200
```

## Problèmes de performance

### Latence élevée

1. Vérifier la région Railway (Settings → Region)
2. Choisir la région proche des utilisateurs

### Memory leaks

Symptômes : RAM qui monte progressivement.

**Pour le chat spécifiquement :**
- Vérifier que les clients sont bien retirés du `Set` à la déconnexion
- Vérifier que les IDs sont bien supprimés

```typescript
close(ws) {
  clients.delete(ws);      // ← Important
  ids.delete(ws.data.userId); // ← Important
}
```

## Debug local vs prod

### Reproduire l'environnement prod

```bash
# Build comme en prod
bun run build

# Lancer comme en prod
PORT=8080 bun run start

# Tester
open http://localhost:8080
```

### Voir les logs de crash

```bash
# Derniers logs avant crash
railway logs --lines 200

# Filtrer les erreurs
railway logs --filter "@level:error"
```

## Contacter le support

- **Railway Discord:** https://discord.gg/railway
- **Railway Status:** https://status.railway.app
- **Documentation:** https://docs.railway.app
