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
      // Create clean trade data for Firestore with proper updateCount initialization
      const tradeData: any = {
        ...trade,
        userId,
        timestamp: Timestamp.fromDate(trade.timestamp),
        updateCount: 0, // Initialize update count for new trades
        lastUpdated: Timestamp.fromDate(new Date()) // Set initial lastUpdated
      };
      
      // Handle notes field - Firestore doesn't accept undefined
      if (trade.notes) {
        tradeData.notes = trade.notes;
      } else {
        tradeData.notes = null;
      }
      
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
          // Convert null back to undefined for consistency with Trade interface
          notes: data.notes === null ? undefined : data.notes,
          // Ensure updateCount exists (for backward compatibility with old trades)
          updateCount: data.updateCount || 0,
          lastUpdated: (data as any).lastUpdated ? ((data as any).lastUpdated as Timestamp).toDate() : undefined
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

  // Update a trade with proper updateCount handling
  async updateTrade(tradeId: string, updates: Partial<Trade>): Promise<void> {
    console.log('🔥 Updating trade:', tradeId, 'with updates:', updates);
    
    try {
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      
      // Create a clean update object that preserves field structure
      const updateData: any = {};
      
      // Copy over defined values, converting types as needed
      if (updates.ticker !== undefined) updateData.ticker = updates.ticker;
      if (updates.entryPrice !== undefined) updateData.entryPrice = updates.entryPrice;
      if (updates.exitPrice !== undefined) updateData.exitPrice = updates.exitPrice;
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.direction !== undefined) updateData.direction = updates.direction;
      if (updates.realizedPL !== undefined) updateData.realizedPL = updates.realizedPL;
      
      // Handle timestamp conversion
      if (updates.timestamp !== undefined) {
        updateData.timestamp = Timestamp.fromDate(updates.timestamp);
      }
      
      // Handle notes field explicitly - the key to preventing deletion
      if ('notes' in updates) {
        // CRITICAL: Always explicitly set notes, never let it be undefined
        updateData.notes = updates.notes || null;
      }
      
      // CRITICAL BUG FIX: Instead of complex field handling, use a simpler approach
      // The issue might be that we're trying to read the document during update
      
      // Get current updateCount if it exists, otherwise default to 0
      const currentUpdateCount = updates.updateCount || 0;
      
      // Increment updateCount safely
      updateData.updateCount = currentUpdateCount + 1;
      updateData.lastUpdated = Timestamp.fromDate(new Date());
      
      console.log('🔥 Final update data being sent to Firestore:', updateData);
      console.log('🔥 New updateCount will be:', updateData.updateCount);
      
      // Use updateDoc but with careful field handling
      await updateDoc(tradeRef, updateData);
      
      console.log('✅ Trade updated successfully with updateCount:', updateData.updateCount);
      
    } catch (error: any) {
      console.error('❌ Error updating trade:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error object:', error);
      
      // If this is a permission error or the trade was deleted, throw a more specific error
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied: Unable to update trade. Please check your authentication.');
      } else if (error.message.includes('No document to update')) {
        throw new Error('Trade no longer exists. It may have been deleted by the 3-edit bug.');
      } else {
        throw new Error(`Failed to update trade: ${error.message}`);
      }
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

  // NEW: Safe update method that creates a backup before updating
  async safeUpdateTrade(tradeId: string, updates: Partial<Trade>): Promise<void> {
    console.log('🔒 Safe updating trade:', tradeId, 'with updates:', updates);
    
    try {
      // First, fetch the current trade data as backup
      const currentTradeSnapshot = await getDocs(query(
        collection(db, TRADES_COLLECTION),
        where('__name__', '==', tradeId)
      ));
      
      if (currentTradeSnapshot.empty) {
        throw new Error('Trade not found');
      }
      
      const currentTradeData = currentTradeSnapshot.docs[0].data();
      console.log('🔒 Current trade data (backup):', currentTradeData);
      
      // Check if this would be the 3rd update
      const currentUpdateCount = currentTradeData.updateCount || 0;
      if (currentUpdateCount >= 2) {
        console.warn('⚠️ WARNING: This trade has been updated', currentUpdateCount, 'times. Creating safety backup...');
        
        // Create a backup copy of the trade before the risky update
        const backupTradeData = {
          ...currentTradeData,
          id: `${tradeId}_backup_${Date.now()}`,
          notes: `${currentTradeData.notes || ''} [BACKUP BEFORE UPDATE ${currentUpdateCount + 1}]`.trim()
        };
        
        await addDoc(collection(db, 'trade_backups'), backupTradeData);
        console.log('✅ Backup created for risky update');
      }
      
      // Proceed with the update using the original method
      await this.updateTrade(tradeId, updates);
      
    } catch (error: any) {
      console.error('❌ Error in safe update:', error);
      throw error;
    }
  }
};