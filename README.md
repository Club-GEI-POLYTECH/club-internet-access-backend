# 🌐 Club Internet Access - Système de Gestion Wi-Fi UNIKIN

Système complet de gestion d'accès Wi-Fi avec interface web pour MikroTik RouterOS.

## 🎯 Fonctionnalités

- ✅ Création de comptes Wi-Fi journaliers (24h, 48h, 7j, 30j)
- ✅ Limitation à 1 seul appareil par compte
- ✅ Monitoring en temps réel des utilisateurs connectés
- ✅ Expiration automatique des comptes
- ✅ Intégration paiement Mobile Money
- ✅ Dashboard admin complet
- ✅ Gestion de 100 à 20 000 utilisateurs
- ✅ Profils de débit configurables (1 Mbps, 2 Mbps, 5 Mbps)

## 🏗️ Architecture

```
[ Interface Web (React) ]
          │
          ▼
[ Backend API (NestJS) ]
          │
          ▼
[ MikroTik RouterOS API ]
          │
          ▼
[ Hotspot / Firewall ]
          │
          ▼
[ Utilisateurs Wi-Fi ]
```

## 🚀 Installation Rapide

### Option 1: Docker (Recommandé) 🐳

#### Développement Local

```bash
# 1. Démarrer tous les services (développement)
docker-compose up -d

# 2. Créer l'utilisateur admin
docker-compose exec backend npm run seed:admin
```

**Accès (Développement):**
- **Frontend**: http://localhost:3000 (avec hot reload)
- **Backend API**: http://localhost:4000/api
- **PgAdmin**: http://localhost:5050 (admin@unikin.cd / admin)
- **Adminer**: http://localhost:8080
- **MailHog**: http://localhost:8025 (pour les emails de test)

#### Production

```bash
# 1. Configurer les variables d'environnement
cp .docker-compose.env.example .docker-compose.env
# Éditer .docker-compose.env avec vos paramètres (MikroTik, JWT_SECRET, etc.)

# 2. Démarrer en production
docker-compose --env-file .docker-compose.env -f docker-compose.prod.yml up -d

# 3. Créer l'utilisateur admin
docker-compose -f docker-compose.prod.yml exec backend npm run seed:admin
```

Voir [DOCKER_COMPOSE.md](./DOCKER_COMPOSE.md) pour le guide complet Docker Compose.

### Option 2: Installation Manuelle

#### Prérequis

- Node.js >= 18
- PostgreSQL (ou MySQL)
- MikroTik RouterOS avec Hotspot activé
- Accès API au routeur MikroTik

#### Installation

```bash
# Installer toutes les dépendances
npm run install:all

# Configurer les variables d'environnement
cp backend/env.example.txt backend/.env
# Éditer backend/.env avec vos paramètres MikroTik

# Démarrer en développement
npm run dev
```

**Accès:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api

## 📁 Structure du Projet

```
club-internet-access/
├── backend/          # API NestJS
│   ├── src/
│   │   ├── mikrotik/    # Module MikroTik
│   │   ├── users/       # Gestion utilisateurs
│   │   ├── auth/        # Authentification
│   │   ├── payment/     # Intégration paiement
│   │   ├── wifi-accounts/ # Gestion comptes Wi-Fi
│   │   ├── sessions/    # Gestion sessions
│   │   └── dashboard/   # Statistiques
│   ├── INSTALLATION.md
│   ├── API.md
│   └── env.example.txt
├── frontend/        # Interface React
│   ├── src/
│   │   ├── components/  # Composants réutilisables
│   │   ├── pages/       # Pages de l'application
│   │   ├── services/    # Services API
│   │   └── contexts/    # Contextes React
│   └── README.md
└── README.md
```

## 🔧 Configuration MikroTik

Voir [backend/INSTALLATION.md](./backend/INSTALLATION.md) pour la configuration complète du routeur.

## 📚 Documentation

### Docker
- [Guide Docker complet](./backend/DOCKER.md) - Configuration et utilisation Docker
- [Guide de configuration et démarrage](./SETUP.md) - Guide complet de setup

### Backend
- [Guide d'installation](./backend/INSTALLATION.md)
- [Documentation API](./backend/API.md)
- [Configuration complète](./backend/CONFIGURATION_COMPLETE.md)
- [Guide de seeding](./backend/SEED_GUIDE.md)
- [Reset de mot de passe](./backend/PASSWORD_RESET.md)

### Frontend
- [README Frontend](./frontend/README.md)

## 🛠️ Technologies

- **Backend**: NestJS, TypeScript, MikroTik RouterOS API
- **Frontend**: React, TypeScript, TailwindCSS
- **Base de données**: PostgreSQL
- **Authentification**: JWT
- **Containerisation**: Docker & Docker Compose

## 📝 License

Propriétaire - UNIKIN

