// src/hooks/useDailyReview.ts - Fixed Version
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DailyReview, DailyReviewSummary } from '../types/dailyReview';
import { Trade } from '../types/trade';
import { dailyReviewService } from '../services/dailyReviewService';
import { startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';

interface UseDailyReviewOptions {
  autoLoad?: boolean;
  loadSummaries?: boolean;
  summaryRange?: number; // weeks to load summaries for
}

interface UseDailyReviewReturn {
  // State
  dailyReview: DailyReview | null;
  summaries: DailyReviewSummary[];
  dayTrades: Trade[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;

  // Actions
  loadDailyReview: (date?: Date) => Promise<void>;
  saveDailyReview: () => Promise<string | undefined>;
  deleteDailyReview: () => Promise<void>;
  updateReview: <T extends keyof DailyReview>(field: T, value: DailyReview[T]) => void;
  updateNestedField: <T extends keyof DailyReview, K extends keyof DailyReview[T]>(
    parentField: T,
    field: K,
    value: DailyReview[T][K]
  ) => void;

  // Summaries
  loadSummaries: (weeksRange?: number) => Promise<void>;
  hasReviewForDate: (date: Date) => boolean;
  getSummaryForDate: (date: Date) => DailyReviewSummary | undefined;

  // Insights
  getRecentReviews: (count?: number) => Promise<DailyReview[]>;
  generateInsights: () => Promise<any>;
  calculateGrade: () => string;

  // Utilities
  enableAutoSave: (intervalMs?: number) => () => void;
  clearError: () => void;
  clearUnsavedChanges: () => void;
}

export const useDailyReview = (
  selectedDate: Date,
  trades: Trade[],
  options: UseDailyReviewOptions = {}
): UseDailyReviewReturn => {
  const { currentUser } = useAuth();
  const { autoLoad = true, loadSummaries = false, summaryRange = 4 } = options;

  // State
  const [dailyReview, setDailyReview] = useState<DailyReview | null>(null);
  const [summaries, setSummaries] = useState<DailyReviewSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filter trades for selected date
  const dayTrades = useMemo(() => {
    return trades.filter(trade => {
      const tradeDate = new Date(trade.timestamp);
      return (
        tradeDate.getFullYear() === selectedDate.getFullYear() &&
        tradeDate.getMonth() === selectedDate.getMonth() &&
        tradeDate.getDate() === selectedDate.getDate()
      );
    });
  }, [trades, selectedDate]);

  /**
   * Load daily review for the selected date
   */
  const loadDailyReview = useCallback(async (date: Date = selectedDate) => {
    if (!currentUser) return;

    setIsLoading(true);
    setError(null);

    try {
      let review = await dailyReviewService.getDailyReview(currentUser.uid, date);
      
      if (!review) {
        // Create default review with calculated metrics
        const defaultReview = dailyReviewService.createDefaultReview(
          currentUser.uid, 
          date, 
          dayTrades
        );
        review = {
          ...defaultReview,
          id: '', // Will be set when saved
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else {
        // Update metrics with current trades
        review.metrics = dailyReviewService.generateMetricsFromTrades(dayTrades, date);
      }
      
      setDailyReview(review);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load daily review:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, selectedDate, dayTrades]);

  /**
   * Save the current daily review
   */
  const saveDailyReview = useCallback(async (): Promise<string | undefined> => {
    if (!currentUser || !dailyReview) return;

    setIsSaving(true);
    setError(null);

    try {
      // Update metrics before saving
      const updatedReview = {
        ...dailyReview,
        metrics: dailyReviewService.generateMetricsFromTrades(dayTrades, selectedDate),
        isComplete: true,
      };

      const reviewId = await dailyReviewService.saveDailyReview(currentUser.uid, updatedReview);
      
      // Update local state with saved review
      setDailyReview({
        ...updatedReview,
        id: reviewId,
        updatedAt: new Date(),
      });
      
      setHasUnsavedChanges(false);
      return reviewId;
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to save daily review:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, dailyReview, dayTrades, selectedDate]);

  /**
   * Update a field in the daily review
   */
  const updateReview = useCallback(<T extends keyof DailyReview>(
    field: T,
    value: DailyReview[T]
  ) => {
    if (!dailyReview) return;
    
    setDailyReview({
      ...dailyReview,
      [field]: value,
    });
    setHasUnsavedChanges(true);
  }, [dailyReview]);

  /**
   * Update a nested field in the daily review
   */
  const updateNestedField = useCallback(<
    T extends keyof DailyReview, 
    K extends keyof DailyReview[T]
  >(
    parentField: T,
    field: K,
    value: DailyReview[T][K]
  ) => {
    if (!dailyReview) return;
    
    setDailyReview({
      ...dailyReview,
      [parentField]: {
        ...(dailyReview[parentField] as Record<string, any>),
        [field]: value,
      },
    });
    setHasUnsavedChanges(true);
  }, [dailyReview]);

  /**
   * Delete the current daily review
   */
  const deleteDailyReview = useCallback(async () => {
    if (!currentUser || !dailyReview?.id) return;

    try {
      await dailyReviewService.deleteDailyReview(dailyReview.id);
      setDailyReview(null);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to delete daily review:', err);
      throw err;
    }
  }, [currentUser, dailyReview]);

  /**
   * Load review summaries for a date range
   */
  const loadSummariesCallback = useCallback(async (weeksRange: number = summaryRange) => {
    if (!currentUser || !loadSummaries) return;

    try {
      const startDate = startOfWeek(subWeeks(selectedDate, weeksRange));
      const endDate = endOfWeek(addWeeks(selectedDate, weeksRange));
      
      const reviewSummaries = await dailyReviewService.getDailyReviewSummaries(
        currentUser.uid,
        startDate,
        endDate
      );
      
      setSummaries(reviewSummaries);
    } catch (err: any) {
      console.error('Failed to load review summaries:', err);
    }
  }, [currentUser, loadSummaries, summaryRange, selectedDate]);

  /**
   * Get recent reviews for insights
   */
  const getRecentReviews = useCallback(async (count: number = 10): Promise<DailyReview[]> => {
    if (!currentUser) return [];

    try {
      return await dailyReviewService.getUserDailyReviews(
        currentUser.uid,
        undefined,
        undefined,
        count
      );
    } catch (err: any) {
      console.error('Failed to load recent reviews:', err);
      return [];
    }
  }, [currentUser]);

  /**
   * Generate performance insights
   */
  const generateInsights = useCallback(async () => {
    const recentReviews = await getRecentReviews(10);
    return dailyReviewService.generatePerformanceInsights(recentReviews);
  }, [getRecentReviews]);

  /**
   * Calculate grade for current review
   */
  const calculateGrade = useCallback((): string => {
    if (!dailyReview) return 'N/A';
    return dailyReviewService.calculateOverallGrade(dailyReview);
  }, [dailyReview]);

  /**
   * Check if review exists for a specific date
   */
  const hasReviewForDate = useCallback((date: Date): boolean => {
    return summaries.some(summary => 
      summary.date.toDateString() === date.toDateString()
    );
  }, [summaries]);

  /**
   * Get summary for a specific date
   */
  const getSummaryForDate = useCallback((date: Date): DailyReviewSummary | undefined => {
    return summaries.find(summary => 
      summary.date.toDateString() === date.toDateString()
    );
  }, [summaries]);

  /**
   * Auto-save functionality
   */
  const enableAutoSave = useCallback((intervalMs: number = 30000) => {
    const interval = setInterval(() => {
      if (hasUnsavedChanges && dailyReview) {
        saveDailyReview();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [hasUnsavedChanges, dailyReview, saveDailyReview]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear unsaved changes flag
   */
  const clearUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  // Auto-load review when date changes
  useEffect(() => {
    if (autoLoad) {
      loadDailyReview();
    }
  }, [autoLoad, loadDailyReview]);

  // Load summaries when component mounts or range changes
  useEffect(() => {
    if (loadSummaries) {
      loadSummariesCallback();
    }
  }, [loadSummariesCallback]);

  // Prevent leaving without saving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    // State
    dailyReview,
    summaries,
    dayTrades,
    isLoading,
    isSaving,
    error,
    hasUnsavedChanges,

    // Actions
    loadDailyReview,
    saveDailyReview,
    deleteDailyReview,
    updateReview,
    updateNestedField,

    // Summaries
    loadSummaries: loadSummariesCallback,
    hasReviewForDate,
    getSummaryForDate,

    // Insights
    getRecentReviews,
    generateInsights,
    calculateGrade,

    // Utilities
    enableAutoSave,
    clearError,
    clearUnsavedChanges,
  };
};