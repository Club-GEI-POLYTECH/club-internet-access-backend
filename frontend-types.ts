/**
 * Types pour intégration frontend (vente de tickets uniquement).
 * Copiez dans votre projet Next.js : types/api.ts
 */

// --- Auth ---

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
}

/** Étape 2 : même corps que la réponse de `POST /auth/register/verify`. */
export interface RegisterVerifyRequest {
  email: string;
  code: string;
}

export interface RegisterRequestResponse {
  message: string;
}

// --- Tickets ---

export enum TicketStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD = 'sold',
  EXPIRED = 'expired',
}

export interface TicketType {
  id: string;
  name: string;
  profile: string;
  description?: string;
  timeLimit?: string;
  dataLimit?: string;
  price: number;
  isActive: boolean;
  availableCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Ticket {
  id: string;
  username: string;
  password?: string;
  profile: string;
  timeLimit?: string;
  dataLimit?: string;
  comment?: string;
  status: TicketStatus;
  soldAt?: string;
  soldTo?: string;
  ticketTypeId?: string;
  /** Prix catalogue (CDF) : toujours présent si le ticket est lié à un type. */
  ticketType?: TicketType;
  paymentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseTicketRequest {
  ticketId: string;
  phoneNumber: string;
  method: 'mobile_money' | 'cash';
}

export interface PurchaseTicketResponse {
  ticket: Ticket;
  payment: Payment;
  credentials: {
    username: string;
    password: string;
    profile: string;
    instructions: string;
  };
}

export interface ImportTypeRecommendation {
  typeKey: '24h' | '7j' | '30j';
  typeLabel: string;
  count: number;
  sampleTimeLimit?: string | null;
  recommendedPrice: number;
  action: 'use_existing' | 'create_new';
  matchedTicketType: TicketType | null;
}

export interface ImportTypeRecommendationsResponse {
  summary: {
    totalRows: number;
    uniqueTypes: number;
  };
  recommendations: ImportTypeRecommendation[];
}

// --- Paiements ---

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
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
  merchantReference?: string;
  phoneNumber?: string;
  ticketId?: string;
  ticket?: Ticket;
  notes?: string;
  providerResponse?: string;
  callbackProcessedAt?: string;
  createdBy?: User;
  createdById?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CompletePaymentRequest {
  transactionId?: string;
}

export interface UpdatePaymentStatusRequest {
  status: PaymentStatus;
}

/** Corps de `POST /payments/initiate` (Mobile Money KELPAY). */
export interface InitiateKelpayPaymentRequest {
  ticketId: string;
  phoneNumber: string;
  /** CDF — doit être strictement égal à `ticket.ticketType.price`. */
  amount: number;
  /** Doit correspondre au JWT si l’utilisateur est `student`. */
  userId: string;
}

/** Réponse backend après initiation KELPAY (polling serveur + callback en parallèle). */
export interface InitiateKelpayPaymentResponse {
  paymentId: string;
  merchantReference: string;
  transactionId?: string;
  status: PaymentStatus;
  kelpay: {
    raw: string;
    fields: Record<string, string>;
    transactionId?: string;
    reference?: string;
    transactionStatus?: string;
    kelpayCode?: string;
    message?: string;
  };
}

// --- Dashboard ---

export interface DashboardStats {
  payments: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    revenue: number;
  };
  tickets: {
    total: number;
    available: number;
    sold: number;
    reserved: number;
    revenue: number;
  };
  users: {
    total: number;
    active: number;
  };
  recent: {
    payments: Payment[];
  };
}

export interface MyStats {
  paymentsCount: number;
}

export interface ChartData {
  payments: Array<{ date: string; count: string; revenue: string }>;
  ticketsSold: Array<{ date: string; sold: string }>;
}

// --- Erreurs ---

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'En attente',
  [PaymentStatus.PROCESSING]: 'En cours (Mobile Money)',
  [PaymentStatus.SUCCESS]: 'Payé (KELPAY)',
  [PaymentStatus.COMPLETED]: 'Complété',
  [PaymentStatus.FAILED]: 'Échoué',
  [PaymentStatus.EXPIRED]: 'Expiré',
  [PaymentStatus.CANCELLED]: 'Annulé',
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.MOBILE_MONEY]: 'Mobile Money',
  [PaymentMethod.CASH]: 'Espèces',
  [PaymentMethod.CARD]: 'Carte',
};
