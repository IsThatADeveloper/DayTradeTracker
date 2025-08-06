// src/integrations/alpaca.ts - Real Alpaca API Integration
import { BrokerCredentials, BrokerTrade, ImportedTrade } from '../types/broker';

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  notional: string | null;
  qty: string;
  filled_qty: string;
  filled_avg_price: string | null;
  order_class: string;
  order_type: string;
  type: string;
  side: 'buy' | 'sell';
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  status: 'new' | 'partially_filled' | 'filled' | 'done_for_day' | 'canceled' | 'expired' | 'replaced' | 'pending_cancel' | 'pending_replace' | 'accepted' | 'pending_new' | 'accepted_for_bidding' | 'stopped' | 'rejected' | 'suspended' | 'calculated';
  extended_hours: boolean;
  legs: any[] | null;
  trail_percent: string | null;
  trail_price: string | null;
  hwm: string | null;
  commission: string;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  avg_entry_price: string;
  qty: string;
  side: 'long' | 'short';
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

export interface AlpacaAccount {
  account_blocked: boolean;
  account_number: string;
  buying_power: string;
  cash: string;
  created_at: string;
  currency: string;
  daytrade_buying_power: string;
  daytrading_buying_power: string;
  equity: string;
  id: string;
  initial_margin: string;
  last_equity: string;
  last_maintenance_margin: string;
  long_market_value: string;
  maintenance_margin: string;
  multiplier: string;
  pattern_day_trader: boolean;
  portfolio_value: string;
  regt_buying_power: string;
  short_market_value: string;
  shorting_enabled: boolean;
  sma: string;
  status: string;
  trade_suspended_by_user: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
}

export class AlpacaIntegration {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(credentials: BrokerCredentials) {
    if (!credentials.apiKey || !credentials.apiSecret || !credentials.baseUrl) {
      throw new Error('Missing Alpaca credentials');
    }

    this.baseUrl = credentials.baseUrl;
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
  }

  private getHeaders(): Record<string, string> {
    return {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.apiSecret,
      'Content-Type': 'application/json'
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/account`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.text();
        return { 
          success: false, 
          message: `Connection failed: ${response.status} ${response.statusText} - ${errorData}` 
        };
      }

      const account: AlpacaAccount = await response.json();
      return { 
        success: true, 
        message: `Connected successfully! Account: ${account.account_number}, Status: ${account.status}` 
      };
    } catch (error: any) {
      return { success: false, message: `Connection error: ${error.message}` };
    }
  }

  async getAccount(): Promise<AlpacaAccount> {
    const response = await fetch(`${this.baseUrl}/v2/account`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch account: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getOrders(
    status?: string,
    limit: number = 100,
    after?: string,
    until?: string,
    direction: 'asc' | 'desc' = 'desc'
  ): Promise<AlpacaOrder[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      direction,
      nested: 'false'
    });

    if (status) params.append('status', status);
    if (after) params.append('after', after);
    if (until) params.append('until', until);

    const response = await fetch(`${this.baseUrl}/v2/orders?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    const response = await fetch(`${this.baseUrl}/v2/positions`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch positions: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getRecentTrades(days: number = 7): Promise<BrokerTrade[]> {
    const until = new Date();
    const after = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    // Get filled orders from the past week
    const orders = await this.getOrders(
      'filled',
      500,
      after.toISOString(),
      until.toISOString()
    );

    return orders
      .filter(order => order.status === 'filled' && order.filled_at)
      .map(order => this.convertOrderToBrokerTrade(order));
  }

  private convertOrderToBrokerTrade(order: AlpacaOrder): BrokerTrade {
    return {
      brokerTradeId: `alpaca_${order.id}`,
      symbol: order.symbol,
      side: order.side,
      quantity: parseFloat(order.filled_qty),
      price: parseFloat(order.filled_avg_price || '0'),
      timestamp: new Date(order.filled_at || order.created_at),
      commission: parseFloat(order.commission) || 0,
      brokerType: 'alpaca',
      orderId: order.id,
      executionId: order.client_order_id,
      originalData: order
    };
  }

  // Convert Alpaca orders to standard trades (handles position tracking)
  async convertToStandardTrades(): Promise<ImportedTrade[]> {
    const brokerTrades = await this.getRecentTrades();
    const trades: ImportedTrade[] = [];
    const positions: Map<string, BrokerTrade[]> = new Map();

    // Group trades by symbol
    brokerTrades.forEach(trade => {
      if (!positions.has(trade.symbol)) {
        positions.set(trade.symbol, []);
      }
      positions.get(trade.symbol)!.push(trade);
    });

    // Process each symbol's trades to create round trips
    positions.forEach((symbolTrades, symbol) => {
      symbolTrades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      let position = 0;
      let entryPrice = 0;
      let entryTime: Date | null = null;
      let totalQuantity = 0;

      for (const trade of symbolTrades) {
        const quantity = trade.side === 'buy' ? trade.quantity : -trade.quantity;
        const wasFlat = position === 0;

        if (wasFlat && quantity !== 0) {
          // Opening position
          position = quantity;
          entryPrice = trade.price;
          entryTime = trade.timestamp;
          totalQuantity = Math.abs(quantity);
        } else if (position !== 0) {
          const isClosing = (position > 0 && quantity < 0) || (position < 0 && quantity > 0);
          
          if (isClosing) {
            const closingQuantity = Math.min(Math.abs(position), Math.abs(quantity));
            const direction = position > 0 ? 'long' : 'short';
            const realizedPL = direction === 'long' 
              ? (trade.price - entryPrice) * closingQuantity
              : (entryPrice - trade.price) * closingQuantity;

            trades.push({
              brokerTradeId: `${trade.brokerTradeId}_${Date.now()}`,
              ticker: symbol,
              entryPrice,
              exitPrice: trade.price,
              quantity: closingQuantity,
              direction,
              timestamp: entryTime || trade.timestamp,
              realizedPL: realizedPL - (trade.commission || 0),
              commission: trade.commission || 0,
              brokerType: 'alpaca',
              orderId: trade.orderId,
              executionId: trade.executionId,
              notes: `Auto-imported from Alpaca • Entry: ${entryTime?.toLocaleString()} • Exit: ${trade.timestamp.toLocaleString()}`
            });

            position += quantity;
            if (position === 0) {
              entryTime = null;
              totalQuantity = 0;
            }
          } else {
            // Adding to position - calculate new average price
            const currentValue = Math.abs(position) * entryPrice;
            const addedValue = Math.abs(quantity) * trade.price;
            const newTotalQuantity = Math.abs(position) + Math.abs(quantity);
            
            entryPrice = (currentValue + addedValue) / newTotalQuantity;
            position += quantity;
            totalQuantity = newTotalQuantity;
          }
        }
      }
    });

    return trades;
  }

  // Get real-time market data (if needed)
  async getLatestQuote(symbol: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/v2/stocks/${symbol}/quotes/latest`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch quote for ${symbol}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.quote;
  }

  // Get historical bars (for analysis)
  async getHistoricalBars(
    symbol: string,
    start: string,
    end: string,
    timeframe: '1Min' | '5Min' | '15Min' | '1Hour' | '1Day' = '1Day'
  ): Promise<any> {
    const params = new URLSearchParams({
      start,
      end,
      timeframe,
      adjustment: 'raw'
    });

    const response = await fetch(`${this.baseUrl}/v2/stocks/${symbol}/bars?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch bars for ${symbol}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

// Usage example:
export const createAlpacaIntegration = (credentials: BrokerCredentials): AlpacaIntegration => {
  return new AlpacaIntegration(credentials);
};

// Export helper functions for the broker service
export const alpacaHelpers = {
  testConnection: async (credentials: BrokerCredentials) => {
    const alpaca = new AlpacaIntegration(credentials);
    return alpaca.testConnection();
  },

  fetchTrades: async (credentials: BrokerCredentials) => {
    const alpaca = new AlpacaIntegration(credentials);
    return alpaca.getRecentTrades();
  },

  convertToStandardTrades: async (credentials: BrokerCredentials) => {
    const alpaca = new AlpacaIntegration(credentials);
    return alpaca.convertToStandardTrades();
  }
};