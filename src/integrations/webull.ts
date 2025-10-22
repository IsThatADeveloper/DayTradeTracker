// src/integrations/webull.ts - Webull API Integration
import { BrokerCredentials, BrokerTrade, ImportedTrade } from '../types/broker';

/**
 * NOTE: Webull does not have an official public API.
 * This implementation uses the unofficial API endpoints that power their mobile app.
 * 
 * IMPORTANT: This is a reverse-engineered API and may break if Webull changes their endpoints.
 * For production use, consider:
 * 1. Using Webull's official API when/if they release one
 * 2. Implementing OAuth flow if they provide it
 * 3. Having users manually import CSV exports from Webull
 * 
 * Current limitations:
 * - Requires device ID and access token from mobile app
 * - May require 2FA/MFA handling
 * - Rate limiting by Webull
 */

export interface WebullAuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenExpireTime: string;
  uuid: string;
}

export interface WebullOrder {
  orderId: string;
  ticker: {
    symbol: string;
    name: string;
  };
  action: 'BUY' | 'SELL';
  orderType: string;
  quantity: number;
  filledQuantity: number;
  avgFilledPrice: number;
  status: string;
  createTime: string;
  updateTime: string;
  totalCost: number;
  commission?: number;
}

export interface WebullPosition {
  ticker: {
    symbol: string;
    name: string;
  };
  position: number;
  costPrice: number;
  marketValue: number;
  unrealizedProfitLoss: number;
  unrealizedProfitLossRate: number;
}

export class WebullIntegration {
  private accessToken: string;
  private deviceId: string;
  private accountId: string;
  private baseUrl: string = 'https://tradeapi.webullbroker.com/api';
  private paperTradingUrl: string = 'https://act.webullbroker.com/webull-paper-center/api';

  constructor(credentials: BrokerCredentials) {
    if (!credentials.oauthToken || !credentials.clientId) {
      throw new Error('Missing Webull credentials: access token and device ID are required');
    }

    this.accessToken = credentials.oauthToken;
    this.deviceId = credentials.clientId; // Using clientId field for deviceId
    this.accountId = credentials.clientSecret || ''; // Using clientSecret for accountId
    
    // Switch to paper trading URL if specified
    if (credentials.baseUrl?.includes('paper')) {
      this.baseUrl = this.paperTradingUrl;
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'device-type': 'Web',
      'did': this.deviceId,
      'access_token': this.accessToken,
      'app-group': 'broker',
      't_time': Date.now().toString(),
      'hl': 'en',
      'os': 'web',
      'osv': 'Mozilla/5.0',
      'ver': '1.0.0'
    };
  }

  /**
   * Test connection to Webull API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Try to fetch account info to validate credentials
      const response = await fetch(`${this.baseUrl}/account/getAccountInfo`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.text();
        return { 
          success: false, 
          message: `Connection failed: ${response.status} - ${errorData}. Please verify your access token and device ID.` 
        };
      }

      const data = await response.json();
      
      if (data.accountId) {
        this.accountId = data.accountId.toString();
        return { 
          success: true, 
          message: `Connected successfully! Account ID: ${this.accountId}` 
        };
      }

      return { success: false, message: 'Unable to retrieve account information' };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Connection error: ${error.message}. Webull API may be temporarily unavailable.` 
      };
    }
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/account/getAccountInfo`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch account: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get order history
   */
  async getOrders(
    startDate?: string,
    endDate?: string,
    status?: string
  ): Promise<WebullOrder[]> {
    if (!this.accountId) {
      await this.testConnection();
    }

    const params = new URLSearchParams({
      accountId: this.accountId,
      pageSize: '500',
      lastRecordId: '0'
    });

    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);

    const response = await fetch(`${this.baseUrl}/orders?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Get current positions
   */
  async getPositions(): Promise<WebullPosition[]> {
    if (!this.accountId) {
      await this.testConnection();
    }

    const response = await fetch(`${this.baseUrl}/account/${this.accountId}/positions`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch positions: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.positions || [];
  }

  /**
   * Get recent filled trades (last 30 days)
   */
  async getRecentTrades(days: number = 30): Promise<BrokerTrade[]> {
    const endDate = new Date();
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Get filled orders
    const orders = await this.getOrders(startDateStr, endDateStr, 'Filled');

    return orders
      .filter(order => order.status === 'Filled' && order.filledQuantity > 0)
      .map(order => this.convertOrderToBrokerTrade(order));
  }

  private convertOrderToBrokerTrade(order: WebullOrder): BrokerTrade {
    return {
      brokerTradeId: `webull_${order.orderId}`,
      symbol: order.ticker.symbol,
      side: order.action.toLowerCase() === 'buy' ? 'buy' : 'sell',
      quantity: order.filledQuantity,
      price: order.avgFilledPrice,
      timestamp: new Date(order.updateTime || order.createTime),
      commission: order.commission || 0,
      brokerType: 'webull',
      orderId: order.orderId,
      executionId: order.orderId,
      originalData: order
    };
  }

  /**
   * Convert Webull orders to standard trades with position tracking
   */
  async convertToStandardTrades(): Promise<ImportedTrade[]> {
    const brokerTrades = await this.getRecentTrades(30);
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
              brokerType: 'webull',
              orderId: trade.orderId,
              executionId: trade.executionId,
              notes: `Auto-imported from Webull • Entry: ${entryTime?.toLocaleString()} • Exit: ${trade.timestamp.toLocaleString()}`
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

  /**
   * Refresh access token using refresh token
   * NOTE: This is a placeholder - actual implementation depends on Webull's OAuth flow
   */
  async refreshAccessToken(refreshToken: string): Promise<WebullAuthResponse> {
    // This would need to be implemented based on Webull's actual OAuth flow
    // For now, throw an error indicating manual token refresh is needed
    throw new Error(
      'Token refresh not implemented. Please log in to Webull mobile app and get a new access token.'
    );
  }
}

// Helper functions for the broker service
export const webullHelpers = {
  testConnection: async (credentials: BrokerCredentials) => {
    const webull = new WebullIntegration(credentials);
    return webull.testConnection();
  },

  fetchTrades: async (credentials: BrokerCredentials) => {
    const webull = new WebullIntegration(credentials);
    return webull.getRecentTrades();
  },

  convertToStandardTrades: async (credentials: BrokerCredentials) => {
    const webull = new WebullIntegration(credentials);
    return webull.convertToStandardTrades();
  }
};

export const createWebullIntegration = (credentials: BrokerCredentials): WebullIntegration => {
  return new WebullIntegration(credentials);
};