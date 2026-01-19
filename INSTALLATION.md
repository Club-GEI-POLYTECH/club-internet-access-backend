# 🚀 Guide d'Installation - Backend

## Prérequis

- **Node.js** >= 18.x
- **PostgreSQL** >= 12.x
- **MikroTik RouterOS** avec Hotspot activé
- Accès API au routeur MikroTik (port 8728)

## Installation

### 1. Installer les dépendances

```bash
cd backend
npm install
```

### 2. Configuration de la base de données

Créer une base de données PostgreSQL :

```sql
CREATE DATABASE internet_access;
```

### 3. Configuration des variables d'environnement

Créer un fichier `.env` à la racine du dossier `backend` :

```bash
cp env.example.txt .env
```

Éditer le fichier `.env` avec vos paramètres :

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=votre_mot_de_passe
DB_DATABASE=internet_access

# JWT Configuration
JWT_SECRET=votre-secret-jwt-super-securise-changez-moi

# MikroTik Configuration
MIKROTIK_HOST=192.168.88.1
MIKROTIK_PORT=8728
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=votre_mot_de_passe_mikrotik

# Application Configuration
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 4. Créer les données de test

```bash
npm run seed:admin
```

Cela créera :
- **1 Admin** : admin@unikin.cd / password123
- **2 Agents** : agent1@unikin.cd, agent2@unikin.cd / password123
- **2 Étudiants** : student1@student.unikin.cd, student2@student.unikin.cd / password123
- **5 Comptes Wi-Fi** de test (actifs, expirés, différentes durées)
- **5 Paiements** de test (complétés, en attente, échoués)

⚠️ **Important**: Changez les mots de passe après la première connexion !

Voir [SEED_GUIDE.md](./SEED_GUIDE.md) pour plus de détails sur les données créées.

### 5. Démarrer l'application

**Mode développement** (avec hot-reload) :
```bash
npm run start:dev
```

**Mode production** :
```bash
npm run build
npm run start:prod
```

L'API sera accessible sur `http://localhost:4000`

## Vérification

### Test de santé

```bash
curl http://localhost:4000/api/health
```

### Test de connexion MikroTik

L'application tentera de se connecter automatiquement au MikroTik au démarrage. Vérifiez les logs pour confirmer la connexion.

## Structure de l'API

### Endpoints principaux

- **Auth**: `/api/auth/login`, `/api/auth/register`
- **WiFi Accounts**: `/api/wifi-accounts`
- **Payments**: `/api/payments`
- **Sessions**: `/api/sessions`
- **Dashboard**: `/api/dashboard/stats`
- **MikroTik**: `/api/mikrotik/*`

### Authentification

Tous les endpoints (sauf `/api/auth/*`) nécessitent un token JWT dans le header :

```
Authorization: Bearer <token>
```

## Configuration MikroTik

### 1. Activer l'API

Dans Winbox ou WebFig :
1. IP → Services
2. Activer l'API (port 8728)
3. Configurer les permissions utilisateur

### 2. Créer les profils Hotspot

Créer des profils de débit dans MikroTik :

```
/ip/hotspot/user/profile add name=1mbps rate-limit=1M/1M
/ip/hotspot/user/profile add name=2mbps rate-limit=2M/2M
/ip/hotspot/user/profile add name=5mbps rate-limit=5M/5M
```

### 3. Vérifier le Hotspot

Assurez-vous que le Hotspot est configuré et fonctionnel sur votre routeur.

## Dépannage

### Erreur de connexion à la base de données

- Vérifiez que PostgreSQL est démarré
- Vérifiez les credentials dans `.env`
- Vérifiez que la base de données existe

### Erreur de connexion MikroTik

- Vérifiez que l'API est activée sur le routeur
- Vérifiez l'adresse IP et le port
- Vérifiez les credentials
- Vérifiez le firewall (port 8728 doit être ouvert)

### Erreurs TypeScript

```bash
npm install --save-dev @types/node
```

## Prochaines étapes

1. Configurer le frontend
2. Tester la création de comptes Wi-Fi
3. Configurer l'intégration paiement Mobile Money
4. Personnaliser les profils de débit selon vos besoins

