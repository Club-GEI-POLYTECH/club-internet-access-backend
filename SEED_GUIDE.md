# 🌱 Guide d'insertion des données initiales

Ce guide explique comment insérer les premières données de test dans la base de données pour faciliter le développement.

## Méthode 1 : Script PowerShell (Windows) 🪟

Deux scripts PowerShell sont disponibles pour Windows :

### Script complet (avec vérifications)
```powershell
# Depuis la racine du projet
.\backend\scripts\seed.ps1

# Ou depuis le dossier backend
cd backend
.\scripts\seed.ps1
```

### Script simplifié (exécution directe)
```powershell
.\backend\scripts\seed-simple.ps1
```

Ce script exécute directement le SQL via stdin, plus rapide.

## Méthode 2 : Script Bash (Linux/Mac) 🐧

Un script bash est disponible pour Linux/Mac :

```bash
cd backend
bash scripts/seed.sh
```

Ou depuis la racine du projet :

```bash
bash backend/scripts/seed.sh
```

## Méthode 3 : Via Docker (Recommandé) 🐳

Si vous utilisez Docker :

```bash
# Exécuter le seed dans le container backend
docker-compose exec backend npm run seed:admin
```

## Méthode 4 : Script TypeScript (Pour développement) ✅

Le script TypeScript garantit que les mots de passe sont correctement hashés avec bcrypt.

```bash
cd backend
npm run seed:admin
```

Ou directement avec ts-node :

```bash
cd backend
npx ts-node -r tsconfig-paths/register src/database/seeds/run-seed.ts
```

## Méthode 5 : Script SQL manuel (Comme vous l'avez fait) ⚡

Vous pouvez copier le fichier SQL dans le container et l'exécuter manuellement :

### Option A : Copier puis exécuter (2 étapes)

```powershell
# 1. Copier le fichier SQL dans le container
docker cp backend/scripts/seed-data.sql internet-access-postgres:/seed-data.sql

# 2. Exécuter le script SQL
docker exec -it internet-access-postgres psql -U unikin_user -d internet_access -f /seed-data.sql
```

### Option B : Exécution directe via stdin (1 commande)

```powershell
# PowerShell
Get-Content backend/scripts/seed-data.sql | docker exec -i internet-access-postgres psql -U unikin_user -d internet_access

# Ou avec redirection (si compatible)
docker exec -i internet-access-postgres psql -U unikin_user -d internet_access < backend/scripts/seed-data.sql
```

### Option C : Via bash dans le container

```bash
# Entrer dans le container
docker exec -it internet-access-postgres bash

# Puis dans le container
psql -U unikin_user -d internet_access -f /seed-data.sql
```

## Méthode 6 : Script SQL via Adminer (Interface web) 🌐

1. Accédez à Adminer : http://localhost:8080
2. Connectez-vous avec :
   - Système: `PostgreSQL`
   - Serveur: `postgres`
   - Utilisateur: `unikin_user`
   - Mot de passe: `unikin_password`
   - Base de données: `internet_access`
3. Cliquez sur l'onglet **"SQL command"**
4. Ouvrez le fichier `backend/scripts/seed-data.sql` et copiez tout son contenu
5. Collez-le dans l'éditeur Adminer
6. Cliquez sur **"Exécuter"**

### Via psql dans Docker

```bash
docker exec -i internet-access-postgres psql -U unikin_user -d internet_access < backend/scripts/seed-data.sql
```

## Données créées

### Utilisateurs (5)
- **1 Admin** : admin@unikin.cd
- **2 Agents** : agent1@unikin.cd, agent2@unikin.cd
- **2 Étudiants** : student1@student.unikin.cd, student2@student.unikin.cd

### Comptes Wi-Fi (5)
- **etu1001** - Compte actif 24h (2 Mbps)
- **etu1002** - Compte actif 7 jours (5 Mbps)
- **etu1003** - Compte expiré (1 Mbps)
- **etu1004** - Compte actif 30 jours (5 Mbps, 2 appareils)
- **etu1005** - Compte actif 48h (2 Mbps)

### Paiements (5)
- **MTN001** - Paiement Mobile Money complété (1000 CDF)
- **MTN002** - Paiement Mobile Money complété (2000 CDF)
- **MTN003** - Paiement Mobile Money en attente (1500 CDF)
- **CASH001** - Paiement Espèces complété (5000 CDF)
- **MTN004** - Paiement Mobile Money échoué (1000 CDF)

## Identifiants de connexion

**Mot de passe pour tous les comptes : `password123`**

### Comptes administrateurs
- **Admin** : admin@unikin.cd / password123

### Comptes agents
- **Agent 1** : agent1@unikin.cd / password123
- **Agent 2** : agent2@unikin.cd / password123

### Comptes étudiants
- **Étudiant 1** : student1@student.unikin.cd / password123
- **Étudiant 2** : student2@student.unikin.cd / password123

## Comptes Wi-Fi de test

| Username | Password   | Durée | Débit | Statut |
|----------|------------|-------|-------|--------|
| etu1001  | P@ssw0rd1  | 24h   | 2 Mbps| Actif  |
| etu1002  | P@ssw0rd2  | 7j    | 5 Mbps| Actif  |
| etu1003  | P@ssw0rd3  | 24h   | 1 Mbps| Expiré |
| etu1004  | P@ssw0rd4  | 30j   | 5 Mbps| Actif  |
| etu1005  | P@ssw0rd5  | 48h   | 2 Mbps| Actif  |

## Notes importantes

⚠️ **Important** : 
- Le script TypeScript génère des hash uniques à chaque exécution (plus sécurisé)
- Les mots de passe sont hashés avec bcrypt
- Le script vérifie si les données existent déjà pour éviter les doublons
- En production, utilisez toujours le script TypeScript qui hash les mots de passe avec bcrypt de manière unique
- Les données de développement ne sont créées que si `NODE_ENV !== 'production'`

## Vérifier les données

Après l'insertion, vous pouvez vérifier dans Adminer ou PgAdmin :

```sql
-- Compter les utilisateurs
SELECT COUNT(*) FROM users;

-- Voir les utilisateurs
SELECT email, "firstName", "lastName", role, "isActive" FROM users;

-- Voir les comptes Wi-Fi
SELECT username, duration, "bandwidthProfile", "isActive", "isExpired", "expiresAt" 
FROM wifi_accounts;

-- Voir les paiements
SELECT "transactionId", amount, status, method, "createdAt" 
FROM payments 
ORDER BY "createdAt" DESC;

-- Statistiques
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM wifi_accounts) as total_accounts,
  (SELECT COUNT(*) FROM wifi_accounts WHERE "isActive" = true) as active_accounts,
  (SELECT COUNT(*) FROM payments) as total_payments,
  (SELECT SUM(amount) FROM payments WHERE status = 'completed') as total_revenue;
```

## Réinitialiser les données

Pour réinitialiser complètement la base de données :

```bash
# Supprimer toutes les données (⚠️ attention)
docker-compose exec postgres psql -U unikin_user -d internet_access -c "TRUNCATE TABLE payments, sessions, wifi_accounts, users RESTART IDENTITY CASCADE;"

# Puis relancer le seed
docker-compose exec backend npm run seed:admin
```

## Dépannage

### Erreur "Database not connected"
- Vérifiez que PostgreSQL est démarré : `docker-compose ps`
- Vérifiez les variables d'environnement dans `.env`

### Erreur "User already exists"
- C'est normal, le script vérifie et évite les doublons
- Pour forcer la réinitialisation, supprimez d'abord les données

### Erreur "Cannot find module"
- Assurez-vous d'avoir installé les dépendances : `npm install`
- Vérifiez que vous êtes dans le bon répertoire

