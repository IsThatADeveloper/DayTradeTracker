export interface Trade {
  id: string;
  ticker: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  timestamp: Date;
  direction: 'long' | 'short';
  realizedPL: number;
  notes?: string | null; // Allow both undefined and null for Firestore compatibility
  updateCount?: number; // Track how many times this trade has been updated
  lastUpdated?: Date; // Track when it was last updated
}

export interface DailyStats {
  date: string;
  totalPL: number;
  winCount: number;
  lossCount: number;
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
}

export interface HourlyStats {
  hour: number;
  totalPL: number;
  tradeCount: number;
  avgPL: number;
}

// Helper type for creating new trades (ensures proper types)
export interface NewTrade extends Omit<Trade, 'id' | 'updateCount' | 'lastUpdated'> {
  notes?: string; // For new trades, keep it simple as string | undefined
}

// Helper type for trade updates (allows partial updates)
export interface TradeUpdate extends Partial<Omit<Trade, 'id' | 'timestamp'>> {
  timestamp?: Date;
  notes?: string | null; // Allow null for clearing notes
}