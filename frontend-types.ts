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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Paiement résumé dans `GET /users` (liste paginée, sans `providerResponse`). */
export interface UserListPaymentItem {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
  merchantReference?: string;
  phoneNumber?: string;
  ticketId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserListItem extends User {
  payments: UserListPaymentItem[];
  /** Total de paiements du compte (hors pagination des paiements). */
  paymentsTotal: number;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  /** Max paiements récents par utilisateur (défaut 10, max 50, 0 = aucun). */
  paymentsLimit?: number;
  role?: UserRole;
  search?: string;
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

/** Entrée de `GET /tickets/me` (étudiant connecté, paginé). */
export interface MyTicketPaymentSummary {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  createdAt: string;
}

export interface MyTicketListItem {
  id: string;
  username: string;
  password: string;
  profile: string;
  timeLimit?: string;
  dataLimit?: string;
  status: TicketStatus;
  soldAt?: string;
  soldTo?: string;
  ticketTypeId?: string;
  ticketType?: Pick<TicketType, 'id' | 'name' | 'profile' | 'price' | 'timeLimit' | 'dataLimit'>;
  paymentId?: string;
  payment?: MyTicketPaymentSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ListMyTicketsParams {
  page?: number;
  limit?: number;
  status?: TicketStatus;
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

/** Durée catalogue forcée à l’import (multipart `catalogDuration`). */
export type ImportCatalogDuration = '24h' | '7j' | '30j';

/** Réponse de `POST /admin/tickets/import` ou `POST /tickets/admin/import`. */
export interface ImportTicketsCsvResponse {
  imported: number;
  failed: number;
  errors: string[];
}

/** Champs multipart (camelCase) : au moins l’un des deux avec `file` (ticketTypeId prioritaire). */
export interface ImportTicketsMultipartOptions {
  /** UUID v4 — prioritaire : tous les tickets importés sont liés à ce `TicketType`. */
  ticketTypeId?: string;
  /** Utilisé seulement si `ticketTypeId` est absent (obligatoire dans ce cas). Ignoré pour le type si `ticketTypeId` est défini. */
  catalogDuration?: ImportCatalogDuration;
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

/** Entrée de `GET /payments` (liste paginée, sans `providerResponse`). */
export interface PaymentListItem {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  merchantReference?: string;
  phoneNumber?: string;
  ticketId?: string;
  createdById?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  /** `username` présent seulement si l’appelant est **admin**. */
  ticket?: Pick<Ticket, 'id' | 'status' | 'profile'> & { username?: string };
  createdBy?: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>;
}

export interface ListPaymentsParams {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  method?: PaymentMethod;
  createdById?: string;
  search?: string;
}

/** Corps de `POST /tickets/purchase` (hors flux KELPAY `initiate` — ex. carte). */
export interface PurchaseTicketRequest {
  ticketId: string;
  phoneNumber: string;
  method: PaymentMethod;
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

/** Réponse backend après initiation KELPAY ; enchaîner verify puis confirm (callback possible en parallèle). */
export interface InitiateKelpayPaymentResponse {
  paymentId: string;
  merchantReference: string;
  transactionId?: string;
  status: PaymentStatus;
  kelpay: {
    raw: string;
    fields: Record<string, string>;
    message?: string;
  } & Partial<{
    code: string;
    merchantcode: string;
    transactionid: string;
    reference: string;
    transactionstatus: string;
    transactiontype: string;
    timestamp: string;
    account: string;
    accounttype: string;
    provider: string;
    amount: string;
    currency: string;
    subscriberreference: string;
    description: string;
    requestid: string;
    callbackurl: string;
  }>;
}

/** `POST /payments/:id/kelpay/verify` */
export interface KelpayManualVerifyResponse {
  paymentId: string;
  paymentStatus: PaymentStatus;
  kelpayTransactionStatus: string | null;
  readyToConfirm: boolean;
  message?: string;
  merchantReference?: string;
  transactionId?: string;
}

/** `POST /payments/:id/kelpay/confirm` */
export interface KelpayManualConfirmResponse {
  paymentId: string;
  status: PaymentStatus;
  alreadyFinalized: boolean;
  ticket?: {
    id: string;
    username: string;
    status: string;
    profile?: string;
    timeLimit?: string | null;
    password?: string;
  };
}

/** `POST /payments/:id/kelpay/cancel` — abandon avant confirm (`pending` / `processing`). */
export interface KelpayManualCancelResponse {
  paymentId: string;
  status: PaymentStatus;
  alreadyTerminal: boolean;
}

// --- Dashboard ---

/** Utilisateur dans `GET /dashboard/stats` — champs publics uniquement (pas de mot de passe). */
export type DashboardUserSummary = Pick<
  User,
  'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'isActive' | 'phone' | 'createdAt'
>;

export interface DashboardTicketTypeStats {
  ticketTypeId: string;
  name: string;
  profile: string;
  price: number;
  timeLimit?: string;
  total: number;
  available: number;
  sold: number;
  reserved: number;
  revenue: number;
}

export interface DashboardRecentTicketSummary {
  id: string;
  username: string;
  profile: string;
  status: TicketStatus;
  timeLimit?: string;
  soldAt?: string;
  soldTo?: string;
  ticketTypeId?: string;
  ticketType?: Pick<TicketType, 'id' | 'name' | 'profile' | 'price' | 'timeLimit'>;
  createdAt: string;
}

export interface DashboardStats {
  payments: {
    total: number;
    /** Payés (statuts `success` + `completed`). */
    completed: number;
    /** `pending` uniquement (sans `processing`). */
    pending: number;
    processing: number;
    cancelled: number;
    failed: number;
    revenue: number;
  };
  tickets: {
    total: number;
    available: number;
    sold: number;
    reserved: number;
    revenue: number;
    byTicketType: DashboardTicketTypeStats[];
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    byRole: {
      admin: number;
      agent: number;
      student: number;
    };
  };
  recent: {
    payments: Payment[];
    users: DashboardUserSummary[];
    tickets: DashboardRecentTicketSummary[];
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
  [PaymentMethod.CARD]: 'Carte',
};
