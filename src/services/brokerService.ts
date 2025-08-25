// src/services/brokerService.ts - Improved version with better organization and error handling
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

// Config and Types
import { db } from '../config/firebase';
import { 
  BrokerConnection, 
  BrokerTrade, 
  BrokerType, 
  SyncResult,
  ImportedTrade,
  BrokerCredentials 
} from '../types/broker';

// Constants
const BROKER_CONNECTIONS_COLLECTION = 'broker_connections';
const BROKER_TRADES_COLLECTION = 'broker_trades';

// Firestore-specific interfaces
interface FirestoreBrokerConnection extends Omit<BrokerConnection, 'lastSync' | 'createdAt' | 'updatedAt'> {
  lastSync: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface FirestoreBrokerTrade extends Omit<BrokerTrade, 'timestamp'> {
  timestamp: Timestamp;
  userId: string;
}

/**
 * Service class for managing broker connections and trade synchronization
 * Handles Firestore operations and broker API integrations
 */
class BrokerService {
  // ==================== BROKER CONNECTIONS ====================

  /**
   * Add a new broker connection to Firestore
   * @param userId - The user's unique identifier
   * @param connection - Connection data without ID and timestamps
   * @returns The created connection ID
   */
  async addBrokerConnection(
    userId: string, 
    connection: Omit<BrokerConnection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const now = Timestamp.now();
      const connectionData: Omit<FirestoreBrokerConnection, 'id'> = {
        ...connection,
        userId,
        lastSync: connection.lastSync ? Timestamp.fromDate(connection.lastSync) : null,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, BROKER_CONNECTIONS_COLLECTION), connectionData);
      return docRef.id;
    } catch (error: any) {
      console.error('Error adding broker connection:', error);
      throw new Error(`Failed to add broker connection: ${error.message}`);
    }
  }

  /**
   * Get all broker connections for a user
   * @param userId - The user's unique identifier
   * @returns Array of broker connections sorted by creation date
   */
  async getBrokerConnections(userId: string): Promise<BrokerConnection[]> {
    try {
      const q = query(
        collection(db, BROKER_CONNECTIONS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const connections: BrokerConnection[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreBrokerConnection;
        connections.push({
          ...data,
          id: doc.id,
          lastSync: data.lastSync?.toDate() || null,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });

      return connections;
    } catch (error: any) {
      console.error('Error fetching broker connections:', error);
      throw new Error(`Failed to fetch broker connections: ${error.message}`);
    }
  }

  /**
   * Update an existing broker connection
   * @param connectionId - The connection ID to update
   * @param updates - Partial connection data to update
   */
  async updateBrokerConnection(connectionId: string, updates: Partial<BrokerConnection>): Promise<void> {
    try {
      const connectionRef = doc(db, BROKER_CONNECTIONS_COLLECTION, connectionId);
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      // Convert Date objects to Timestamps
      if (updates.lastSync) {
        updateData.lastSync = Timestamp.fromDate(updates.lastSync);
      }

      await updateDoc(connectionRef, updateData);
    } catch (error: any) {
      console.error('Error updating broker connection:', error);
      throw new Error(`Failed to update broker connection: ${error.message}`);
    }
  }

  /**
   * Delete a broker connection and all associated trades
   * @param connectionId - The connection ID to delete
   */
  async deleteBrokerConnection(connectionId: string): Promise<void> {
    try {
      const connectionRef = doc(db, BROKER_CONNECTIONS_COLLECTION, connectionId);
      await deleteDoc(connectionRef);
      
      // Also delete all trades from this connection
      await this.deleteBrokerTradesByConnection(connectionId);
    } catch (error: any) {
      console.error('Error deleting broker connection:', error);
      throw new Error(`Failed to delete broker connection: ${error.message}`);
    }
  }

  // ==================== BROKER TRADES ====================

  /**
   * Save a broker trade to Firestore
   * @param userId - The user's unique identifier
   * @param trade - The broker trade data
   * @returns The created trade ID
   */
  async saveBrokerTrade(userId: string, trade: BrokerTrade): Promise<string> {
    try {
      const tradeData: Omit<FirestoreBrokerTrade, 'id'> = {
        ...trade,
        userId,
        timestamp: Timestamp.fromDate(trade.timestamp),
      };

      const docRef = await addDoc(collection(db, BROKER_TRADES_COLLECTION), tradeData);
      return docRef.id;
    } catch (error: any) {
      console.error('Error saving broker trade:', error);
      throw new Error(`Failed to save broker trade: ${error.message}`);
    }
  }

  /**
   * Get broker trades for a user, optionally filtered by connection
   * @param userId - The user's unique identifier
   * @param connectionId - Optional connection ID to filter by
   * @returns Array of broker trades sorted by timestamp
   */
  async getBrokerTrades(userId: string, connectionId?: string): Promise<BrokerTrade[]> {
    try {
      const q = query(
        collection(db, BROKER_TRADES_COLLECTION),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      let trades: BrokerTrade[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreBrokerTrade;
        trades.push({
          ...data,
          timestamp: data.timestamp.toDate(),
        });
      });

      // Filter by connection if specified
      if (connectionId) {
        trades = trades.filter(trade => trade.brokerTradeId.includes(connectionId));
      }

      return trades;
    } catch (error: any) {
      console.error('Error fetching broker trades:', error);
      throw new Error(`Failed to fetch broker trades: ${error.message}`);
    }
  }

  /**
   * Delete all broker trades associated with a connection
   * @param connectionId - The connection ID
   */
  async deleteBrokerTradesByConnection(connectionId: string): Promise<void> {
    try {
      const q = query(
        collection(db, BROKER_TRADES_COLLECTION),
        where('brokerTradeId', '>=', connectionId),
        where('brokerTradeId', '<', connectionId + '\uf8ff')
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error: any) {
      console.error('Error deleting broker trades:', error);
      throw new Error(`Failed to delete broker trades: ${error.message}`);
    }
  }

  // ==================== BROKER API INTEGRATION ====================

  /**
   * Test connection to a broker using provided credentials
   * @param brokerType - The type of broker to test
   * @param credentials - The broker credentials
   * @returns Test result with success status and message
   */
  async testConnection(brokerType: BrokerType, credentials: BrokerCredentials): Promise<{ success: boolean; message: string }> {
    try {
      switch (brokerType) {
        case 'alpaca':
          return await this.testAlpacaConnection(credentials);
        case 'interactive_brokers':
          return await this.testIBConnection(credentials);
        case 'binance':
          return await this.testBinanceConnection(credentials);
        default:
          return { 
            success: false, 
            message: `Testing not yet implemented for ${brokerType}` 
          };
      }
    } catch (error: any) {
      return { 
        success: false, 
        message: `Connection test failed: ${error.message}` 
      };
    }
  }

  /**
   * Sync trades from a broker connection
   * @param userId - The user's unique identifier
   * @param connection - The broker connection to sync
   * @returns Sync result with statistics and errors
   */
  async syncTrades(userId: string, connection: BrokerConnection): Promise<SyncResult> {
    try {
      const result: SyncResult = {
        success: false,
        tradesImported: 0,
        tradesSkipped: 0,
        errors: [],
        lastSyncTime: new Date()
      };

      // Fetch trades from broker API
      const brokerTrades = await this.fetchTradesFromBroker(connection);
      
      // Get existing trades to avoid duplicates
      const existingTrades = await this.getBrokerTrades(userId, connection.id);
      const existingTradeIds = new Set(existingTrades.map(t => t.brokerTradeId));

      // Process new trades
      for (const trade of brokerTrades) {
        if (existingTradeIds.has(trade.brokerTradeId)) {
          result.tradesSkipped++;
          continue;
        }

        try {
          await this.saveBrokerTrade(userId, trade);
          result.tradesImported++;
        } catch (error: any) {
          result.errors.push(`Failed to import trade ${trade.brokerTradeId}: ${error.message}`);
        }
      }

      // Update connection last sync time
      await this.updateBrokerConnection(connection.id, {
        lastSync: result.lastSyncTime
      });

      result.success = result.errors.length === 0;
      return result;
    } catch (error: any) {
      return {
        success: false,
        tradesImported: 0,
        tradesSkipped: 0,
        errors: [error.message],
        lastSyncTime: new Date()
      };
    }
  }

  /**
   * Convert broker trades to standardized format for the application
   * Groups trades by symbol to create round-trip positions
   * @param brokerTrades - Array of raw broker trades
   * @returns Array of standardized imported trades
   */
  convertBrokerTradesToStandard(brokerTrades: BrokerTrade[]): ImportedTrade[] {
    const trades: ImportedTrade[] = [];
    const positions: Map<string, BrokerTrade[]> = new Map();

    // Group trades by symbol to create round-trip trades
    brokerTrades.forEach(trade => {
      const key = trade.symbol;
      if (!positions.has(key)) {
        positions.set(key, []);
      }
      positions.get(key)!.push(trade);
    });

    // Process each symbol's trades to identify entry/exit pairs
    positions.forEach((symbolTrades, symbol) => {
      symbolTrades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      let position = 0;
      let entryPrice = 0;
      let entryTime: Date | null = null;

      for (const trade of symbolTrades) {
        const quantity = trade.side === 'buy' ? trade.quantity : -trade.quantity;
        const wasFlat = position === 0;

        if (wasFlat && quantity !== 0) {
          // Opening position
          position = quantity;
          entryPrice = trade.price;
          entryTime = trade.timestamp;
        } else if (position !== 0) {
          const isClosing = (position > 0 && quantity < 0) || (position < 0 && quantity > 0);
          
          if (isClosing) {
            // Closing position - create completed trade
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
              brokerType: trade.brokerType,
              orderId: trade.orderId,
              executionId: trade.executionId,
              notes: `Imported from ${trade.brokerType}`
            });

            position += quantity;
            if (position === 0) {
              entryTime = null;
            }
          } else {
            // Adding to position - calculate new average entry price
            const currentValue = Math.abs(position) * entryPrice;
            const addedValue = Math.abs(quantity) * trade.price;
            const newTotalQuantity = Math.abs(position) + Math.abs(quantity);
            
            entryPrice = (currentValue + addedValue) / newTotalQuantity;
            position += quantity;
          }
        }
      }
    });

    return trades;
  }

  // ==================== BROKER-SPECIFIC IMPLEMENTATIONS ====================

  /**
   * Test Alpaca API connection
   * @param credentials - Alpaca API credentials
   * @returns Connection test result
   */
  private async testAlpacaConnection(credentials: BrokerCredentials): Promise<{ success: boolean; message: string }> {
    try {
      if (!credentials.apiKey || !credentials.apiSecret) {
        return { 
          success: false, 
          message: 'API Key and Secret are required for Alpaca connection' 
        };
      }

      if (!credentials.baseUrl) {
        return { 
          success: false, 
          message: 'Base URL is required (paper or live environment)' 
        };
      }

      // In real implementation, make actual API call to Alpaca
      // const response = await fetch(`${credentials.baseUrl}/v2/account`, {
      //   headers: {
      //     'APCA-API-KEY-ID': credentials.apiKey,
      //     'APCA-API-SECRET-KEY': credentials.apiSecret
      //   }
      // });

      return { 
        success: true, 
        message: 'Alpaca connection successful! Ready to import trades.' 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Alpaca connection failed: ${error.message}` 
      };
    }
  }

  /**
   * Test Interactive Brokers connection
   * @param credentials - IB credentials
   * @returns Connection test result
   */
  private async testIBConnection(credentials: BrokerCredentials): Promise<{ success: boolean; message: string }> {
    try {
      if (!credentials.clientId) {
        return { 
          success: false, 
          message: 'Client ID is required for Interactive Brokers connection' 
        };
      }

      // Mock IB connection test - in reality would connect to TWS/Gateway
      return { 
        success: true, 
        message: 'Interactive Brokers connection configured. Ensure TWS/Gateway is running and API is enabled.' 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Interactive Brokers connection failed: ${error.message}` 
      };
    }
  }

  /**
   * Test Binance API connection
   * @param credentials - Binance API credentials
   * @returns Connection test result
   */
  private async testBinanceConnection(credentials: BrokerCredentials): Promise<{ success: boolean; message: string }> {
    try {
      if (!credentials.binanceApiKey || !credentials.binanceSecretKey) {
        return { 
          success: false, 
          message: 'API Key and Secret are required for Binance connection' 
        };
      }

      // Mock Binance connection test - in reality would test API connectivity
      return { 
        success: true, 
        message: 'Binance connection successful! Ready to import crypto trades.' 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Binance connection failed: ${error.message}` 
      };
    }
  }

  /**
   * Fetch trades from broker API based on connection type
   * @param connection - The broker connection to fetch from
   * @returns Array of raw broker trades
   */
  private async fetchTradesFromBroker(connection: BrokerConnection): Promise<BrokerTrade[]> {
    try {
      switch (connection.brokerType) {
        case 'alpaca':
          return await this.fetchAlpacaTrades(connection);
        case 'interactive_brokers':
          return await this.fetchIBTrades(connection);
        case 'binance':
          return await this.fetchBinanceTrades(connection);
        default:
          console.warn(`Trade fetching not yet implemented for ${connection.brokerType}`);
          return [];
      }
    } catch (error: any) {
      console.error(`Error fetching trades from ${connection.brokerType}:`, error);
      throw new Error(`Failed to fetch trades from ${connection.brokerType}: ${error.message}`);
    }
  }

  /**
   * Fetch trades from Alpaca API
   * @param connection - Alpaca connection
   * @returns Array of Alpaca trades
   */
  private async fetchAlpacaTrades(connection: BrokerConnection): Promise<BrokerTrade[]> {
    // Mock implementation - replace with actual Alpaca API calls
    // In real implementation:
    /*
    const response = await fetch(`${connection.credentials.baseUrl}/v2/orders?status=filled&limit=500`, {
      headers: {
        'APCA-API-KEY-ID': connection.credentials.apiKey!,
        'APCA-API-SECRET-KEY': connection.credentials.apiSecret!
      }
    });
    
    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.status} ${response.statusText}`);
    }
    
    const orders = await response.json();
    return orders.map(order => this.convertAlpacaOrderToTrade(order, connection.id));
    */
    
    return [
      {
        brokerTradeId: `alpaca_${connection.id}_${Date.now()}_1`,
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        price: 150.50,
        timestamp: new Date(),
        commission: 0,
        brokerType: 'alpaca',
        orderId: 'order_123',
        originalData: {}
      }
    ];
  }

  /**
   * Fetch trades from Interactive Brokers
   * @param connection - IB connection
   * @returns Array of IB trades
   */
  private async fetchIBTrades(connection: BrokerConnection): Promise<BrokerTrade[]> {
    // Mock implementation - replace with actual IB API calls
    // In real implementation would use IB WebAPI or Python bridge
    return [
      {
        brokerTradeId: `ib_${connection.id}_${Date.now()}_1`,
        symbol: 'TSLA',
        side: 'buy',
        quantity: 50,
        price: 200.75,
        timestamp: new Date(),
        commission: 1.00,
        brokerType: 'interactive_brokers',
        orderId: 'ib_order_456',
        originalData: {}
      }
    ];
  }

  /**
   * Fetch trades from Binance API
   * @param connection - Binance connection
   * @returns Array of Binance trades
   */
  private async fetchBinanceTrades(connection: BrokerConnection): Promise<BrokerTrade[]> {
    // Mock implementation - replace with actual Binance API calls
    // In real implementation:
    /*
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', connection.credentials.binanceSecretKey!)
      .update(queryString).digest('hex');
    
    const response = await fetch(`${connection.credentials.baseUrl}/api/v3/myTrades?${queryString}&signature=${signature}`, {
      headers: {
        'X-MBX-APIKEY': connection.credentials.binanceApiKey!
      }
    });
    
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
    }
    
    const trades = await response.json();
    return trades.map(trade => this.convertBinanceTradeToStandard(trade, connection.id));
    */
    
    return [
      {
        brokerTradeId: `binance_${connection.id}_${Date.now()}_1`,
        symbol: 'BTCUSDT',
        side: 'buy',
        quantity: 0.1,
        price: 45000,
        timestamp: new Date(),
        commission: 4.5,
        brokerType: 'binance',
        orderId: 'binance_order_789',
        originalData: {}
      }
    ];
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate a unique broker trade ID
   * @param brokerType - The broker type
   * @param connectionId - The connection ID
   * @param originalId - The original trade ID from broker
   * @returns Unique broker trade ID
   */
  private generateBrokerTradeId(brokerType: string, connectionId: string, originalId: string): string {
    return `${brokerType}_${connectionId}_${originalId}_${Date.now()}`;
  }

  /**
   * Validate broker credentials based on broker type
   * @param brokerType - The broker type
   * @param credentials - The credentials to validate
   * @returns Validation result
   */
  private validateCredentials(brokerType: BrokerType, credentials: BrokerCredentials): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (brokerType) {
      case 'alpaca':
        if (!credentials.apiKey) errors.push('API Key is required');
        if (!credentials.apiSecret) errors.push('API Secret is required');
        if (!credentials.baseUrl) errors.push('Base URL is required');
        break;
        
      case 'interactive_brokers':
        if (!credentials.clientId) errors.push('Client ID is required');
        break;
        
      case 'binance':
        if (!credentials.binanceApiKey) errors.push('Binance API Key is required');
        if (!credentials.binanceSecretKey) errors.push('Binance Secret Key is required');
        break;
        
      default:
        errors.push(`Validation not implemented for ${brokerType}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Log broker operation for debugging and monitoring
   * @param operation - The operation being performed
   * @param brokerType - The broker type
   * @param details - Additional details
   */
  private logBrokerOperation(operation: string, brokerType: BrokerType, details?: any): void {
    console.log(`🔗 Broker ${operation}:`, {
      broker: brokerType,
      timestamp: new Date().toISOString(),
      details
    });
  }
}

// Export singleton instance
export const brokerService = new BrokerService();