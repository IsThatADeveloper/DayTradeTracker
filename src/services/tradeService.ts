// src/services/tradeService.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Trade } from '../types/trade';

const TRADES_COLLECTION = 'trades';

export interface FirestoreTrade extends Omit<Trade, 'timestamp'> {
  userId: string;
  timestamp: Timestamp;
}

export const tradeService = {
  // Add a new trade
  async addTrade(userId: string, trade: Trade): Promise<string> {
    try {
      console.log('📝 Adding trade to Firestore for user:', userId);
      
      const tradeData: Omit<FirestoreTrade, 'id'> = {
        ...trade,
        userId,
        timestamp: Timestamp.fromDate(trade.timestamp),
      };
      
      // Remove the client-generated ID since Firebase will generate its own
      delete (tradeData as any).id;
      
      const docRef = await addDoc(collection(db, TRADES_COLLECTION), tradeData);
      console.log('✅ Trade added to Firestore with ID:', docRef.id);
      
      // Verify the trade was saved correctly
      const savedDoc = await getDoc(docRef);
      if (!savedDoc.exists()) {
        throw new Error('Trade was not saved properly to Firestore');
      }
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding trade to Firestore:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Unable to save trade. Please check your authentication.');
      }
      throw error;
    }
  },

  // Get all trades for a user
  async getUserTrades(userId: string): Promise<Trade[]> {
    try {
      console.log('📥 Fetching trades for user:', userId);
      
      const q = query(
        collection(db, TRADES_COLLECTION),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const trades: Trade[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreTrade;
        trades.push({
          ...data,
          id: doc.id, // Use Firebase document ID
          timestamp: data.timestamp.toDate(),
        });
      });
      
      console.log(`✅ Fetched ${trades.length} trades for user ${userId}`);
      return trades;
    } catch (error) {
      console.error('❌ Error fetching trades:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Unable to read trades. Please check your authentication.');
      }
      throw error;
    }
  },

  // Update a trade
  async updateTrade(tradeId: string, updates: Partial<Trade>): Promise<void> {
    try {
      console.log('✏️ Updating trade:', tradeId);
      
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      const updateData: any = { ...updates };
      
      // Remove id from updates since it shouldn't be updated
      delete updateData.id;
      
      // Convert timestamp if present
      if (updates.timestamp) {
        updateData.timestamp = Timestamp.fromDate(updates.timestamp);
      }
      
      await updateDoc(tradeRef, updateData);
      console.log('✅ Trade updated successfully:', tradeId);
    } catch (error) {
      console.error('❌ Error updating trade:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Unable to update trade. Please check your authentication.');
      }
      throw error;
    }
  },

  // Delete a trade
  async deleteTrade(tradeId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting trade:', tradeId);
      
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      await deleteDoc(tradeRef);
      
      console.log('✅ Trade deleted successfully:', tradeId);
    } catch (error) {
      console.error('❌ Error deleting trade:', error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Unable to delete trade. Please check your authentication.');
      }
      throw error;
    }
  },

  // Sync local trades to Firestore (for migration)
  async syncLocalTrades(userId: string, localTrades: Trade[]): Promise<Trade[]> {
    try {
      console.log(`🔄 Syncing ${localTrades.length} local trades to Firestore for user:`, userId);
      
      const results = await Promise.allSettled(
        localTrades.map(async (trade) => {
          const firebaseId = await this.addTrade(userId, trade);
          return { ...trade, id: firebaseId };
        })
      );
      
      const successful: Trade[] = [];
      const failed: any[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          failed.push({ trade: localTrades[index], error: result.reason });
        }
      });
      
      if (failed.length > 0) {
        console.warn(`⚠️ ${failed.length} trades failed to sync:`, failed);
      }
      
      console.log(`✅ Successfully synced ${successful.length} trades to Firestore`);
      return successful;
    } catch (error) {
      console.error('❌ Error syncing local trades:', error);
      throw error;
    }
  },
};