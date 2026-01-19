# 🐳 Guide Docker Compose

Ce projet utilise deux configurations Docker Compose : une pour le développement et une pour la production.

## 📁 Fichiers Docker Compose

- **`docker-compose.yml`** - Configuration pour le développement local
- **`docker-compose.prod.yml`** - Configuration pour la production
- **`docker-compose.override.yml.example`** - Exemple de surcharge pour le développement
- **`.docker-compose.env.example`** - Exemple de variables d'environnement pour la production

## 🚀 Développement Local

### Démarrage rapide

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

### Services disponibles en développement

- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:3000 (si configuré)
- **PostgreSQL**: localhost:5432
- **PgAdmin**: http://localhost:5050 (admin@unikin.cd / admin)
- **Adminer**: http://localhost:8080
- **MailHog**: http://localhost:8025 (pour les emails de test)

### Caractéristiques du mode développement

- ✅ Hot reload activé (volumes montés)
- ✅ Outils de développement (PgAdmin, Adminer, MailHog)
- ✅ Logging détaillé
- ✅ Pas de restrictions de ressources
- ✅ Ports exposés pour le debugging

### Personnalisation locale

Créez un fichier `docker-compose.override.yml` pour personnaliser votre environnement :

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
# Éditez docker-compose.override.yml selon vos besoins
```

Ce fichier sera automatiquement chargé par docker-compose et vous permettra de :
- Surcharger les variables d'environnement
- Ajouter des volumes supplémentaires
- Modifier les ports
- Ajouter des services supplémentaires

## 🏭 Production

### Préparation

1. **Créer le fichier d'environnement**

```bash
cp .docker-compose.env.example .docker-compose.env
# Éditez .docker-compose.env avec vos vraies valeurs
```

2. **Vérifier les variables critiques**

Assurez-vous de définir :
- `JWT_SECRET` - Secret fort et unique
- `DB_PASSWORD` - Mot de passe sécurisé pour PostgreSQL
- `MIKROTIK_PASSWORD` - Mot de passe MikroTik
- `SMTP_*` - Configuration email réelle
- `FRONTEND_URL` - URL publique du frontend

### Démarrage en production

```bash
# Build et démarrage
docker-compose --env-file .docker-compose.env -f docker-compose.prod.yml up -d

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f

# Arrêter
docker-compose -f docker-compose.prod.yml down
```

### Caractéristiques du mode production

- ✅ Images optimisées (Dockerfile.prod)
- ✅ Pas de volumes de développement
- ✅ Utilisateurs non-root pour la sécurité
- ✅ Healthchecks configurés
- ✅ Limites de ressources
- ✅ Restart automatique
- ✅ Pas d'outils de développement (PgAdmin, Adminer, MailHog)

### Sécurité en production

1. **Ne pas exposer PostgreSQL publiquement**

Dans `docker-compose.prod.yml`, commentez la section `ports` du service `postgres` :

```yaml
postgres:
  # ports:
  #   - "5432:5432"  # Retirer en production
```

2. **Utiliser des secrets Docker**

Pour les mots de passe sensibles, utilisez Docker secrets :

```bash
echo "votre-mot-de-passe" | docker secret create db_password -
```

Puis dans `docker-compose.prod.yml` :

```yaml
secrets:
  db_password:
    external: true
```

3. **Configurer un reverse proxy**

Utilisez Nginx ou Traefik devant vos services :

```yaml
nginx:
  image: nginx:alpine
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf
  ports:
    - "80:80"
    - "443:443"
  depends_on:
    - backend
    - frontend
```

## 🔧 Commandes Utiles

### Développement

```bash
# Rebuild après changement de Dockerfile
docker-compose build

# Rebuild et redémarrer
docker-compose up -d --build

# Voir les logs d'un service spécifique
docker-compose logs -f backend

# Exécuter une commande dans un conteneur
docker-compose exec backend npm run seed:admin

# Arrêter et supprimer les volumes
docker-compose down -v
```

### Production

```bash
# Build les images de production
docker-compose -f docker-compose.prod.yml build

# Démarrer avec rebuild
docker-compose -f docker-compose.prod.yml up -d --build

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f

# Vérifier l'état des services
docker-compose -f docker-compose.prod.yml ps

# Healthcheck
docker-compose -f docker-compose.prod.yml exec backend wget -q -O- http://localhost:4000/api/health
```

## 📊 Monitoring

### Healthchecks

Les services en production ont des healthchecks configurés :

```bash
# Vérifier l'état des healthchecks
docker-compose -f docker-compose.prod.yml ps

# Voir les détails
docker inspect internet-access-backend-prod | grep -A 10 Health
```

### Logs

```bash
# Logs en temps réel
docker-compose -f docker-compose.prod.yml logs -f

# Logs d'un service spécifique
docker-compose -f docker-compose.prod.yml logs -f backend

# Dernières 100 lignes
docker-compose -f docker-compose.prod.yml logs --tail=100
```

## 🔄 Mise à jour

### Développement

```bash
# Arrêter
docker-compose down

# Pull les dernières images
docker-compose pull

# Rebuild et redémarrer
docker-compose up -d --build
```

### Production

```bash
# Arrêter
docker-compose -f docker-compose.prod.yml down

# Pull les dernières images
docker-compose -f docker-compose.prod.yml pull

# Rebuild et redémarrer
docker-compose -f docker-compose.prod.yml up -d --build

# Nettoyer les anciennes images
docker image prune -a
```

## 🐛 Dépannage

### Les conteneurs ne démarrent pas

```bash
# Vérifier les logs
docker-compose logs

# Vérifier l'état
docker-compose ps

# Rebuild depuis zéro
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Problème de connexion à la base de données

```bash
# Vérifier que PostgreSQL est démarré
docker-compose ps postgres

# Vérifier les logs PostgreSQL
docker-compose logs postgres

# Tester la connexion
docker-compose exec postgres psql -U unikin_user -d internet_access
```

### Problème de permissions

```bash
# Vérifier les permissions des volumes
docker-compose exec backend ls -la /app

# Réparer les permissions (si nécessaire)
docker-compose exec backend chown -R node:node /app
```

## 📚 Ressources

- [Documentation Docker Compose](https://docs.docker.com/compose/)
- [Best Practices Docker](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Security](https://docs.docker.com/engine/security/)
