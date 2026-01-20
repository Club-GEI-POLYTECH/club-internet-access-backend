/**
 * Types TypeScript pour l'intégration frontend Next.js
 * 
 * Copiez ce fichier dans votre projet Next.js : types/api.ts
 * 
 * Usage:
 * import type { WiFiAccount, Payment, DashboardStats } from '@/types/api';
 */

// ============================================
// AUTHENTIFICATION
// ============================================

export enum UserRole {
  ADMIN = 'admin',
  AGENT = 'agent',
  STUDENT = 'student',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// ============================================
// WIFI ACCOUNTS
// ============================================

export enum DurationType {
  HOURS_24 = '24h',
  HOURS_48 = '48h',
  DAYS_7 = '7d',
  DAYS_30 = '30d',
  UNLIMITED = 'unlimited',
}

export enum BandwidthProfile {
  BASIC_1MB = '1mbps',
  STANDARD_2MB = '2mbps',
  PREMIUM_5MB = '5mbps',
}

export interface WiFiAccount {
  id: string;
  username: string;
  password: string;
  duration: DurationType;
  bandwidthProfile: BandwidthProfile;
  maxDevices: number;
  expiresAt: string;
  isActive: boolean;
  isExpired: boolean;
  mikrotikUserId?: string;
  comment?: string;
  createdBy?: User;
  createdById?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateWiFiAccountRequest {
  username?: string;
  duration: DurationType;
  bandwidthProfile: BandwidthProfile;
  maxDevices?: number;
  comment?: string;
}

// ============================================
// PAYMENTS
// ============================================

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  MOBILE_MONEY = 'mobile_money',
  CASH = 'cash',
  CARD = 'card',
}

export interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  phoneNumber?: string;
  wifiAccountId?: string;
  wifiAccount?: WiFiAccount;
  notes?: string;
  createdBy?: User;
  createdById?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreatePaymentRequest {
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  phoneNumber?: string;
  wifiAccountId?: string;
  notes?: string;
}

export interface CompletePaymentRequest {
  transactionId?: string;
}

export interface UpdatePaymentStatusRequest {
  status: PaymentStatus;
}

// ============================================
// SESSIONS
// ============================================

export interface Session {
  id: string;
  wifiAccountId: string;
  wifiAccount?: WiFiAccount;
  mikrotikSessionId?: string;
  ipAddress?: string;
  macAddress?: string;
  bytesIn: number;
  bytesOut: number;
  connectedAt?: string;
  disconnectedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SessionStatistics {
  total: number;
  active: number;
  ended: number;
  totalBytesUp: number;
  totalBytesDown: number;
  averageUptime: number;
}

// ============================================
// DASHBOARD
// ============================================

export interface DashboardStats {
  accounts: {
    total: number;
    active: number;
    expired: number;
  };
  payments: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    revenue: number;
  };
  sessions: {
    total: number;
    active: number;
    mikrotikActive: number;
    totalBytesTransferred: number;
  };
  users: {
    total: number;
    active: number;
  };
}

export interface ChartData {
  accounts: Array<{
    date: string;
    created: number;
    expired: number;
  }>;
  payments: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  sessions: Array<{
    date: string;
    active: number;
    new: number;
  }>;
}

// ============================================
// MIKROTIK
// ============================================

export interface MikroTikStatus {
  connected: boolean;
}

export interface MikroTikHotspotUser {
  '.id'?: string;
  name: string;
  password?: string;
  profile: string;
  'limit-uptime'?: string;
  'shared-users'?: number;
  disabled?: string;
  comment?: string;
}

export interface MikroTikActiveUser {
  '.id': string;
  user: string;
  address: string;
  uptime: string;
  'bytes-in': number;
  'bytes-out': number;
  'packets-in'?: number;
  'packets-out'?: number;
}

export interface CreateMikroTikUserRequest {
  name: string;
  password: string;
  profile?: string;
  'limit-uptime'?: string;
  'shared-users'?: number;
  comment?: string;
  disabled?: boolean;
}

// ============================================
// BANDWIDTH
// ============================================

export interface BandwidthRealtime {
  totalBytesUp: number;
  totalBytesDown: number;
  activeConnections: number;
  lastUpdated: string;
}

export interface BandwidthStats {
  totalBytesUp: number;
  totalBytesDown: number;
  totalBytes: number;
  averageBytesPerSession: number;
  peakBytesPerSecond: number;
}

export interface UserBandwidth {
  username: string;
  totalBytesUp: number;
  totalBytesDown: number;
  totalBytes: number;
  activeSession?: {
    id: string;
    bytesUp: number;
    bytesDown: number;
    uptime: number;
  };
}

export interface BandwidthHistory {
  date: string;
  totalBytesUp: number;
  totalBytesDown: number;
  activeConnections: number;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// ============================================
// PAGINATION (si implémenté)
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// UTILITAIRES
// ============================================

export type DurationLabel = '24 heures' | '48 heures' | '7 jours' | '30 jours' | 'Illimité';
export type BandwidthLabel = '1 Mbps' | '2 Mbps' | '5 Mbps';
export type PaymentStatusLabel = 'En attente' | 'Complété' | 'Échoué' | 'Annulé';
export type PaymentMethodLabel = 'Mobile Money' | 'Espèces' | 'Carte';

export const durationLabels: Record<DurationType, DurationLabel> = {
  [DurationType.HOURS_24]: '24 heures',
  [DurationType.HOURS_48]: '48 heures',
  [DurationType.DAYS_7]: '7 jours',
  [DurationType.DAYS_30]: '30 jours',
  [DurationType.UNLIMITED]: 'Illimité',
};

export const bandwidthLabels: Record<BandwidthProfile, BandwidthLabel> = {
  [BandwidthProfile.BASIC_1MB]: '1 Mbps',
  [BandwidthProfile.STANDARD_2MB]: '2 Mbps',
  [BandwidthProfile.PREMIUM_5MB]: '5 Mbps',
};

export const paymentStatusLabels: Record<PaymentStatus, PaymentStatusLabel> = {
  [PaymentStatus.PENDING]: 'En attente',
  [PaymentStatus.COMPLETED]: 'Complété',
  [PaymentStatus.FAILED]: 'Échoué',
  [PaymentStatus.CANCELLED]: 'Annulé',
};

export const paymentMethodLabels: Record<PaymentMethod, PaymentMethodLabel> = {
  [PaymentMethod.MOBILE_MONEY]: 'Mobile Money',
  [PaymentMethod.CASH]: 'Espèces',
  [PaymentMethod.CARD]: 'Carte',
};
