# 🔗 Intégration Frontend Next.js

Guide complet pour intégrer le frontend Next.js avec le backend API.

---

## 🌐 Configuration CORS

Le backend est configuré pour accepter les requêtes depuis le frontend Next.js.

### Variables d'environnement backend

```env
FRONTEND_URL=http://localhost:3000,https://votre-frontend.railway.app
```

**Note :** Vous pouvez spécifier plusieurs URLs séparées par des virgules.

### Configuration actuelle

Le backend accepte :
- ✅ Requêtes depuis `FRONTEND_URL`
- ✅ Credentials (cookies, headers d'authentification)
- ✅ Méthodes : GET, POST, PUT, DELETE, PATCH, OPTIONS
- ✅ Headers : Content-Type, Authorization

---

## 🔐 Authentification

### 1. Login

```typescript
// app/api/auth/login/route.ts (Next.js App Router)
// OU pages/api/auth/login.ts (Pages Router)

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (response.ok) {
    // Stocker le token
    // localStorage.setItem('token', data.access_token);
    // OU cookies avec httpOnly
    return Response.json(data);
  }

  return Response.json({ error: 'Login failed' }, { status: 401 });
}
```

### 2. Stockage du token

**Option 1 : Cookies (recommandé pour sécurité)**

```typescript
// lib/auth.ts
import Cookies from 'js-cookie';

export const setToken = (token: string) => {
  Cookies.set('token', token, { 
    expires: 7, // 7 jours
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
};

export const getToken = () => {
  return Cookies.get('token');
};

export const removeToken = () => {
  Cookies.remove('token');
};
```

**Option 2 : localStorage (simple mais moins sécurisé)**

```typescript
// lib/auth.ts
export const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};
```

### 3. Requêtes authentifiées

```typescript
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = getToken(); // Votre fonction getToken()

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token expiré, rediriger vers login
    removeToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}
```

---

## 📡 Exemples d'appels API

### Créer un compte Wi-Fi

```typescript
// app/wifi-accounts/create/page.tsx
'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api';

export default function CreateWiFiAccount() {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState(null);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/wifi-accounts', {
        method: 'POST',
        body: JSON.stringify({
          duration: '24h',
          bandwidthProfile: '2mbps',
          maxDevices: 1,
          comment: 'Compte étudiant',
        }),
      });
      setAccount(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleCreate} disabled={loading}>
        {loading ? 'Création...' : 'Créer un compte Wi-Fi'}
      </button>
      {account && (
        <div>
          <p>Username: {account.username}</p>
          <p>Password: {account.password}</p>
        </div>
      )}
    </div>
  );
}
```

### Lister les comptes Wi-Fi

```typescript
// app/wifi-accounts/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

export default function WiFiAccountsList() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await apiRequest('/wifi-accounts');
        setAccounts(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      <h1>Comptes Wi-Fi</h1>
      <ul>
        {accounts.map((account) => (
          <li key={account.id}>
            {account.username} - {account.duration} - {account.bandwidthProfile}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Dashboard - Statistiques

```typescript
// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiRequest('/dashboard/stats');
        setStats(data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchStats();
  }, []);

  if (!stats) return <div>Chargement...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div>
        <h2>Comptes</h2>
        <p>Total: {stats.accounts.total}</p>
        <p>Actifs: {stats.accounts.active}</p>
        <p>Expirés: {stats.accounts.expired}</p>
      </div>
      <div>
        <h2>Paiements</h2>
        <p>Total: {stats.payments.total}</p>
        <p>Revenus: {stats.payments.revenue}</p>
      </div>
      <div>
        <h2>Sessions</h2>
        <p>Actives: {stats.sessions.active}</p>
      </div>
    </div>
  );
}
```

### Créer un paiement

```typescript
// app/payments/create/page.tsx
'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api';

export default function CreatePayment() {
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({
          amount: 1000,
          method: 'mobile_money',
          phoneNumber: '+243900000000',
        }),
      });
      setPayment(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handlePayment} disabled={loading}>
        {loading ? 'Création...' : 'Créer un paiement'}
      </button>
      {payment && (
        <div>
          <p>ID: {payment.id}</p>
          <p>Montant: {payment.amount}</p>
          <p>Statut: {payment.status}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 Variables d'environnement Next.js

### `.env.local` (Next.js)

```env
# URL du backend API
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Pour la production
# NEXT_PUBLIC_API_URL=https://votre-backend.railway.app/api
```

### Utilisation dans le code

```typescript
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
```

---

## 🛡️ Protection des routes (Middleware)

### Middleware Next.js (App Router)

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  // Routes protégées
  const protectedRoutes = ['/dashboard', '/wifi-accounts', '/payments'];
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/wifi-accounts/:path*', '/payments/:path*'],
};
```

### HOC pour protection (Pages Router)

```typescript
// components/withAuth.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getToken } from '@/lib/auth';

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const router = useRouter();
    const token = getToken();

    useEffect(() => {
      if (!token) {
        router.push('/login');
      }
    }, [token, router]);

    if (!token) {
      return <div>Chargement...</div>;
    }

    return <Component {...props} />;
  };
}

// Usage
export default withAuth(Dashboard);
```

---

## 📦 Types TypeScript

### Créer un fichier de types

```typescript
// types/api.ts

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent' | 'student';
}

export interface WiFiAccount {
  id: string;
  username: string;
  password: string;
  duration: '24h' | '48h' | '7d' | '30d' | 'unlimited';
  bandwidthProfile: '1mbps' | '2mbps' | '5mbps';
  expiresAt: string;
  isActive: boolean;
  isExpired: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  method: 'mobile_money' | 'cash' | 'card';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  wifiAccountId?: string;
}

export interface DashboardStats {
  accounts: {
    total: number;
    active: number;
    expired: number;
  };
  payments: {
    total: number;
    completed: number;
    revenue: number;
  };
  sessions: {
    total: number;
    active: number;
  };
}

export interface LoginResponse {
  access_token: string;
  user: User;
}
```

---

## 🎨 Hook personnalisé pour les appels API

```typescript
// hooks/useApi.ts
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

export function useApi<T>(endpoint: string, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await apiRequest<T>(endpoint, options);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint]);

  const refetch = async () => {
    try {
      setLoading(true);
      const result = await apiRequest<T>(endpoint, options);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}

// Usage
function WiFiAccountsList() {
  const { data: accounts, loading, error } = useApi<WiFiAccount[]>('/wifi-accounts');

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  return (
    <ul>
      {accounts?.map(account => (
        <li key={account.id}>{account.username}</li>
      ))}
    </ul>
  );
}
```

---

## 🔄 Gestion des erreurs

```typescript
// lib/api.ts (version améliorée)
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    // Gestion des erreurs HTTP
    if (response.status === 401) {
      removeToken();
      window.location.href = '/login';
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    if (response.status === 403) {
      throw new Error('Accès refusé. Permissions insuffisantes.');
    }

    if (response.status === 404) {
      throw new Error('Ressource non trouvée.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Erreur ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erreur réseau. Vérifiez votre connexion.');
  }
}
```

---

## 📱 Exemple complet : Page de login

```typescript
// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setToken } from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import type { LoginResponse } from '@/types/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setToken(data.access_token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Connexion</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>
    </form>
  );
}
```

---

## 🚀 Déploiement

### Variables d'environnement production

**Backend (Railway) :**
```env
FRONTEND_URL=https://votre-frontend.railway.app
```

**Frontend (Vercel/Railway) :**
```env
NEXT_PUBLIC_API_URL=https://votre-backend.railway.app/api
```

### Vérification CORS

Si vous avez des erreurs CORS en production :

1. Vérifier que `FRONTEND_URL` dans le backend correspond exactement à l'URL du frontend
2. Vérifier que les deux sont en HTTPS en production
3. Vérifier les headers dans la console du navigateur

---

## 📦 Client API prêt à l'emploi

Un client API complet est disponible dans [`frontend-api-client.ts`](./frontend-api-client.ts).

**Utilisation :**

```typescript
// lib/api-client.ts (copier le contenu de frontend-api-client.ts)
import { apiClient } from '@/lib/api-client';

// Login
const response = await apiClient.auth.login({ email, password });

// Créer un compte Wi-Fi
const account = await apiClient.wifiAccounts.create({
  duration: '24h',
  bandwidthProfile: '2mbps',
});

// Dashboard
const stats = await apiClient.dashboard.getStats();
```

**Avantages :**
- ✅ Type-safe (TypeScript)
- ✅ Gestion automatique du token
- ✅ Gestion des erreurs
- ✅ Redirection automatique si token expiré

---

## 📚 Documentation API

Tous les endpoints sont documentés dans Swagger :

**Développement :** `http://localhost:4000/api`
**Production :** `https://votre-backend.railway.app/api`

**Types TypeScript :** Voir [`frontend-types.ts`](./frontend-types.ts)

---

## ✅ Checklist d'intégration

- [ ] Variables d'environnement configurées (`NEXT_PUBLIC_API_URL`)
- [ ] Fonction `apiRequest` créée
- [ ] Gestion du token (cookies ou localStorage)
- [ ] Middleware de protection des routes
- [ ] Types TypeScript créés
- [ ] Gestion des erreurs implémentée
- [ ] Page de login fonctionnelle
- [ ] Test de connexion au backend
- [ ] CORS configuré correctement

---

**Dernière mise à jour :** 2024-01-19
