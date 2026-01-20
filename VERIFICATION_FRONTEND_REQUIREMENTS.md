# ✅ Vérifications Backend Requises pour le Frontend

Ce document liste toutes les vérifications nécessaires au niveau du backend après l'implémentation des dashboards par rôle.

---

## 🔐 1. Authentification & Rôles

### ✅ Endpoints à vérifier

#### **GET `/api/auth/profile`**
- [x] Retourne l'utilisateur connecté avec son `role` (`admin`, `agent`, `student`)
- [x] Le champ `role` est bien inclus dans la réponse
- [x] Le champ `isActive` est présent pour vérifier si l'utilisateur est actif

**Réponse actuelle :**
```json
{
  "userId": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "admin" | "agent" | "student"
}
```

⚠️ **À améliorer :** Ajouter `isActive` dans la réponse du profil.

#### **POST `/api/auth/register`**
- [x] Permet de créer un compte avec le rôle `student` par défaut
- [x] Valide que seuls les étudiants peuvent s'inscrire (pas `admin` ni `agent` via l'inscription publique)
- [x] Retourne l'utilisateur créé avec tous les champs

---

## 📊 2. Dashboard Admin

### ✅ Endpoints requis

#### **GET `/api/dashboard/stats`**
- [x] Accessible uniquement aux `admin` et `agent`
- [x] Retourne les statistiques complètes
- ⚠️ **À vérifier :** Le format de réponse correspond exactement

**Réponse actuelle :**
```json
{
  "accounts": {
    "total": 0,
    "active": 0,
    "expired": 0
  },
  "payments": {
    "total": 0,
    "completed": 0,
    "revenue": 0
  },
  "sessions": {
    "total": 0,
    "active": 0,
    "mikrotikActive": 0,
    "totalBytesTransferred": 0
  },
  "users": {
    "total": 0
  },
  "recent": {
    "accounts": [],
    "payments": []
  }
}
```

⚠️ **Manque :** `payments.pending`, `payments.failed`, `users.active`

#### **GET `/api/dashboard/charts?days=7`**
- [x] Accessible uniquement aux `admin` et `agent`
- ⚠️ **Format à vérifier :** Le format de réponse doit correspondre

**Réponse actuelle :**
```json
{
  "accounts": [
    {
      "date": "2024-01-19",
      "count": 10
    }
  ],
  "payments": [
    {
      "date": "2024-01-19",
      "count": 15,
      "revenue": 50000
    }
  ]
}
```

⚠️ **Manque :** `accounts.expired`, `sessions.active`, `sessions.new`

---

## 💰 3. Dashboard Agent

### ✅ Endpoints requis

#### **GET `/api/wifi-accounts`**
- [x] Accessible aux `admin` et `agent` (authentification JWT)
- [x] Retourne la liste des comptes Wi-Fi
- ⚠️ **À améliorer :** Ajouter protection par rôle explicite

#### **POST `/api/wifi-accounts`**
- [x] Accessible aux `admin` et `agent` (authentification JWT)
- [x] Permet de créer un compte Wi-Fi
- [x] Génère automatiquement `username` et `password`
- [x] Retourne le compte créé avec `username` et `password`

#### **GET `/api/payments`**
- [x] Accessible aux `admin` et `agent` (authentification JWT)
- [x] Retourne la liste des paiements
- [x] Inclut les informations du compte Wi-Fi associé

#### **POST `/api/payments`**
- [x] Accessible aux `admin` et `agent` (authentification JWT)
- [x] Permet de créer un paiement manuel
- [x] Peut créer automatiquement un compte Wi-Fi après paiement

---

## 👨‍🎓 4. Dashboard Student

### ❌ PROBLÈME CRITIQUE : Filtrage manquant

#### **GET `/api/wifi-accounts`**
- [ ] ❌ **MANQUE :** Filtrage par `createdById` pour les étudiants
- [ ] ❌ **MANQUE :** Protection par rôle (actuellement accessible à tous les authentifiés)
- [ ] Les étudiants voient actuellement **TOUS** les comptes Wi-Fi

**Solution requise :**
```typescript
// Dans wifi-accounts.service.ts
async findAll(userId?: string, userRole?: UserRole): Promise<WiFiAccount[]> {
  if (userRole === UserRole.STUDENT) {
    // Filtrer uniquement les comptes de l'étudiant
    return await this.wifiAccountsRepository.find({
      where: { createdById: userId },
      relations: ['createdBy', 'payments', 'sessions'],
      order: { createdAt: 'DESC' },
    });
  }
  // Admin et Agent voient tout
  return await this.wifiAccountsRepository.find({
    relations: ['createdBy', 'payments', 'sessions'],
    order: { createdAt: 'DESC' },
  });
}
```

#### **GET `/api/payments`**
- [ ] ❌ **MANQUE :** Filtrage par `createdById` pour les étudiants
- [ ] ❌ **MANQUE :** Protection par rôle
- [ ] Les étudiants voient actuellement **TOUS** les paiements

**Solution requise :**
```typescript
// Dans payment.service.ts
async findAll(userId?: string, userRole?: UserRole): Promise<Payment[]> {
  const queryBuilder = this.paymentRepository
    .createQueryBuilder('payment')
    .leftJoinAndSelect('payment.wifiAccount', 'wifiAccount')
    .leftJoinAndSelect('payment.createdBy', 'createdBy')
    .orderBy('payment.createdAt', 'DESC');

  if (userRole === UserRole.STUDENT) {
    queryBuilder.where('payment.createdById = :userId', { userId });
  }

  return await queryBuilder.getMany();
}
```

#### **POST `/api/payments`**
- [x] Accessible aux étudiants
- [x] Le paiement est lié à l'étudiant via `createdById`
- [x] Après complétion, crée automatiquement un compte Wi-Fi

---

## 🔒 5. Contrôles d'Accès (Middleware/Guards)

### ⚠️ À améliorer

#### **Protection par rôle**
- [x] Tous les endpoints de dashboard sont protégés par authentification
- [x] Les endpoints admin sont accessibles aux `admin` et `agent`
- [ ] ❌ **MANQUE :** Protection explicite pour les endpoints étudiants
- [ ] ❌ **MANQUE :** Filtrage des données selon le rôle

---

## 🔗 6. Relations de Données

### ✅ Relations vérifiées

#### **WiFiAccount ↔ User**
- [x] Un compte Wi-Fi a un propriétaire (`createdById`)
- [x] Relation `ManyToOne` avec `User` via `createdBy`
- [x] Pour les étudiants, cette relation est obligatoire

#### **Payment ↔ User**
- [x] Un paiement est lié à un utilisateur via `createdById`
- [x] Relation `ManyToOne` avec `User` via `createdBy`

#### **Payment ↔ WiFiAccount**
- [x] Un paiement peut être lié à un compte Wi-Fi via `wifiAccountId`
- [x] Après création automatique, le lien est créé

---

## 📱 7. Workflow Paiement Étudiant

### ✅ Processus vérifié

1. **Étudiant crée un paiement** (`POST /api/payments`)
   - [x] Le paiement est créé avec `status: "pending"`
   - [x] `createdById` = ID de l'étudiant connecté

2. **Paiement complété** (`POST /api/payments/:id/complete`)
   - [x] Change `status` à `"completed"`
   - [x] Crée automatiquement un compte Wi-Fi
   - [x] Le compte Wi-Fi est lié au paiement via `wifiAccountId`
   - [x] Le compte Wi-Fi est lié à l'étudiant via `createdById`

3. **Étudiant voit son compte**
   - [ ] ❌ **PROBLÈME :** `GET /api/wifi-accounts` ne filtre pas actuellement

---

## 🚨 8. Points Critiques à Corriger

### ⚠️ URGENT

1. **Filtrage Student** : Les étudiants ne doivent **JAMAIS** voir les comptes Wi-Fi des autres
2. **Filtrage Student** : Les étudiants ne doivent **JAMAIS** voir les paiements des autres
3. **Protection par rôle** : Ajouter `@Roles()` sur les endpoints sensibles
4. **Dashboard stats** : Ajouter `payments.pending`, `payments.failed`, `users.active`
5. **Dashboard charts** : Ajouter `accounts.expired`, `sessions.active`, `sessions.new`

---

## 📋 9. Résumé des Modifications Nécessaires

### À implémenter

1. ✅ Modifier `wifi-accounts.service.ts` : Ajouter filtrage par rôle
2. ✅ Modifier `payment.service.ts` : Ajouter filtrage par rôle
3. ✅ Modifier `wifi-accounts.controller.ts` : Passer userId et role au service
4. ✅ Modifier `payment.controller.ts` : Passer userId et role au service
5. ✅ Modifier `dashboard.service.ts` : Ajouter les champs manquants
6. ✅ Modifier `auth.controller.ts` : Retourner `isActive` dans le profil
7. ✅ Ajouter `@Roles()` sur les endpoints appropriés

---

**Dernière mise à jour :** 2024-01-19
