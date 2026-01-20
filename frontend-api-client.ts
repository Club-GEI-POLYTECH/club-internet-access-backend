/**
 * Client API réutilisable pour Next.js
 * 
 * Copiez ce fichier dans votre projet Next.js : lib/api-client.ts
 * 
 * Usage:
 * import { apiClient } from '@/lib/api-client';
 * const accounts = await apiClient.wifiAccounts.list();
 */

import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  WiFiAccount,
  CreateWiFiAccountRequest,
  Payment,
  CreatePaymentRequest,
  CompletePaymentRequest,
  UpdatePaymentStatusRequest,
  Session,
  SessionStatistics,
  DashboardStats,
  ChartData,
  MikroTikStatus,
  MikroTikHotspotUser,
  MikroTikActiveUser,
  CreateMikroTikUserRequest,
  BandwidthRealtime,
  BandwidthStats,
  UserBandwidth,
  BandwidthHistory,
  ApiError,
} from './frontend-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Fonction utilitaire pour gérer les tokens
 */
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // Option 1: Cookies (recommandé)
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
  if (tokenCookie) {
    return tokenCookie.split('=')[1];
  }
  
  // Option 2: localStorage (fallback)
  return localStorage.getItem('token');
};

const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  
  // Option 1: Cookies
  document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  
  // Option 2: localStorage (fallback)
  localStorage.setItem('token', token);
};

const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  
  // Supprimer cookie
  document.cookie = 'token=; path=/; max-age=0';
  
  // Supprimer localStorage
  localStorage.removeItem('token');
};

/**
 * Fonction de base pour les requêtes API
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

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
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }

  if (response.status === 403) {
    throw new Error('Accès refusé. Permissions insuffisantes.');
  }

  if (response.status === 404) {
    throw new Error('Ressource non trouvée.');
  }

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      statusCode: response.status,
      message: `Erreur ${response.status}`,
      error: 'Unknown error',
    }));
    throw new Error(
      Array.isArray(error.message) 
        ? error.message.join(', ') 
        : error.message || `Erreur ${response.status}`
    );
  }

  return response.json();
}

/**
 * Client API avec toutes les méthodes
 */
export const apiClient = {
  // ============================================
  // AUTHENTIFICATION
  // ============================================
  auth: {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
      const response = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setToken(response.access_token);
      return response;
    },

    register: async (data: RegisterRequest): Promise<User> => {
      return apiRequest<User>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getProfile: async (): Promise<User> => {
      return apiRequest<User>('/auth/profile');
    },

    forgotPassword: async (email: string): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
    },

    logout: (): void => {
      removeToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    },
  },

  // ============================================
  // WIFI ACCOUNTS
  // ============================================
  wifiAccounts: {
    list: async (): Promise<WiFiAccount[]> => {
      return apiRequest<WiFiAccount[]>('/wifi-accounts');
    },

    getActive: async (): Promise<WiFiAccount[]> => {
      return apiRequest<WiFiAccount[]>('/wifi-accounts/active');
    },

    getById: async (id: string): Promise<WiFiAccount> => {
      return apiRequest<WiFiAccount>(`/wifi-accounts/${id}`);
    },

    create: async (data: CreateWiFiAccountRequest): Promise<WiFiAccount> => {
      return apiRequest<WiFiAccount>('/wifi-accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>(`/wifi-accounts/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // ============================================
  // PAYMENTS
  // ============================================
  payments: {
    list: async (): Promise<Payment[]> => {
      return apiRequest<Payment[]>('/payments');
    },

    getById: async (id: string): Promise<Payment> => {
      return apiRequest<Payment>(`/payments/${id}`);
    },

    getByTransactionId: async (transactionId: string): Promise<Payment> => {
      return apiRequest<Payment>(`/payments/transaction/${transactionId}`);
    },

    create: async (data: CreatePaymentRequest): Promise<Payment> => {
      return apiRequest<Payment>('/payments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    complete: async (id: string, data?: CompletePaymentRequest): Promise<Payment> => {
      return apiRequest<Payment>(`/payments/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      });
    },

    updateStatus: async (id: string, status: UpdatePaymentStatusRequest['status']): Promise<Payment> => {
      return apiRequest<Payment>(`/payments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
  },

  // ============================================
  // SESSIONS
  // ============================================
  sessions: {
    list: async (): Promise<Session[]> => {
      return apiRequest<Session[]>('/sessions');
    },

    getActive: async (): Promise<Session[]> => {
      return apiRequest<Session[]>('/sessions/active');
    },

    getStatistics: async (): Promise<SessionStatistics> => {
      return apiRequest<SessionStatistics>('/sessions/statistics');
    },

    sync: async (): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>('/sessions/sync', {
        method: 'POST',
      });
    },

    getByWiFiAccount: async (wifiAccountId: string): Promise<Session[]> => {
      return apiRequest<Session[]>(`/sessions/wifi-account/${wifiAccountId}`);
    },

    getById: async (id: string): Promise<Session> => {
      return apiRequest<Session>(`/sessions/${id}`);
    },
  },

  // ============================================
  // DASHBOARD
  // ============================================
  dashboard: {
    getStats: async (): Promise<DashboardStats> => {
      return apiRequest<DashboardStats>('/dashboard/stats');
    },

    getCharts: async (days: number = 7): Promise<ChartData> => {
      return apiRequest<ChartData>(`/dashboard/charts?days=${days}`);
    },
  },

  // ============================================
  // MIKROTIK
  // ============================================
  mikrotik: {
    getStatus: async (): Promise<MikroTikStatus> => {
      return apiRequest<MikroTikStatus>('/mikrotik/status');
    },

    createUser: async (data: CreateMikroTikUserRequest): Promise<MikroTikHotspotUser> => {
      return apiRequest<MikroTikHotspotUser>('/mikrotik/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    listUsers: async (): Promise<MikroTikHotspotUser[]> => {
      return apiRequest<MikroTikHotspotUser[]>('/mikrotik/users');
    },

    getUser: async (username: string): Promise<MikroTikHotspotUser> => {
      return apiRequest<MikroTikHotspotUser>(`/mikrotik/users/${username}`);
    },

    deleteUser: async (username: string): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>(`/mikrotik/users/${username}`, {
        method: 'DELETE',
      });
    },

    getActiveUsers: async (): Promise<MikroTikActiveUser[]> => {
      return apiRequest<MikroTikActiveUser[]>('/mikrotik/active');
    },

    disconnectUser: async (sessionId: string): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>(`/mikrotik/active/${sessionId}`, {
        method: 'DELETE',
      });
    },

    disableUser: async (username: string): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>(`/mikrotik/users/${username}/disable`, {
        method: 'POST',
      });
    },

    enableUser: async (username: string): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>(`/mikrotik/users/${username}/enable`, {
        method: 'POST',
      });
    },
  },

  // ============================================
  // BANDWIDTH
  // ============================================
  bandwidth: {
    getRealtime: async (): Promise<BandwidthRealtime> => {
      return apiRequest<BandwidthRealtime>('/bandwidth/realtime');
    },

    getStats: async (): Promise<BandwidthStats> => {
      return apiRequest<BandwidthStats>('/bandwidth/stats');
    },

    getUserBandwidth: async (username: string): Promise<UserBandwidth> => {
      return apiRequest<UserBandwidth>(`/bandwidth/user/${username}`);
    },

    getHistory: async (days: number = 7): Promise<BandwidthHistory[]> => {
      return apiRequest<BandwidthHistory[]>(`/bandwidth/history?days=${days}`);
    },
  },

  // ============================================
  // USERS (système)
  // ============================================
  users: {
    list: async (): Promise<User[]> => {
      return apiRequest<User[]>('/users');
    },

    getById: async (id: string): Promise<User> => {
      return apiRequest<User>(`/users/${id}`);
    },

    create: async (data: Partial<User>): Promise<User> => {
      return apiRequest<User>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: string, data: Partial<User>): Promise<User> => {
      return apiRequest<User>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string): Promise<{ message: string }> => {
      return apiRequest<{ message: string }>(`/users/${id}`, {
        method: 'DELETE',
      });
    },
  },
};

// Export des utilitaires
export { getToken, setToken, removeToken, apiRequest };
