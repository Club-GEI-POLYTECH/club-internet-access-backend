/**
 * Interface de base pour tous les messages Kafka
 */
export interface KafkaMessage {
  event: string;
  timestamp: string;
  data: any;
}

/**
 * Messages pour le topic 'payments'
 */
export interface PaymentMessage extends KafkaMessage {
  event: 'payment.created' | 'payment.completed' | 'payment.failed' | 'payment.cancelled';
  data: {
    id?: string;
    amount: number;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    method: 'mobile_money' | 'cash' | 'card';
    transactionId?: string;
    phoneNumber?: string;
    userId?: string;
    wifiAccountId?: string;
    notes?: string;
  };
}

/**
 * Messages pour le topic 'wifi-accounts'
 */
export interface WiFiAccountMessage extends KafkaMessage {
  event: 'wifi-account.created' | 'wifi-account.activated' | 'wifi-account.expired' | 'wifi-account.deleted';
  data: {
    id?: string;
    username?: string;
    password?: string;
    duration?: '24h' | '48h' | '7d' | '30d' | 'unlimited';
    bandwidthProfile?: '1mbps' | '2mbps' | '5mbps';
    maxDevices?: number;
    userId?: string;
    comment?: string;
  };
}

/**
 * Messages pour le topic 'sessions'
 */
export interface SessionMessage extends KafkaMessage {
  event: 'session.started' | 'session.ended' | 'session.updated';
  data: {
    id?: string;
    wifiAccountId?: string;
    username?: string;
    mikrotikSessionId?: string;
    ipAddress?: string;
    bytesIn?: number;
    bytesOut?: number;
    connectedAt?: string;
    disconnectedAt?: string;
    isActive?: boolean;
  };
}

/**
 * Messages pour le topic 'users'
 */
export interface UserMessage extends KafkaMessage {
  event: 'user.created' | 'user.updated' | 'user.deleted' | 'user.activated' | 'user.deactivated';
  data: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: 'admin' | 'agent' | 'student';
    isActive?: boolean;
    password?: string;
  };
}
