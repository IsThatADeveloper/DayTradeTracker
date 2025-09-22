// src/services/brokerService.ts - Add encryption
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
import { BrokerConnection, BrokerCredentials, BrokerType } from '../types/broker';
import { encryptionService } from './encryptionService';
import { auditService } from './auditService';

const BROKER_CONNECTIONS_COLLECTION = 'broker_connections';

class BrokerService {
  async addBrokerConnection(
    userId: string, 
    connection: Omit<BrokerConnection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      // Encrypt sensitive credentials before storing
      const encryptedCredentials = encryptionService.encryptSensitiveData(connection.credentials);
      
      const now = Timestamp.now();
      const connectionData = {
        ...connection,
        credentials: encryptedCredentials,
        userId,
        lastSync: connection.lastSync ? Timestamp.fromDate(connection.lastSync) : null,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, BROKER_CONNECTIONS_COLLECTION), connectionData);
      
      // Log broker connection creation
      await auditService.logSecurityEvent(userId, 'broker_connection_created', {
        brokerType: connection.brokerType,
        connectionId: docRef.id
      }, 'medium');
      
      return docRef.id;
    } catch (error: any) {
      console.error('Error adding broker connection:', error);
      await auditService.logSecurityEvent(userId, 'broker_connection_failed', {
        error: error.message,
        brokerType: connection.brokerType
      }, 'high');
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
        const data = doc.data() as any;
        
        try {
          // Decrypt credentials before returning
          const decryptedCredentials = encryptionService.decryptSensitiveData(data.credentials);
          
          connections.push({
            ...data,
            id: doc.id,
            credentials: decryptedCredentials,
            lastSync: data.lastSync?.toDate() || null,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          });
        } catch (decryptError) {
          console.error('Failed to decrypt broker credentials:', decryptError);
          // Still include connection but with empty credentials
          connections.push({
            ...data,
            id: doc.id,
            credentials: {},
            lastSync: data.lastSync?.toDate() || null,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          });
        }
      });

      // Log data access
      await auditService.logDataAccess(userId, 'broker_connections', `${connections.length}_connections`);

      return connections;
    } catch (error: any) {
      console.error('Error fetching broker connections:', error);
      throw new Error(`Failed to fetch broker connections: ${error.message}`);
    }
  }

  async testConnection(brokerType: BrokerType, credentials: BrokerCredentials): Promise<{ success: boolean; message: string }> {
    try {
      // Basic credential validation
      switch (brokerType) {
        case 'alpaca':
          if (!credentials.apiKey || !credentials.apiSecret) {
            return { success: false, message: 'API Key and Secret are required for Alpaca' };
          }
          break;
        case 'interactive_brokers':
          if (!credentials.clientId) {
            return { success: false, message: 'Client ID is required for Interactive Brokers' };
          }
          break;
        case 'binance':
          if (!credentials.binanceApiKey || !credentials.binanceSecretKey) {
            return { success: false, message: 'API Key and Secret are required for Binance' };
          }
          break;
      }

      // Mock successful connection for now
      return { success: true, message: `${brokerType} connection test successful` };
    } catch (error: any) {
      return { success: false, message: `Connection test failed: ${error.message}` };
    }
  }
}

export const brokerService = new BrokerService();