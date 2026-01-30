# 🌐 Backend API - Club Internet Access UNIKIN

API NestJS pour la gestion d'accès Wi-Fi via MikroTik RouterOS.

## 🎯 Fonctionnalités

- ✅ Gestion complète des comptes Wi-Fi (création, expiration automatique)
- ✅ **Système de vente de tickets pré-générés depuis Mikhmon** 🎫
- ✅ Intégration MikroTik RouterOS API
- ✅ Système de paiement avec génération automatique de comptes
- ✅ Authentification JWT avec rôles (Admin, Agent, Student)
- ✅ Dashboard avec statistiques en temps réel
- ✅ Synchronisation automatique des sessions actives
- ✅ Expiration automatique des comptes (scheduler)

## 🚀 Démarrage Rapide

```bash
# Installer les dépendances
npm install

# Configurer l'environnement
cp env.example.txt .env
# Éditer .env avec vos paramètres

# Créer l'utilisateur admin
npm run seed:admin

# Démarrer en développement
npm run start:dev
```

L'API sera accessible sur `http://localhost:4000/api`

## 📚 Documentation

- [Guide d'installation](./INSTALLATION.md)
- [Documentation API](./API.md) - Documentation Swagger complète
- [**Intégration Frontend Next.js**](./INTEGRATION_FRONTEND.md) ⭐ **Guide complet pour intégrer le frontend**
- [**Configuration CORS**](./CONFIGURATION_CORS.md) ⭐ **Où configurer FRONTEND_URL pour CORS**
- [**Types TypeScript**](./frontend-types.ts) ⭐ **Types réutilisables pour Next.js**
- [**Guide de déploiement terrain**](./DEPLOIEMENT_TERRAIN.md) ⭐ **Déploiement réseau réel (Starlink → MikroTik → AP Cisco)**
- [**Configuration post-installation**](./CONFIGURATION_POST_INSTALLATION.md) ⭐ **Configuration backend après installation réseau**
- [**Vérification backend**](./VERIFICATION_BACKEND.md) ⭐ **Checklist pour vérifier que tout fonctionne**
- [Guide Docker Compose](./DOCKER_COMPOSE.md)
- [Guide de déploiement Railway](./RAILWAY.md)
- [**Guide configuration multi-services Railway**](./RAILWAY_MULTI_SERVICE_SETUP.md) ⭐ **Important pour détecter backend + postgres**
- [Guide d'insertion des données](./SEED_GUIDE.md)
- [Scripts de configuration MikroTik](./scripts/README.md)
- [**Système de vente de tickets**](./TICKETS.md) ⭐ **Vente de tickets pré-générés depuis Mikhmon**

## 🏗️ Architecture

```
backend/
├── src/
│   ├── auth/              # Authentification JWT
│   ├── mikrotik/          # Service MikroTik RouterOS
│   ├── users/             # Gestion utilisateurs
│   ├── wifi-accounts/     # Gestion comptes Wi-Fi
│   ├── payment/           # Gestion paiements
│   ├── sessions/          # Gestion sessions actives
│   ├── dashboard/         # Statistiques et dashboard
│   └── entities/          # Entités TypeORM
```

## 🔧 Technologies

- **NestJS** - Framework Node.js
- **TypeORM** - ORM pour PostgreSQL
- **Passport** - Authentification
- **JWT** - Tokens d'authentification
- **routeros-client** - Client MikroTik API
- **@nestjs/schedule** - Tâches planifiées

## 📝 Variables d'environnement

Voir `env.example.txt` pour la liste complète des variables.

## 🔐 Sécurité

- Authentification JWT obligatoire pour tous les endpoints (sauf auth)
- Guards basés sur les rôles
- Validation des données avec class-validator
- Mots de passe hashés avec bcrypt

## 📊 Endpoints Principaux

- `/api/auth/*` - Authentification
- `/api/tickets/*` - Vente de tickets pré-générés 🎫
- `/api/wifi-accounts/*` - Gestion comptes Wi-Fi
- `/api/payments/*` - Gestion paiements
- `/api/sessions/*` - Sessions actives
- `/api/dashboard/*` - Statistiques
- `/api/mikrotik/*` - Contrôle MikroTik

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests avec couverture
npm run test:cov

# Tests e2e
npm run test:e2e
```

## 📦 Build Production

```bash
npm run build
npm run start:prod
```

## 🤝 Contribution

Ce projet est développé pour l'Université de Kinshasa (UNIKIN).

