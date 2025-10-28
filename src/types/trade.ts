// src/types/trade.ts - UPDATED: Added status field for open/closed trades
export interface Trade {
  id: string;
  ticker: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  timestamp: Date;
  direction: 'long' | 'short';
  realizedPL: number;
  notes?: string | null;
  updateCount?: number;
  lastUpdated?: Date;
  status?: 'open' | 'closed'; // NEW: Track if position is open or closed
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
  notes?: string;
  status?: 'open' | 'closed';
}

// Helper type for trade updates (allows partial updates)
export interface TradeUpdate extends Partial<Omit<Trade, 'id' | 'timestamp'>> {
  timestamp?: Date;
  notes?: string | null;
  status?: 'open' | 'closed';
}