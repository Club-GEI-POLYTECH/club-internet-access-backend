# 🔧 Configuration des Variables Railway

## ⚠️ IMPORTANT : Variables PostgreSQL (PG*)

Railway **ne passe PAS automatiquement** les variables `PG*` depuis le service PostgreSQL vers le service backend via `docker-compose.yml`.

Vous devez les ajouter **manuellement** dans Railway Dashboard.

## 📝 Étapes pour Configurer les Variables PG*

### 1. Trouver le nom de votre service PostgreSQL

Dans Railway Dashboard :
1. Allez dans votre projet
2. Vérifiez le **nom exact** de votre service PostgreSQL (ex: "Postgres", "PostgreSQL", "postgres", etc.)

### 2. Ajouter les variables dans le service Backend

Dans Railway Dashboard → **Backend Service** → **Variables** → **New Variable** :

Ajoutez ces 5 variables en utilisant les références Railway :

```env
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGDATABASE=${{Postgres.PGDATABASE}}
```

⚠️ **Important** : Remplacez `Postgres` par le nom exact de votre service PostgreSQL !

**Exemples selon le nom du service** :
- Si le service s'appelle "Postgres" : `${{Postgres.PGHOST}}`
- Si le service s'appelle "PostgreSQL" : `${{PostgreSQL.PGHOST}}`
- Si le service s'appelle "postgres" : `${{postgres.PGHOST}}`

### 3. Vérifier que les variables sont présentes

Après avoir ajouté les variables, vérifiez dans Railway Dashboard → Backend Service → Variables que les 5 variables `PG*` sont bien présentes.

### 4. Redéployer

Redéployez le service backend. Dans les logs, vous devriez voir :

```
🔍 Checking for PG* variables (Railway nomenclature)...
   PGHOST: [votre-host-railway]
   PGPORT: 5432
   PGUSER: postgres
   PGPASSWORD: ***
   PGDATABASE: railway
✅ Using PG* variables (Railway nomenclature)
```

## 🔍 Comment Trouver le Nom Exact du Service PostgreSQL

1. Dans Railway Dashboard → votre projet
2. Cliquez sur le service PostgreSQL
3. Le nom du service est affiché en haut (ex: "Postgres", "PostgreSQL", etc.)
4. Utilisez exactement ce nom dans les références `${{NomDuService.PGHOST}}`

## 📋 Variables Complètes à Ajouter dans Railway

### Variables PostgreSQL (OBLIGATOIRES)
```env
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGDATABASE=${{Postgres.PGDATABASE}}
```

### Autres Variables Requises
```env
NODE_ENV=production
PORT=4000
JWT_SECRET=votre-secret-jwt-super-securise-changez-moi
MIKROTIK_HOST=192.168.88.1
MIKROTIK_PORT=8728
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=votre-mot-de-passe-mikrotik
FRONTEND_URL=https://votre-frontend.railway.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app
SMTP_FROM=noreply@unikin.cd
APP_NAME=Club Internet Access UNIKIN
```

## 📧 SMTP (emails – réinitialisation mot de passe)

En production, les emails (ex. réinitialisation de mot de passe) **nécessitent un serveur SMTP réel**. Si `SMTP_HOST` est vide ou vaut `localhost`/`127.0.0.1`, vous verrez une erreur du type `connect ECONNREFUSED 127.0.0.1:587`.

**À configurer dans Railway** (service Backend → Variables) :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-application
SMTP_FROM=noreply@votredomaine.com
```

- **Gmail** : utilisez un [mot de passe d’application](https://support.google.com/accounts/answer/185833), pas votre mot de passe habituel.
- **Autres fournisseurs** : consultez leur doc (ex. SMTP SendGrid, Mailgun, OVH, etc.) pour `SMTP_HOST` et `SMTP_PORT` (souvent 587 ou 465).

Sans SMTP correctement configuré, la réinitialisation de mot de passe renverra une erreur explicite au lieu d’essayer d’envoyer vers localhost.

## 🐛 Dépannage

### Les variables PG* ne sont toujours pas détectées

1. **Vérifiez le nom du service PostgreSQL** :
   - Dans Railway Dashboard, vérifiez le nom exact
   - Utilisez exactement ce nom dans `${{NomDuService.PGHOST}}`

2. **Vérifiez que les variables sont bien ajoutées** :
   - Railway Dashboard → Backend Service → Variables
   - Les variables `PGHOST`, `PGPORT`, etc. doivent être visibles

3. **Vérifiez les logs** :
   - Les logs devraient montrer `PGHOST: NOT FOUND` si les variables ne sont pas présentes
   - Les logs devraient montrer `✅ Using PG* variables` si tout est correct

4. **Redéployez le service** :
   - Parfois Railway met un peu de temps à propager les variables
   - Redéployez le service backend après avoir ajouté les variables

## 📝 Note sur docker-compose.yml

Le fichier `docker-compose.yml` contient maintenant les variables `PG*` :

```yaml
environment:
  PGHOST: ${PGHOST}
  PGPORT: ${PGPORT}
  PGUSER: ${PGUSER}
  PGPASSWORD: ${PGPASSWORD}
  PGDATABASE: ${PGDATABASE}
```

Ces variables seront remplies par Railway quand vous ajoutez les références `${{Postgres.PGHOST}}` dans Railway Dashboard.
