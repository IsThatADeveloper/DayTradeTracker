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
    console.log('🔥 Adding trade to Firestore:', { userId, ticker: trade.ticker });
    
    try {
      const tradeData: Omit<FirestoreTrade, 'id'> = {
        ...trade,
        userId,
        timestamp: Timestamp.fromDate(trade.timestamp),
      };
      
      console.log('🔥 Trade data to save:', tradeData);
      
      const docRef = await addDoc(collection(db, TRADES_COLLECTION), tradeData);
      console.log('✅ Trade added with ID:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Error adding trade:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw new Error(`Failed to add trade: ${error.message}`);
    }
  },

  // Get all trades for a user (simplified - no orderBy to avoid index requirement)
  async getUserTrades(userId: string): Promise<Trade[]> {
    console.log('🔥 Fetching trades for user:', userId);
    
    try {
      // Simplified query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, TRADES_COLLECTION),
        where('userId', '==', userId)
      );
      
      console.log('🔥 Executing simplified query...');
      const querySnapshot = await getDocs(q);
      console.log('🔥 Query result:', querySnapshot.size, 'documents');
      
      const trades: Trade[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreTrade;
        console.log('🔥 Processing document:', doc.id, data);
        
        trades.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp.toDate(),
        });
      });
      
      // Sort in JavaScript instead of Firestore
      trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      console.log('✅ Successfully loaded and sorted', trades.length, 'trades');
      return trades;
    } catch (error: any) {
      console.error('❌ Error fetching trades:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw new Error(`Failed to fetch trades: ${error.message}`);
    }
  },

  // Update a trade
  async updateTrade(tradeId: string, updates: Partial<Trade>): Promise<void> {
    console.log('🔥 Updating trade:', tradeId, updates);
    
    try {
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      const updateData: any = { ...updates };
      
      // Convert timestamp if present
      if (updates.timestamp) {
        updateData.timestamp = Timestamp.fromDate(updates.timestamp);
      }
      
      await updateDoc(tradeRef, updateData);
      console.log('✅ Trade updated successfully');
    } catch (error: any) {
      console.error('❌ Error updating trade:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw new Error(`Failed to update trade: ${error.message}`);
    }
  },

  // Delete a trade
  async deleteTrade(tradeId: string): Promise<void> {
    console.log('🔥 Deleting trade:', tradeId);
    
    try {
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      await deleteDoc(tradeRef);
      console.log('✅ Trade deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting trade:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw new Error(`Failed to delete trade: ${error.message}`);
    }
  },

  // Sync local trades to Firestore (for migration)
  async syncLocalTrades(userId: string, localTrades: Trade[]): Promise<void> {
    console.log('🔥 Syncing', localTrades.length, 'local trades to Firestore');
    
    try {
      const promises = localTrades.map(trade => this.addTrade(userId, trade));
      await Promise.all(promises);
      console.log('✅ All local trades synced successfully');
    } catch (error: any) {
      console.error('❌ Error syncing local trades:', error);
      throw new Error(`Failed to sync local trades: ${error.message}`);
    }
  },
};