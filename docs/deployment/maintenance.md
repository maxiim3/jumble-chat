# Maintenance et Monitoring

## Opérations courantes

### Redéployer

```bash
# Rebuild complet
railway up

# Depuis le dashboard : cliquer "Redeploy" sur un déploiement précédent
```

### Rollback

1. Dashboard → Deployments
2. Trouver le déploiement stable
3. Cliquer les 3 points → "Rollback"

### Voir les logs

```bash
# Temps réel
railway logs

# Dernières 100 lignes
railway logs --lines 100

# Filtrer par niveau
railway logs --filter "@level:error"
railway logs --filter "@level:warn"

# Recherche texte
railway logs --filter "WebSocket"
```

### Restart le service

```bash
# Via CLI
railway service restart

# Ou dashboard : Settings → Restart
```

## Monitoring

### Health Check

Railway ping `/health` régulièrement. Si pas de réponse :
- Le service est marqué "unhealthy"
- Railway tente un restart automatique

Tester manuellement :
```bash
curl https://jumble-chat-production.up.railway.app/health
# Devrait retourner: OK
```

### Métriques (Dashboard)

| Métrique | Seuil d'alerte suggéré |
|----------|------------------------|
| CPU | > 80% sustained |
| Memory | > 450MB (sur 512MB gratuit) |
| Network | Pics anormaux |

### Alertes (optionnel)

Railway Pro permet de configurer des webhooks/alertes.
Alternative gratuite : UptimeRobot sur `/health`.

## Mise à jour des dépendances

```bash
# Mettre à jour
bun update

# Tester localement
bun run build
bun run start

# Déployer
railway up
```

## Scaling

### Vertical (plus de ressources)

Dashboard → Settings → Adjust resource limits

### Horizontal (plusieurs instances)

Railway supporte le scaling horizontal sur les plans payants.
⚠️ **Attention** : Le chat utilise un `Set` en mémoire pour les clients.
Avec plusieurs instances, il faudrait Redis pour partager l'état.

## Coûts

### Plan gratuit (Hobby)
- 500 heures/mois
- 512MB RAM
- Suffisant pour un petit projet

### Plan Pro ($5/mois)
- Pas de limite d'heures
- Plus de RAM disponible
- Métriques avancées

### Surveiller l'usage

Dashboard → Usage → Voir la consommation

## Backup

### Code
Git est le backup. Assure-toi de push régulièrement.

### Données (MongoDB)
Railway MongoDB inclut des snapshots automatiques (plans payants).

Pour exporter manuellement :
```bash
# Récupérer la connection string depuis Railway
railway variables

# Export
mongodump --uri="mongodb://..." --out=./backup
```
