// src/services/tradeService.ts
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
      const tradeData: Omit<FirestoreTrade, 'id'> = {
        ...trade,
        userId,
        timestamp: Timestamp.fromDate(trade.timestamp),
      };
      
      const docRef = await addDoc(collection(db, TRADES_COLLECTION), tradeData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding trade:', error);
      throw error;
    }
  },

  // Get all trades for a user
  async getUserTrades(userId: string): Promise<Trade[]> {
    try {
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
          id: doc.id,
          timestamp: data.timestamp.toDate(),
        });
      });
      
      return trades;
    } catch (error) {
      console.error('Error fetching trades:', error);
      throw error;
    }
  },

  // Update a trade
  async updateTrade(tradeId: string, updates: Partial<Trade>): Promise<void> {
    try {
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      const updateData: any = { ...updates };
      
      // Convert timestamp if present
      if (updates.timestamp) {
        updateData.timestamp = Timestamp.fromDate(updates.timestamp);
      }
      
      await updateDoc(tradeRef, updateData);
    } catch (error) {
      console.error('Error updating trade:', error);
      throw error;
    }
  },

  // Delete a trade
  async deleteTrade(tradeId: string): Promise<void> {
    try {
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      await deleteDoc(tradeRef);
    } catch (error) {
      console.error('Error deleting trade:', error);
      throw error;
    }
  },

  // Sync local trades to Firestore (for migration)
  async syncLocalTrades(userId: string, localTrades: Trade[]): Promise<void> {
    try {
      const promises = localTrades.map(trade => this.addTrade(userId, trade));
      await Promise.all(promises);
    } catch (error) {
      console.error('Error syncing local trades:', error);
      throw error;
    }
  },
};