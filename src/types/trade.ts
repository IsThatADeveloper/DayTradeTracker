export interface Trade {
  id: string;
  ticker: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  timestamp: Date;
  direction: 'long' | 'short';
  realizedPL: number;
  notes?: string;
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