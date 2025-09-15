// src/services/dailyReviewService.ts - Fixed Version
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
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DailyReview, DailyReviewSummary } from '../types/dailyReview';
import { Trade } from '../types/trade';
import { calculateDailyStats, formatCurrency } from '../utils/tradeUtils';
import { format, startOfDay, endOfDay } from 'date-fns';

const DAILY_REVIEWS_COLLECTION = 'daily_reviews';

// Firestore-specific interface
interface FirestoreDailyReview extends Omit<DailyReview, 'date' | 'createdAt' | 'updatedAt'> {
  date: Timestamp;
  dateString: string; // Add this for efficient querying
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Service for managing daily trading reviews and report cards
 */
class DailyReviewService {
  
  /**
   * Generate a date string for efficient querying (YYYY-MM-DD format)
   */
  private getDateString(date: Date): string {
    return format(startOfDay(date), 'yyyy-MM-dd');
  }

  /**
   * Create or update a daily review
   * @param userId - User ID
   * @param review - Daily review data
   * @returns Promise resolving to review ID
   */
  async saveDailyReview(userId: string, review: Omit<DailyReview, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Check if review already exists for this date
      const existingReview = await this.getDailyReview(userId, review.date);
      
      if (existingReview) {
        // Update existing review
        await this.updateDailyReview(existingReview.id, review);
        return existingReview.id;
      } else {
        // Create new review
        const now = Timestamp.now();
        const reviewData: Omit<FirestoreDailyReview, 'id'> = {
          ...review,
          userId,
          date: Timestamp.fromDate(startOfDay(review.date)),
          dateString: this.getDateString(review.date), // Add date string for efficient querying
          createdAt: now,
          updatedAt: now,
        };

        const docRef = await addDoc(collection(db, DAILY_REVIEWS_COLLECTION), reviewData);
        console.log('✅ Daily review created with ID:', docRef.id);
        return docRef.id;
      }
    } catch (error: any) {
      console.error('❌ Error saving daily review:', error);
      throw new Error(`Failed to save daily review: ${error.message}`);
    }
  }

  /**
   * Get daily review for a specific date - FIXED: Use simple query to avoid index issues
   * @param userId - User ID
   * @param date - Target date
   * @returns Promise resolving to daily review or null
   */
  async getDailyReview(userId: string, date: Date): Promise<DailyReview | null> {
    try {
      const dateString = this.getDateString(date);
      
      console.log('🔍 Attempting to fetch daily review:', { userId: userId.slice(0, 8), dateString });
      
      // FIXED: Use simple query with only userId to avoid compound index requirement
      const q = query(
        collection(db, DAILY_REVIEWS_COLLECTION),
        where('userId', '==', userId)
      );

      console.log('🔍 Executing simple userId query...');
      const querySnapshot = await getDocs(q);
      console.log('🔍 Query successful, found', querySnapshot.size, 'documents');
      
      // Filter in memory to find the specific date
      let targetReview: DailyReview | null = null;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreDailyReview;
        const reviewDateString = data.dateString || this.getDateString(data.date.toDate());
        
        if (reviewDateString === dateString) {
          targetReview = this.convertFirestoreToReview(doc.id, data);
        }
      });
      
      if (!targetReview) {
        console.log(`No daily review found for ${userId} on ${dateString}`);
        return null;
      }

      console.log('✅ Found daily review for', dateString);
      return targetReview;
      
    } catch (error: any) {
      console.error('❌ Error fetching daily review:', error);
      
      // Provide more specific error information
      if (error.code === 'failed-precondition') {
        throw new Error('Database index required. Please contact support or try again later.');
      } else if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Please sign in again.');
      } else {
        throw new Error(`Failed to fetch daily review: ${error.message}`);
      }
    }
  }

  /**
   * Update an existing daily review
   * @param reviewId - Review ID to update
   * @param updates - Partial review data to update
   */
  async updateDailyReview(reviewId: string, updates: Partial<DailyReview>): Promise<void> {
    try {
      const reviewRef = doc(db, DAILY_REVIEWS_COLLECTION, reviewId);
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.now()
      };

      // Convert Date objects to Timestamps if present
      if (updates.date) {
        updateData.date = Timestamp.fromDate(startOfDay(updates.date));
        updateData.dateString = this.getDateString(updates.date);
      }

      await updateDoc(reviewRef, updateData);
      console.log('✅ Daily review updated successfully');
    } catch (error: any) {
      console.error('❌ Error updating daily review:', error);
      throw new Error(`Failed to update daily review: ${error.message}`);
    }
  }

  /**
   * Delete a daily review
   * @param reviewId - Review ID to delete
   */
  async deleteDailyReview(reviewId: string): Promise<void> {
    try {
      const reviewRef = doc(db, DAILY_REVIEWS_COLLECTION, reviewId);
      await deleteDoc(reviewRef);
      console.log('✅ Daily review deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting daily review:', error);
      throw new Error(`Failed to delete daily review: ${error.message}`);
    }
  }

  /**
   * Get all daily reviews for a user within a date range - FIXED: Simple query only
   * @param userId - User ID
   * @param startDate - Start date (optional)
   * @param endDate - End date (optional)  
   * @param limitCount - Maximum number of reviews to return (applied after filtering)
   * @returns Promise resolving to array of daily reviews
   */
  async getUserDailyReviews(
    userId: string, 
    startDate?: Date, 
    endDate?: Date,
    limitCount: number = 50
  ): Promise<DailyReview[]> {
    try {
      // FIXED: Use simplest possible query to avoid index requirements
      const q = query(
        collection(db, DAILY_REVIEWS_COLLECTION),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const reviews: DailyReview[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreDailyReview;
        const review = this.convertFirestoreToReview(doc.id, data);
        
        // Filter by date range in application code if needed
        if (startDate || endDate) {
          const reviewDate = review.date;
          if (startDate && reviewDate < startDate) return;
          if (endDate && reviewDate > endDate) return;
        }
        
        reviews.push(review);
      });

      // Sort by date descending in memory
      reviews.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      // Apply limit after sorting
      const limitedReviews = reviews.slice(0, limitCount);

      console.log('✅ Loaded', limitedReviews.length, 'daily reviews');
      return limitedReviews;
    } catch (error: any) {
      console.error('❌ Error fetching daily reviews:', error);
      throw new Error(`Failed to fetch daily reviews: ${error.message}`);
    }
  }

  /**
   * Get daily review summaries for calendar view - FIXED: Simple query only
   * @param userId - User ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Promise resolving to array of daily review summaries
   */
  async getDailyReviewSummaries(userId: string, startDate: Date, endDate: Date): Promise<DailyReviewSummary[]> {
    try {
      // FIXED: Use simplest possible query
      const q = query(
        collection(db, DAILY_REVIEWS_COLLECTION),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const summaries: DailyReviewSummary[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreDailyReview;
        const reviewDate = data.date.toDate();
        
        // Filter by date range in application code
        if (reviewDate >= startOfDay(startDate) && reviewDate <= endOfDay(endDate)) {
          summaries.push({
            date: reviewDate,
            overallRating: data.overallRating,
            totalPL: data.metrics.totalPL,
            tradeCount: data.metrics.tradeCount,
            hasReview: true,
            tags: data.tags
          });
        }
      });

      // Sort by date in memory
      summaries.sort((a, b) => b.date.getTime() - a.date.getTime());

      return summaries;
    } catch (error: any) {
      console.error('❌ Error fetching daily review summaries:', error);
      throw new Error(`Failed to fetch daily review summaries: ${error.message}`);
    }
  }

  /**
   * Generate automatic metrics from trades for a specific date
   * @param trades - Array of trades for the day
   * @param date - Target date
   * @returns Calculated metrics object
   */
  generateMetricsFromTrades(trades: Trade[], date: Date) {
    const dailyStats = calculateDailyStats(trades, date);
    
    // Find largest win and loss
    const sortedByPL = trades.sort((a, b) => b.realizedPL - a.realizedPL);
    const largestWin = sortedByPL.length > 0 ? Math.max(...trades.map(t => t.realizedPL)) : 0;
    const largestLoss = sortedByPL.length > 0 ? Math.min(...trades.map(t => t.realizedPL)) : 0;
    
    return {
      totalPL: dailyStats.totalPL,
      winRate: dailyStats.winRate,
      tradeCount: dailyStats.totalTrades,
      largestWin,
      largestLoss,
      avgWin: dailyStats.avgWin,
      avgLoss: Math.abs(dailyStats.avgLoss),
      profitFactor: dailyStats.avgLoss !== 0 ? dailyStats.avgWin / Math.abs(dailyStats.avgLoss) : 0
    };
  }

  /**
   * Create a default daily review template with calculated metrics
   * @param userId - User ID
   * @param date - Target date
   * @param trades - Trades for the day
   * @returns Default daily review object
   */
  createDefaultReview(userId: string, date: Date, trades: Trade[]): Omit<DailyReview, 'id' | 'createdAt' | 'updatedAt'> {
    const metrics = this.generateMetricsFromTrades(trades, date);
    
    return {
      userId,
      date,
      overallRating: 5, // Default neutral rating
      ratings: {
        discipline: 5,
        riskManagement: 5,
        entryTiming: 5,
        exitTiming: 5,
        emotionalControl: 5,
        marketReading: 5,
      },
      metrics,
      notes: {
        whatWorked: '',
        whatDidntWork: '',
        lessonsLearned: '',
        marketConditions: '',
        generalNotes: '',
      },
      reminders: {
        tomorrowGoals: [],
        watchList: [],
        strategies: [],
        reminders: [],
      },
      psychology: {
        preMarketMood: 5,
        postMarketMood: 5,
        stressLevel: 5,
        confidenceLevel: 5,
        energyLevel: 5,
      },
      tags: [],
      isComplete: false,
    };
  }

  /**
   * Calculate overall grade based on ratings and performance
   * @param review - Daily review object
   * @returns Letter grade (A+ to F)
   */
  calculateOverallGrade(review: DailyReview): string {
    // Weight different factors
    const ratingAvg = Object.values(review.ratings).reduce((sum, rating) => sum + rating, 0) / Object.values(review.ratings).length;
    const psychologyAvg = Object.values(review.psychology).reduce((sum, rating) => sum + rating, 0) / Object.values(review.psychology).length;
    
    // Performance factor based on P&L and win rate
    let performanceFactor = 5; // Neutral
    if (review.metrics.totalPL > 0 && review.metrics.winRate > 50) {
      performanceFactor = Math.min(10, 7 + (review.metrics.totalPL / 1000)); // Bonus for profit
    } else if (review.metrics.totalPL < 0) {
      performanceFactor = Math.max(1, 3 - (Math.abs(review.metrics.totalPL) / 1000)); // Penalty for loss
    }
    
    // Weighted average: 40% ratings, 20% psychology, 40% performance
    const finalScore = (ratingAvg * 0.4) + (psychologyAvg * 0.2) + (performanceFactor * 0.4);
    
    // Convert to letter grade
    if (finalScore >= 9.5) return 'A+';
    if (finalScore >= 9.0) return 'A';
    if (finalScore >= 8.5) return 'A-';
    if (finalScore >= 8.0) return 'B+';
    if (finalScore >= 7.5) return 'B';
    if (finalScore >= 7.0) return 'B-';
    if (finalScore >= 6.5) return 'C+';
    if (finalScore >= 6.0) return 'C';
    if (finalScore >= 5.5) return 'C-';
    if (finalScore >= 5.0) return 'D+';
    if (finalScore >= 4.5) return 'D';
    if (finalScore >= 4.0) return 'D-';
    return 'F';
  }

  /**
   * Get performance insights based on recent reviews
   * @param reviews - Array of recent daily reviews
   * @returns Performance insights and trends
   */
  generatePerformanceInsights(reviews: DailyReview[]) {
    if (reviews.length === 0) return null;
    
    const recentReviews = reviews.slice(0, 10); // Last 10 days
    
    // Calculate averages
    const avgRatings = {
      discipline: 0,
      riskManagement: 0,
      entryTiming: 0,
      exitTiming: 0,
      emotionalControl: 0,
      marketReading: 0,
    };
    
    let totalPL = 0;
    let totalTrades = 0;
    let winCount = 0;
    
    recentReviews.forEach(review => {
      Object.keys(avgRatings).forEach(key => {
        avgRatings[key as keyof typeof avgRatings] += review.ratings[key as keyof typeof review.ratings];
      });
      
      totalPL += review.metrics.totalPL;
      totalTrades += review.metrics.tradeCount;
      if (review.metrics.totalPL > 0) winCount++;
    });
    
    // Calculate averages
    Object.keys(avgRatings).forEach(key => {
      avgRatings[key as keyof typeof avgRatings] /= recentReviews.length;
    });
    
    const avgDailyPL = totalPL / recentReviews.length;
    const profitableDaysRate = (winCount / recentReviews.length) * 100;
    
    // Find strengths and weaknesses
    const ratings = Object.entries(avgRatings);
    const strengths = ratings.filter(([_, rating]) => rating >= 7).map(([category, _]) => category);
    const weaknesses = ratings.filter(([_, rating]) => rating < 6).map(([category, _]) => category);
    
    return {
      avgRatings,
      avgDailyPL,
      profitableDaysRate,
      strengths,
      weaknesses,
      dayCount: recentReviews.length,
      totalPL,
      totalTrades
    };
  }

  /**
   * Convert Firestore document to DailyReview object
   * @param id - Document ID
   * @param data - Firestore document data
   * @returns DailyReview object
   */
  private convertFirestoreToReview(id: string, data: FirestoreDailyReview): DailyReview {
    return {
      ...data,
      id,
      date: data.date.toDate(),
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  }

  /**
   * Migration helper: Add dateString field to existing documents
   * This should be run once to migrate existing data
   */
  async migrateDateStringField(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, DAILY_REVIEWS_COLLECTION),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const batch = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data() as FirestoreDailyReview;
        if (!data.dateString && data.date) {
          const dateString = this.getDateString(data.date.toDate());
          batch.push(updateDoc(doc(db, DAILY_REVIEWS_COLLECTION, docSnap.id), { dateString }));
        }
      }

      await Promise.all(batch);
      console.log(`✅ Migrated ${batch.length} documents with dateString field`);
    } catch (error: any) {
      console.error('❌ Error migrating dateString field:', error);
      throw new Error(`Failed to migrate dateString field: ${error.message}`);
    }
  }

  /**
   * Test connection to Firestore (for debugging)
   */
  async testConnection(userId: string): Promise<boolean> {
    try {
      console.log('🧪 Testing Firestore connection...');
      
      const q = query(
        collection(db, DAILY_REVIEWS_COLLECTION),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      console.log('✅ Connection test successful, found', querySnapshot.size, 'documents');
      return true;
    } catch (error: any) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const dailyReviewService = new DailyReviewService();