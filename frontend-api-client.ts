/**
 * Client API (vente de tickets) pour Next.js — copier vers lib/api-client.ts
 *
 * `NEXT_PUBLIC_API_URL` : origine du **backend** Nest (ex. `http://localhost:4000` ou `https://api.xxx.com`).
 * Le préfixe `/api` est ajouté automatiquement s’il manque (évite les 404 sur `/auth/register/...`).
 *
 * Usage: import { apiClient } from '@/lib/api-client';
 */

import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterVerifyRequest,
  RegisterRequestResponse,
  User,
  Ticket,
  TicketType,
  PurchaseTicketRequest,
  PurchaseTicketResponse,
  ImportTypeRecommendationsResponse,
  ImportTicketsCsvResponse,
  ImportTicketsMultipartOptions,
  Payment,
  CompletePaymentRequest,
  UpdatePaymentStatusRequest,
  InitiateKelpayPaymentRequest,
  InitiateKelpayPaymentResponse,
  KelpayManualVerifyResponse,
  KelpayManualConfirmResponse,
  KelpayManualCancelResponse,
  DashboardStats,
  MyStats,
  ChartData,
  ApiError,
} from './frontend-types';

/**
 * Base de l’API Nest (préfixe global `/api`).
 * `NEXT_PUBLIC_API_URL` peut être `http://localhost:4000` ou `http://localhost:4000/api` — on normalise.
 */
function normalizeApiBaseUrl(raw: string | undefined): string {
  const fallback = 'http://localhost:4000';
  const trimmed = (raw || fallback).trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) {
    return trimmed;
  }
  return `${trimmed}/api`;
}

const API_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find((c) => c.trim().startsWith('token='));
  if (tokenCookie) return tokenCookie.split('=')[1];
  return localStorage.getItem('token');
};

const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
  localStorage.setItem('token', token);
};

const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  document.cookie = 'token=; path=/; max-age=0';
  localStorage.removeItem('token');
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    removeToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }
  if (response.status === 403) throw new Error('Accès refusé.');
  if (response.status === 404)
    throw new Error(
      `Ressource non trouvée (${response.url}). Vérifiez NEXT_PUBLIC_API_URL (ex. http://localhost:4000 ou …/api) et le chemin (inscription : POST /auth/register/request).`,
    );
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      statusCode: response.status,
      message: `Erreur ${response.status}`,
      error: 'Unknown error',
    }));
    throw new Error(Array.isArray(error.message) ? error.message.join(', ') : String(error.message));
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

async function apiRequestFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (response.status === 401) {
    removeToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }
  if (response.status === 403) throw new Error('Accès refusé.');
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      statusCode: response.status,
      message: `Erreur ${response.status}`,
      error: 'Unknown error',
    }));
    throw new Error(Array.isArray(error.message) ? error.message.join(', ') : String(error.message));
  }
  return response.json();
}

export const apiClient = {
  setToken,
  removeToken,

  auth: {
    login: (data: LoginRequest) => apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    registerRequest: (data: RegisterRequest) =>
      apiRequest<RegisterRequestResponse>('/auth/register/request', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    registerVerify: (data: RegisterVerifyRequest) =>
      apiRequest<LoginResponse>('/auth/register/verify', { method: 'POST', body: JSON.stringify(data) }),
    registerResend: (data: Pick<RegisterRequest, 'email'>) =>
      apiRequest<RegisterRequestResponse>('/auth/register/resend', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    profile: () => apiRequest<User>('/auth/profile'),
  },

  tickets: {
    types: () => apiRequest<TicketType[]>('/tickets/types'),
    typeById: (id: string) => apiRequest<TicketType & { availableCount: number }>(`/tickets/types/${id}`),
    available: () => apiRequest<Ticket[]>('/tickets/available'),
    byType: (typeId: string) => apiRequest<Ticket[]>(`/tickets/type/${typeId}`),
    /** Tickets liés aux paiements de l’utilisateur connecté (JWT). */
    mine: () => apiRequest<Ticket[]>('/tickets/me'),
    purchase: (data: PurchaseTicketRequest) =>
      apiRequest<PurchaseTicketResponse>('/tickets/purchase', { method: 'POST', body: JSON.stringify(data) }),
    /**
     * Prévisualise les types détectés dans un CSV avant import admin.
     * `file` = fichier CSV brut (multipart/form-data).
     */
    importRecommendations: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequestFormData<ImportTypeRecommendationsResponse>(
        '/tickets/admin/import/recommendations',
        formData,
      );
    },
    /**
     * Import CSV (admin). Au moins `ticketTypeId` ou `catalogDuration` avec `file`.
     * Les colonnes CSV Time Limit / Data Limit ne déterminent pas le type ni les limites du ticket (uniquement le TicketType).
     */
    adminImportCsv: (file: File, options?: ImportTicketsMultipartOptions) => {
      const formData = new FormData();
      formData.append('file', file);
      if (options?.ticketTypeId) {
        formData.append('ticketTypeId', options.ticketTypeId);
      }
      if (options?.catalogDuration) {
        formData.append('catalogDuration', options.catalogDuration);
      }
      return apiRequestFormData<ImportTicketsCsvResponse>('/admin/tickets/import', formData);
    },
    adminStats: () => apiRequest<Record<string, number>>('/tickets/admin/stats'),
  },

  payments: {
    list: () => apiRequest<Payment[]>('/payments'),
    get: (id: string) => apiRequest<Payment>(`/payments/${id}`),
    complete: (id: string, data?: CompletePaymentRequest) =>
      apiRequest<Payment>(`/payments/${id}/complete`, { method: 'POST', body: JSON.stringify(data ?? {}) }),
    updateStatus: (id: string, data: UpdatePaymentStatusRequest) =>
      apiRequest<Payment>(`/payments/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
    byTransaction: (transactionId: string) =>
      apiRequest<Payment>(`/payments/transaction/${transactionId}`),
    /** Mobile Money KELPAY : réserve le ticket, envoie la push MM ; puis `verifyKelpay` + `confirmKelpay` (pas de polling serveur). */
    initiateKelpay: (data: InitiateKelpayPaymentRequest) =>
      apiRequest<InitiateKelpayPaymentResponse>('/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    verifyKelpay: (paymentId: string) =>
      apiRequest<KelpayManualVerifyResponse>(`/payments/${paymentId}/kelpay/verify`, { method: 'POST' }),
    confirmKelpay: (paymentId: string) =>
      apiRequest<KelpayManualConfirmResponse>(`/payments/${paymentId}/kelpay/confirm`, { method: 'POST' }),
    cancelKelpay: (paymentId: string) =>
      apiRequest<KelpayManualCancelResponse>(`/payments/${paymentId}/kelpay/cancel`, { method: 'POST' }),
  },

  dashboard: {
    myStats: () => apiRequest<MyStats>('/dashboard/my-stats'),
    stats: () => apiRequest<DashboardStats>('/dashboard/stats'),
    charts: (days?: number) => apiRequest<ChartData>(`/dashboard/charts${days != null ? `?days=${days}` : ''}`),
  },
};

export { getToken, setToken, removeToken, apiRequest };
