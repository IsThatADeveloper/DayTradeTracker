// src/types/broker.ts
export interface BrokerConnection {
  id: string;
  userId: string;
  brokerType: BrokerType;
  displayName: string;
  credentials: BrokerCredentials;
  isActive: boolean;
  lastSync: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type BrokerType = 'alpaca' | 'interactive_brokers' | 'binance' | 'mt4' | 'mt5' | 'td_ameritrade' | 'schwab' | 'webull' | 'robinhood';

export interface BrokerCredentials {
  // Alpaca
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string; // paper vs live

  // Interactive Brokers
  clientId?: string;
  host?: string;
  port?: number;

  // Binance
  binanceApiKey?: string;
  binanceSecretKey?: string;
  
  // TD Ameritrade / Schwab
  clientSecret?: string;
  redirectUri?: string;
  refreshToken?: string;
  accessToken?: string;

  // MT4/MT5 (via API bridge)
  serverUrl?: string;
  login?: string;
  password?: string;
  serverName?: string;

  // OAuth tokens (generic)
  oauthToken?: string;
  oauthTokenSecret?: string;
  expiresAt?: Date;
}

export interface BrokerTrade {
  brokerTradeId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  commission?: number;
  brokerType: BrokerType;
  orderId?: string;
  executionId?: string;
  originalData?: any; // Store original broker response
}

export interface BrokerConfig {
  name: string;
  type: BrokerType;
  icon: string;
  description: string;
  authType: 'oauth' | 'api_keys' | 'credentials';
  fields: BrokerField[];
  testConnection?: boolean;
  paperTradingSupport?: boolean;
  supportedMarkets: string[];
  websiteUrl: string;
  apiDocsUrl: string;
}

export interface BrokerField {
  key: keyof BrokerCredentials;
  label: string;
  type: 'text' | 'password' | 'url' | 'number' | 'select';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface SyncResult {
  success: boolean;
  tradesImported: number;
  tradesSkipped: number;
  errors: string[];
  lastSyncTime: Date;
  nextSyncTime?: Date;
}

export interface BrokerStatus {
  connectionId: string;
  brokerType: BrokerType;
  isConnected: boolean;
  lastSync: Date | null;
  totalTrades: number;
  lastError?: string;
  isLoading: boolean;
}

// Standardized trade format from brokers
export interface ImportedTrade {
  brokerTradeId: string;
  ticker: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  direction: 'long' | 'short';
  timestamp: Date;
  realizedPL: number;
  commission: number;
  brokerType: BrokerType;
  notes?: string;
  orderId?: string;
  executionId?: string;
}