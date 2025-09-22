// src/services/tradeService.ts - Fixed version
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
import { validationService } from './validationService';

const TRADES_COLLECTION = 'trades';

export interface FirestoreTrade extends Omit<Trade, 'timestamp'> {
  userId: string;
  timestamp: Timestamp;
}

export const tradeService = {
  async addTrade(userId: string, trade: Trade): Promise<string> {
    console.log('🔥 Adding trade with security validation');
    
    try {
      // Rate limiting check
      if (!validationService.checkRateLimit(userId, 'addTrade', 30, 60000)) {
        throw new Error('Rate limit exceeded. Please wait before adding more trades.');
      }

      // Validate and sanitize trade data
      const validation = validationService.validateTrade(trade);
      if (!validation.isValid) {
        const errorMsg = `Invalid trade data: ${validation.errors.join(', ')}`;
        console.error('Trade validation failed:', validation.errors);
        throw new Error(errorMsg);
      }

      const sanitizedTrade = { ...trade, ...validation.sanitized };

      // Create clean trade data for Firestore
      const tradeData: any = {
        ...sanitizedTrade,
        userId,
        timestamp: Timestamp.fromDate(sanitizedTrade.timestamp!),
        updateCount: 0,
        lastUpdated: Timestamp.fromDate(new Date())
      };
      
      // Handle notes field - Firestore doesn't accept undefined
      tradeData.notes = sanitizedTrade.notes || null;
      
      const docRef = await addDoc(collection(db, TRADES_COLLECTION), tradeData);
      console.log('✅ Trade added securely with ID:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Error adding trade:', error);
      throw new Error(`Failed to add trade: ${error.message}`);
    }
  },

  async getUserTrades(userId: string): Promise<Trade[]> {
    console.log('🔥 Fetching trades for user:', userId);
    
    try {
      // Rate limiting for reads
      if (!validationService.checkRateLimit(userId, 'getUserTrades', 100, 60000)) {
        throw new Error('Rate limit exceeded for trade fetching.');
      }

      const q = query(
        collection(db, TRADES_COLLECTION),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const trades: Trade[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreTrade;
        trades.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp.toDate(),
          notes: data.notes === null ? undefined : data.notes,
          updateCount: data.updateCount || 0,
          lastUpdated: (data as any).lastUpdated ? ((data as any).lastUpdated as Timestamp).toDate() : undefined
        });
      });
      
      // Sort in JavaScript
      trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      console.log('✅ Successfully loaded', trades.length, 'trades');
      return trades;
    } catch (error: any) {
      console.error('❌ Error fetching trades:', error);
      throw new Error(`Failed to fetch trades: ${error.message}`);
    }
  },

  async updateTrade(tradeId: string, updates: Partial<Trade>): Promise<void> {
    console.log('🔥 Updating trade with security validation');
    
    try {
      // Validate updates if they contain data to validate
      if (Object.keys(updates).some(key => ['ticker', 'entryPrice', 'exitPrice', 'quantity', 'direction', 'notes', 'timestamp'].includes(key))) {
        const validation = validationService.validateTrade(updates);
        if (!validation.isValid) {
          throw new Error(`Invalid update data: ${validation.errors.join(', ')}`);
        }
        updates = { ...updates, ...validation.sanitized };
      }

      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      const updateData: any = {};
      
      // Copy over defined values
      if (updates.ticker !== undefined) updateData.ticker = updates.ticker;
      if (updates.entryPrice !== undefined) updateData.entryPrice = updates.entryPrice;
      if (updates.exitPrice !== undefined) updateData.exitPrice = updates.exitPrice;
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.direction !== undefined) updateData.direction = updates.direction;
      if (updates.realizedPL !== undefined) updateData.realizedPL = updates.realizedPL;
      
      if (updates.timestamp !== undefined) {
        updateData.timestamp = Timestamp.fromDate(updates.timestamp);
      }
      
      // Handle notes field
      if ('notes' in updates) {
        updateData.notes = updates.notes || null;
      }
      
      // Increment update count safely
      const currentUpdateCount = updates.updateCount || 0;
      updateData.updateCount = currentUpdateCount + 1;
      updateData.lastUpdated = Timestamp.fromDate(new Date());
      
      // Security check for excessive updates
      if (updateData.updateCount > 10) {
        console.warn('Excessive updates detected for trade:', tradeId);
        throw new Error('Trade has been updated too many times. Please contact support if needed.');
      }
      
      await updateDoc(tradeRef, updateData);
      console.log('✅ Trade updated securely with updateCount:', updateData.updateCount);
      
    } catch (error: any) {
      console.error('❌ Error updating trade:', error);
      throw new Error(`Failed to update trade: ${error.message}`);
    }
  },

  async deleteTrade(tradeId: string): Promise<void> {
    console.log('🔥 Deleting trade:', tradeId);
    
    try {
      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      await deleteDoc(tradeRef);
      console.log('✅ Trade deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting trade:', error);
      throw new Error(`Failed to delete trade: ${error.message}`);
    }
  },

  // Keep existing methods
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
  }
};