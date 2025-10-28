// src/services/tradeService.ts - Complete service with status field support
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
  orderBy,
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
  /**
   * Add a new trade to Firestore
   */
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
      
      // Handle status field - default to 'closed' if not provided
      tradeData.status = sanitizedTrade.status || 'closed';
      
      // Remove the id field if it exists (Firestore generates it)
      delete tradeData.id;
      
      const docRef = await addDoc(collection(db, TRADES_COLLECTION), tradeData);
      console.log('✅ Trade added securely with ID:', docRef.id, 'Status:', tradeData.status);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Error adding trade:', error);
      throw new Error(`Failed to add trade: ${error.message}`);
    }
  },

  /**
   * Get all trades for a user
   */
  async getUserTrades(userId: string): Promise<Trade[]> {
    console.log('🔥 Fetching trades for user:', userId);
    
    try {
      // Rate limiting for reads
      if (!validationService.checkRateLimit(userId, 'getUserTrades', 100, 60000)) {
        throw new Error('Rate limit exceeded for trade fetching.');
      }

      // FIXED: Removed orderBy to avoid index requirement - will sort in memory
      const q = query(
        collection(db, TRADES_COLLECTION),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      
      const trades: Trade[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ticker: data.ticker,
          entryPrice: data.entryPrice,
          exitPrice: data.exitPrice,
          quantity: data.quantity,
          timestamp: data.timestamp.toDate(),
          direction: data.direction,
          realizedPL: data.realizedPL,
          notes: data.notes || null,
          updateCount: data.updateCount || 0,
          lastUpdated: data.lastUpdated?.toDate() || new Date(),
          status: data.status || 'closed', // Default to 'closed' for backward compatibility
        };
      });

      // Sort in memory by timestamp (descending - newest first)
      trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.log(`✅ Fetched ${trades.length} trades for user`);
      return trades;
    } catch (error: any) {
      console.error('❌ Error fetching trades:', error);
      throw new Error(`Failed to fetch trades: ${error.message}`);
    }
  },

  /**
   * Update an existing trade
   */
  async updateTrade(userId: string, tradeId: string, updates: Partial<Trade>): Promise<void> {
    console.log('🔥 Updating trade:', tradeId);
    
    try {
      // Rate limiting
      if (!validationService.checkRateLimit(userId, 'updateTrade', 50, 60000)) {
        throw new Error('Rate limit exceeded for trade updates.');
      }

      // Validate updates
      if (updates.timestamp || updates.ticker || updates.entryPrice || updates.exitPrice || 
          updates.quantity || updates.direction || updates.realizedPL) {
        const tradeToValidate = updates as Trade;
        const validation = validationService.validateTrade(tradeToValidate);
        if (!validation.isValid) {
          throw new Error(`Invalid trade data: ${validation.errors.join(', ')}`);
        }
      }

      const updateData: any = { ...updates };
      
      // Convert timestamp to Firestore Timestamp if present
      if (updateData.timestamp) {
        updateData.timestamp = Timestamp.fromDate(updateData.timestamp);
      }
      
      // Handle notes field
      if (updateData.notes === undefined) {
        // Don't update notes if not provided
        delete updateData.notes;
      } else if (updateData.notes === null || updateData.notes === '') {
        updateData.notes = null;
      }
      
      // Handle status field
      if (updateData.status) {
        updateData.status = updateData.status;
      }
      
      // Update metadata
      updateData.lastUpdated = Timestamp.fromDate(new Date());
      updateData.updateCount = (updates.updateCount || 0) + 1;
      
      // Remove id field if present
      delete updateData.id;

      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      await updateDoc(tradeRef, updateData);
      
      console.log('✅ Trade updated successfully');
    } catch (error: any) {
      console.error('❌ Error updating trade:', error);
      throw new Error(`Failed to update trade: ${error.message}`);
    }
  },

  /**
   * Delete a trade
   */
  async deleteTrade(userId: string, tradeId: string): Promise<void> {
    console.log('🔥 Deleting trade:', tradeId);
    
    try {
      // Rate limiting
      if (!validationService.checkRateLimit(userId, 'deleteTrade', 30, 60000)) {
        throw new Error('Rate limit exceeded for trade deletion.');
      }

      const tradeRef = doc(db, TRADES_COLLECTION, tradeId);
      await deleteDoc(tradeRef);
      
      console.log('✅ Trade deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting trade:', error);
      throw new Error(`Failed to delete trade: ${error.message}`);
    }
  },

  /**
   * Get trades for a specific date
   */
  async getTradesForDate(userId: string, date: Date): Promise<Trade[]> {
    try {
      const allTrades = await this.getUserTrades(userId);
      
      return allTrades.filter(trade => {
        const tradeDate = new Date(trade.timestamp);
        return (
          tradeDate.getFullYear() === date.getFullYear() &&
          tradeDate.getMonth() === date.getMonth() &&
          tradeDate.getDate() === date.getDate()
        );
      });
    } catch (error: any) {
      console.error('❌ Error fetching trades for date:', error);
      throw new Error(`Failed to fetch trades for date: ${error.message}`);
    }
  },

  /**
   * Get trades within a date range
   */
  async getTradesInRange(userId: string, startDate: Date, endDate: Date): Promise<Trade[]> {
    try {
      const allTrades = await this.getUserTrades(userId);
      
      return allTrades.filter(trade => {
        const tradeDate = new Date(trade.timestamp);
        return tradeDate >= startDate && tradeDate <= endDate;
      });
    } catch (error: any) {
      console.error('❌ Error fetching trades in range:', error);
      throw new Error(`Failed to fetch trades in range: ${error.message}`);
    }
  },

  /**
   * Get only open positions
   */
  async getOpenPositions(userId: string): Promise<Trade[]> {
    try {
      const allTrades = await this.getUserTrades(userId);
      return allTrades.filter(trade => trade.status === 'open');
    } catch (error: any) {
      console.error('❌ Error fetching open positions:', error);
      throw new Error(`Failed to fetch open positions: ${error.message}`);
    }
  },

  /**
   * Get only closed positions
   */
  async getClosedPositions(userId: string): Promise<Trade[]> {
    try {
      const allTrades = await this.getUserTrades(userId);
      return allTrades.filter(trade => trade.status === 'closed' || !trade.status);
    } catch (error: any) {
      console.error('❌ Error fetching closed positions:', error);
      throw new Error(`Failed to fetch closed positions: ${error.message}`);
    }
  },

  /**
   * Close an open position by updating exit price and calculating P&L
   */
  async closePosition(userId: string, tradeId: string, exitPrice: number): Promise<void> {
    try {
      // Get the trade first to calculate P&L
      const allTrades = await this.getUserTrades(userId);
      const trade = allTrades.find(t => t.id === tradeId);
      
      if (!trade) {
        throw new Error('Trade not found');
      }
      
      if (trade.status === 'closed') {
        throw new Error('Position is already closed');
      }
      
      // Calculate realized P&L
      const realizedPL = trade.direction === 'long'
        ? (exitPrice - trade.entryPrice) * trade.quantity
        : (trade.entryPrice - exitPrice) * trade.quantity;
      
      // Update the trade
      await this.updateTrade(userId, tradeId, {
        exitPrice,
        realizedPL,
        status: 'closed',
      });
      
      console.log(`✅ Position closed: ${trade.ticker}, P&L: ${realizedPL}`);
    } catch (error: any) {
      console.error('❌ Error closing position:', error);
      throw new Error(`Failed to close position: ${error.message}`);
    }
  },

  /**
   * Bulk add trades (for imports)
   */
  async bulkAddTrades(userId: string, trades: Trade[]): Promise<{ success: number; failed: number; errors: string[] }> {
    console.log(`🔥 Bulk adding ${trades.length} trades`);
    
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const trade of trades) {
      try {
        await this.addTrade(userId, trade);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`${trade.ticker}: ${error.message}`);
        console.error(`Failed to add trade ${trade.ticker}:`, error);
      }
    }
    
    console.log(`✅ Bulk import complete: ${success} success, ${failed} failed`);
    return { success, failed, errors };
  },
};