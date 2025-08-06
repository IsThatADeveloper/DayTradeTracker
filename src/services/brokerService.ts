// src/services/brokerService.ts
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
import { db } from '../config/firebase';
import { 
  BrokerConnection, 
  BrokerTrade, 
  BrokerType, 
  SyncResult,
  ImportedTrade,
  BrokerCredentials 
} from '../types/broker';

const BROKER_CONNECTIONS_COLLECTION = 'broker_connections';
const BROKER_TRADES_COLLECTION = 'broker_trades';

interface FirestoreBrokerConnection extends Omit<BrokerConnection, 'lastSync' | 'createdAt' | 'updatedAt'> {
  lastSync: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface FirestoreBrokerTrade extends Omit<BrokerTrade, 'timestamp'> {
  timestamp: Timestamp;
  userId: string;
}

class BrokerService {
  // Broker Connections
  async addBrokerConnection(userId: string, connection: Omit<BrokerConnection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
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

  async updateBrokerConnection(connectionId: string, updates: Partial<BrokerConnection>): Promise<void> {
    try {
      const connectionRef = doc(db, BROKER_CONNECTIONS_COLLECTION, connectionId);
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      if (updates.lastSync) {
        updateData.lastSync = Timestamp.fromDate(updates.lastSync);
      }

      await updateDoc(connectionRef, updateData);
    } catch (error: any) {
      console.error('Error updating broker connection:', error);
      throw new Error(`Failed to update broker connection: ${error.message}`);
    }
  }

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

  // Broker Trades
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

  async getBrokerTrades(userId: string, connectionId?: string): Promise<BrokerTrade[]> {
    try {
      let q = query(
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

  // Test connection to broker
  async testConnection(brokerType: BrokerType, credentials: BrokerCredentials): Promise<{ success: boolean; message: string }> {
    try {
      // This would integrate with actual broker APIs
      // For now, we'll simulate the test
      switch (brokerType) {
        case 'alpaca':
          return await this.testAlpacaConnection(credentials);
        case 'interactive_brokers':
          return await this.testIBConnection(credentials);
        case 'binance':
          return await this.testBinanceConnection(credentials);
        default:
          return { success: false, message: `Testing not yet implemented for ${brokerType}` };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // Sync trades from broker
  async syncTrades(userId: string, connection: BrokerConnection): Promise<SyncResult> {
    try {
      const result: SyncResult = {
        success: false,
        tradesImported: 0,
        tradesSkipped: 0,
        errors: [],
        lastSyncTime: new Date()
      };

      // Get trades from broker API
      const brokerTrades = await this.fetchTradesFromBroker(connection);
      
      // Check for existing trades to avoid duplicates
      const existingTrades = await this.getBrokerTrades(userId, connection.id);
      const existingTradeIds = new Set(existingTrades.map(t => t.brokerTradeId));

      // Import new trades
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

  // Convert broker trades to our standard format
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

    // Process each symbol's trades
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
          // Closing or adding to position
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
            // Adding to position
            entryPrice = (entryPrice * Math.abs(position) + trade.price * Math.abs(quantity)) / (Math.abs(position) + Math.abs(quantity));
            position += quantity;
          }
        }
      }
    });

    return trades;
  }

  // Fixed: Changed from private to public methods
  async testAlpacaConnection(credentials: BrokerCredentials): Promise<{ success: boolean; message: string }> {
    try {
      // Mock Alpaca API test
      if (!credentials.apiKey || !credentials.apiSecret) {
        return { success: false, message: 'API Key and Secret are required' };
      }

      // In real implementation, make actual API call to Alpaca
      // const response = await fetch(`${credentials.baseUrl}/v2/account`, {
      //   headers: {
      //     'APCA-API-KEY-ID': credentials.apiKey,
      //     'APCA-API-SECRET-KEY': credentials.apiSecret
      //   }
      // });

      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async testIBConnection(credentials: BrokerCredentials): Promise<{ success: boolean; message: string }> {
    try {
      if (!credentials.clientId) {
        return { success: false, message: 'Client ID is required' };
      }

      // Mock IB connection test
      return { success: true, message: 'Connection successful (ensure TWS/Gateway is running)' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async testBinanceConnection(credentials: BrokerCredentials): Promise<{ success: boolean; message: string }> {
    try {
      if (!credentials.binanceApiKey || !credentials.binanceSecretKey) {
        return { success: false, message: 'API Key and Secret are required' };
      }

      // Mock Binance connection test
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async fetchTradesFromBroker(connection: BrokerConnection): Promise<BrokerTrade[]> {
    // This would fetch real trades from broker APIs
    // For now, return mock data for demonstration
    const mockTrades: BrokerTrade[] = [];

    try {
      switch (connection.brokerType) {
        case 'alpaca':
          return await this.fetchAlpacaTrades(connection);
        case 'interactive_brokers':
          return await this.fetchIBTrades(connection);
        case 'binance':
          return await this.fetchBinanceTrades(connection);
        default:
          console.warn(`Fetching not yet implemented for ${connection.brokerType}`);
          return mockTrades;
      }
    } catch (error: any) {
      console.error(`Error fetching trades from ${connection.brokerType}:`, error);
      throw error;
    }
  }

  async fetchAlpacaTrades(connection: BrokerConnection): Promise<BrokerTrade[]> {
    // Mock Alpaca API implementation
    // In real implementation:
    /*
    const response = await fetch(`${connection.credentials.baseUrl}/v2/orders`, {
      headers: {
        'APCA-API-KEY-ID': connection.credentials.apiKey!,
        'APCA-API-SECRET-KEY': connection.credentials.apiSecret!
      }
    });
    const orders = await response.json();
    return orders.map(order => this.convertAlpacaOrder(order));
    */
    
    return [
      {
        brokerTradeId: `alpaca_${Date.now()}_1`,
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

  async fetchIBTrades(connection: BrokerConnection): Promise<BrokerTrade[]> {
    // Mock IB API implementation
    // In real implementation, you'd use the IB WebAPI or Python API bridge
    return [
      {
        brokerTradeId: `ib_${Date.now()}_1`,
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

  async fetchBinanceTrades(connection: BrokerConnection): Promise<BrokerTrade[]> {
    // Mock Binance API implementation
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
    */
    
    return [
      {
        brokerTradeId: `binance_${Date.now()}_1`,
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
}

// Export singleton instance
export const brokerService = new BrokerService();