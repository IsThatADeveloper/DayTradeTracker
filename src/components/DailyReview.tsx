// src/components/DailyReview.tsx - Enhanced Mobile Version
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Star,
  Brain,
  Target,
  Calendar,
  Clock,
  AlertCircle,
  Plus,
  X,
  Save,
  RefreshCw,
  BarChart3,
  MessageSquare,
  ListTodo,
  PieChart,
  Award,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Lightbulb,
  Flag,
  Tag,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import { format, isToday, subDays } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { Trade } from '../types/trade';
import { 
  DailyReview as DailyReviewType, 
  RATING_CATEGORIES, 
  PSYCHOLOGY_CATEGORIES, 
  COMMON_TAGS,
  ReviewCategory 
} from '../types/dailyReview';
import { dailyReviewService } from '../services/dailyReviewService';
import { formatCurrency } from '../utils/tradeUtils';

interface DailyReviewProps {
  trades: Trade[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

type TabType = 'overview' | 'ratings' | 'psychology' | 'notes' | 'reminders' | 'insights';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3, shortLabel: 'Overview' },
  { id: 'ratings', label: 'Performance', icon: Star, shortLabel: 'Ratings' },
  { id: 'psychology', label: 'Psychology', icon: Brain, shortLabel: 'Mindset' },
  { id: 'notes', label: 'Notes', icon: MessageSquare, shortLabel: 'Notes' },
  { id: 'reminders', label: 'Reminders', icon: ListTodo, shortLabel: 'Tasks' },
  { id: 'insights', label: 'Insights', icon: Lightbulb, shortLabel: 'Insights' },
] as const;

export const DailyReview: React.FC<DailyReviewProps> = ({ trades, selectedDate, onDateSelect }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dailyReview, setDailyReview] = useState<DailyReviewType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Reminder input states
  const [goalInput, setGoalInput] = useState('');
  const [watchInput, setWatchInput] = useState('');
  const [strategyInput, setStrategyInput] = useState('');
  const [reminderInput, setReminderInput] = useState('');

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

  // Load daily review for selected date
  const loadDailyReview = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      let review = await dailyReviewService.getDailyReview(currentUser.uid, selectedDate);
      
      if (!review) {
        const defaultReview = dailyReviewService.createDefaultReview(currentUser.uid, selectedDate, dayTrades);
        review = {
          ...defaultReview,
          id: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else {
        review.metrics = dailyReviewService.generateMetricsFromTrades(dayTrades, selectedDate);
        
        if (!review.reminders) {
          review.reminders = {
            tomorrowGoals: [],
            watchList: [],
            strategies: [],
            reminders: [],
          };
        } else {
          review.reminders = {
            tomorrowGoals: review.reminders.tomorrowGoals || [],
            watchList: review.reminders.watchList || [],
            strategies: review.reminders.strategies || [],
            reminders: review.reminders.reminders || [],
          };
        }
      }
      
      setDailyReview(review);
    } catch (error: any) {
      console.error('Failed to load daily review:', error);
      alert(`Failed to load daily review: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, selectedDate, dayTrades]);

  // Save daily review
  const saveDailyReview = useCallback(async () => {
    if (!currentUser || !dailyReview) return;

    setIsSaving(true);
    try {
      const updatedReview = {
        ...dailyReview,
        metrics: dailyReviewService.generateMetricsFromTrades(dayTrades, selectedDate),
        isComplete: true,
      };

      const reviewId = await dailyReviewService.saveDailyReview(currentUser.uid, updatedReview);
      
      setDailyReview({
        ...updatedReview,
        id: reviewId,
        updatedAt: new Date(),
      });
      
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Failed to save daily review:', error);
      alert(`Failed to save daily review: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, dailyReview, dayTrades, selectedDate]);

  const updateReview = useCallback((field: keyof DailyReviewType, value: any) => {
    if (!dailyReview) return;
    
    setDailyReview(prev => prev ? { ...prev, [field]: value } : prev);
    setHasUnsavedChanges(true);
  }, [dailyReview]);

  const updateNestedField = useCallback((parentField: string, field: string, value: any) => {
    if (!dailyReview) return;
    
    setDailyReview(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [parentField]: {
          ...(prev[parentField as keyof DailyReviewType] as any),
          [field]: value,
        },
      };
    });
    setHasUnsavedChanges(true);
  }, [dailyReview]);

  const addReminderItem = useCallback((field: string, value: string, clearInput: () => void) => {
    if (!value.trim() || !dailyReview) return;
    
    const currentItems = (dailyReview.reminders as any)[field] || [];
    updateNestedField('reminders', field, [...currentItems, value.trim()]);
    clearInput();
  }, [dailyReview, updateNestedField]);

  const removeReminderItem = useCallback((field: string, index: number) => {
    if (!dailyReview) return;
    
    const currentItems = (dailyReview.reminders as any)[field] || [];
    updateNestedField('reminders', field, currentItems.filter((_: any, i: number) => i !== index));
  }, [dailyReview, updateNestedField]);

  // Load review when date changes
  useEffect(() => {
    loadDailyReview();
  }, [loadDailyReview]);

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

  if (!currentUser) {
    return (
      <div className="text-center py-12 px-4">
        <BookOpen className="h-16 w-16 sm:h-20 sm:w-20 text-gray-400 mx-auto mb-6" />
        <h3 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white mb-3">Sign In Required</h3>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Sign in to access your daily trading reviews and report cards.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 px-4">
        <RefreshCw className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 mx-auto mb-6 animate-spin" />
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">Loading daily review...</p>
      </div>
    );
  }

  if (!dailyReview) {
    return (
      <div className="text-center py-12 px-4">
        <AlertCircle className="h-16 w-16 sm:h-20 sm:w-20 text-red-400 mx-auto mb-6" />
        <h3 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white mb-3">Failed to Load Review</h3>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          Unable to load the daily review for {format(selectedDate, 'MMMM d, yyyy')}.
        </p>
        <button
          onClick={loadDailyReview}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base sm:text-lg font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  const calculateGrade = () => {
    const ratingValues = Object.values(dailyReview.ratings);
    const ratingAvg = ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length;
    
    const psychologyValues = Object.values(dailyReview.psychology);
    const psychologyAvg = psychologyValues.reduce((sum, rating) => sum + rating, 0) / psychologyValues.length;
    
    let performanceFactor = 7;
    
    if (dailyReview.metrics.tradeCount === 0) {
      performanceFactor = 7;
    } else {
      if (dailyReview.metrics.totalPL > 0) {
        performanceFactor += Math.min(2.5, dailyReview.metrics.totalPL / 200);
      }
      
      if (dailyReview.metrics.winRate >= 50) {
        performanceFactor += (dailyReview.metrics.winRate - 50) / 20;
      }
      
      if (dailyReview.metrics.totalPL < 0) {
        performanceFactor -= Math.min(2, Math.abs(dailyReview.metrics.totalPL) / 500);
      }
      
      if (dailyReview.metrics.tradeCount > 0 && Math.abs(dailyReview.metrics.largestLoss) < 500) {
        performanceFactor += 0.5;
      }
    }
    
    performanceFactor = Math.max(1, Math.min(10, performanceFactor));
    
    const finalScore = (ratingAvg * 0.5) + (psychologyAvg * 0.3) + (performanceFactor * 0.2);
    
    if (finalScore >= 9.2) return 'A+';
    if (finalScore >= 8.7) return 'A';
    if (finalScore >= 8.2) return 'A-';
    if (finalScore >= 7.7) return 'B+';
    if (finalScore >= 7.2) return 'B';
    if (finalScore >= 6.7) return 'B-';
    if (finalScore >= 6.2) return 'C+';
    if (finalScore >= 5.7) return 'C';
    if (finalScore >= 5.2) return 'C-';
    if (finalScore >= 4.7) return 'D+';
    if (finalScore >= 4.2) return 'D';
    if (finalScore >= 3.7) return 'D-';
    return 'F';
  };

  // Enhanced mobile-friendly star rating
  const renderStarRating = (value: number, onChange: (value: number) => void, size: 'sm' | 'lg' = 'sm') => {
    const starSize = size === 'lg' ? 'h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8' : 'h-4 w-4 sm:h-5 sm:w-5';
    const spacing = size === 'lg' ? 'gap-1 sm:gap-1.5 md:gap-2' : 'gap-0.5 sm:gap-1';
    
    return (
      <div className={`flex ${spacing} flex-wrap justify-start`}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`${starSize} transition-all duration-200 p-2 -m-2 touch-manipulation rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${
              star <= value
                ? star <= 3 ? 'text-red-500 hover:text-red-600' : star <= 6 ? 'text-yellow-500 hover:text-yellow-600' : 'text-green-500 hover:text-green-600'
                : 'text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500'
            }`}
          >
            <Star className="fill-current drop-shadow-sm" />
          </button>
        ))}
      </div>
    );
  };

  const renderOverviewTab = () => {
    const grade = calculateGrade();
    const gradeColor = grade.startsWith('A') ? 'text-green-600' : 
                     grade.startsWith('B') ? 'text-blue-600' : 
                     grade.startsWith('C') ? 'text-yellow-600' : 'text-red-600';

    return (
      <div className="space-y-6">
        {/* Grade Card - Enhanced for mobile */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <div className="text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Daily Report Card
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <div className="text-center">
              <div className={`text-4xl sm:text-5xl md:text-6xl font-bold ${gradeColor} mb-2`}>
                {grade}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Overall Grade
              </div>
            </div>
          </div>
          
          {/* Enhanced metrics grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className={`text-xl sm:text-2xl font-bold ${dailyReview.metrics.totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(dailyReview.metrics.totalPL)}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Total P&L</div>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {dailyReview.metrics.tradeCount}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Trades</div>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className={`text-xl sm:text-2xl font-bold ${dailyReview.metrics.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {dailyReview.metrics.winRate.toFixed(1)}%
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Win Rate</div>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {dailyReview.overallRating}/10
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">Self Rating</div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Enhanced layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center text-base sm:text-lg">
              <Target className="h-5 w-5 mr-2 text-blue-600" />
              Overall Self-Rating
            </h4>
            <div className="flex justify-start">
              {renderStarRating(
                dailyReview.overallRating,
                (value) => updateReview('overallRating', value),
                'lg'
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center text-base sm:text-lg">
              <Tag className="h-5 w-5 mr-2 text-purple-600" />
              Market Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {COMMON_TAGS.slice(0, 6).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const tags = dailyReview.tags.includes(tag)
                      ? dailyReview.tags.filter(t => t !== tag)
                      : [...dailyReview.tags, tag];
                    updateReview('tags', tags);
                  }}
                  className={`px-3 py-2 text-sm rounded-full transition-all duration-200 touch-manipulation ${
                    dailyReview.tags.includes(tag)
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date Navigation - Enhanced mobile design */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center text-base sm:text-lg">
            <Calendar className="h-5 w-5 mr-2 text-green-600" />
            Navigate Reviews
          </h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onDateSelect(subDays(selectedDate, 1))}
              className="flex items-center justify-center px-4 py-3 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous Day
            </button>
            <button
              onClick={() => onDateSelect(new Date())}
              disabled={isToday(selectedDate)}
              className="px-4 py-3 text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              Today
            </button>
            <button
              onClick={() => onDateSelect(subDays(selectedDate, -1))}
              disabled={isToday(selectedDate)}
              className="flex items-center justify-center px-4 py-3 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              Next Day
              <ChevronRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderRatingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <Star className="h-6 w-6 mr-3 text-yellow-500" />
          Trading Performance Categories
        </h3>
        
        <div className="space-y-6">
          {RATING_CATEGORIES.map((category) => (
            <div key={category.category} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
                <div className="flex items-center">
                  <span className="text-2xl sm:text-3xl mr-4">{category.icon}</span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">
                      {category.label}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {category.description}
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white text-center sm:text-right">
                  {dailyReview.ratings[category.category as ReviewCategory]}/10
                </div>
              </div>
              <div className="flex justify-center sm:justify-start">
                {renderStarRating(
                  dailyReview.ratings[category.category as ReviewCategory],
                  (value) => updateNestedField('ratings', category.category, value),
                  'lg'
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPsychologyTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <Brain className="h-6 w-6 mr-3 text-purple-500" />
          Trading Psychology & Mindset
        </h3>
        
        <div className="space-y-6">
          {PSYCHOLOGY_CATEGORIES.map((category) => (
            <div key={category.category} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
                <div className="flex items-center">
                  <span className="text-2xl sm:text-3xl mr-4">{category.icon}</span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">
                      {category.label}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {category.description}
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white text-center sm:text-right">
                  {(dailyReview.psychology as any)[category.category]}/10
                </div>
              </div>
              <div className="flex justify-center sm:justify-start">
                {renderStarRating(
                  (dailyReview.psychology as any)[category.category],
                  (value) => updateNestedField('psychology', category.category, value),
                  'lg'
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotesTab = () => (
    <div className="space-y-6">
      {Object.entries({
        whatWorked: { label: 'What Worked Well', icon: ThumbsUp, color: 'text-green-600' },
        whatDidntWork: { label: 'What Needs Improvement', icon: ThumbsDown, color: 'text-red-600' },
        lessonsLearned: { label: 'Key Lessons Learned', icon: Lightbulb, color: 'text-yellow-600' },
        marketConditions: { label: 'Market Conditions', icon: BarChart3, color: 'text-blue-600' },
        generalNotes: { label: 'General Notes & Thoughts', icon: MessageSquare, color: 'text-purple-600' },
      }).map(([key, config]) => (
        <div key={key} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <config.icon className={`h-5 w-5 mr-3 ${config.color}`} />
            {config.label}
          </h3>
          <textarea
            value={(dailyReview.notes as any)[key]}
            onChange={(e) => updateNestedField('notes', key, e.target.value)}
            placeholder={`Write about ${config.label.toLowerCase()}...`}
            rows={5}
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base leading-relaxed"
          />
        </div>
      ))}
    </div>
  );

  const renderRemindersTab = () => {
    const renderSection = (
      title: string,
      field: string,
      icon: React.ElementType,
      placeholder: string,
      inputValue: string,
      setInputValue: (value: string) => void
    ) => {
      const Icon = icon;
      const items = (dailyReview.reminders as any)[field] || [];

      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Icon className="h-5 w-5 mr-3 text-blue-600" />
            {title}
          </h3>
          
          {/* Enhanced mobile input */}
          <div className="flex flex-col sm:flex-row mb-6 gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addReminderItem(field, inputValue, () => setInputValue(''));
                }
              }}
              placeholder={placeholder}
              className="flex-1 p-4 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-l-lg sm:rounded-r-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
            <button
              type="button"
              onClick={() => addReminderItem(field, inputValue, () => setInputValue(''))}
              className="px-6 py-4 bg-blue-600 text-white rounded-lg sm:rounded-l-none sm:rounded-r-lg hover:bg-blue-700 transition-colors touch-manipulation font-medium"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item: string, index: number) => (
              <div key={`${field}-${index}`} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-900 dark:text-white text-base min-w-0 flex-1 mr-3">{item}</span>
                <button
                  type="button"
                  onClick={() => removeReminderItem(field, index)}
                  className="text-red-600 hover:text-red-700 transition-colors p-2 -m-2 touch-manipulation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-base italic text-center py-8">
                No {title.toLowerCase()} added yet
              </p>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {renderSection('Tomorrow\'s Goals', 'tomorrowGoals', Target, 'Add a goal for tomorrow...', goalInput, setGoalInput)}
        {renderSection('Watch List', 'watchList', Eye, 'Add a ticker to watch...', watchInput, setWatchInput)}
        {renderSection('Strategies to Focus On', 'strategies', Flag, 'Add a trading strategy...', strategyInput, setStrategyInput)}
        {renderSection('General Reminders', 'reminders', AlertCircle, 'Add a reminder...', reminderInput, setReminderInput)}
      </div>
    );
  };

  const renderInsightsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <Award className="h-6 w-6 mr-3 text-yellow-500" />
          Performance Summary
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 text-base sm:text-lg">Strengths Today</h4>
            <div className="space-y-3">
              {RATING_CATEGORIES.filter(cat => dailyReview.ratings[cat.category as ReviewCategory] >= 7).map(cat => (
                <div key={cat.category} className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="mr-3 text-lg">{cat.icon}</span>
                  <span className="text-green-700 dark:text-green-300 text-sm sm:text-base flex-1 min-w-0">{cat.label}</span>
                  <span className="ml-auto text-green-600 font-semibold">{dailyReview.ratings[cat.category as ReviewCategory]}/10</span>
                </div>
              ))}
              {RATING_CATEGORIES.filter(cat => dailyReview.ratings[cat.category as ReviewCategory] >= 7).length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4 italic">No standout strengths today</p>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 text-base sm:text-lg">Areas for Improvement</h4>
            <div className="space-y-3">
              {RATING_CATEGORIES.filter(cat => dailyReview.ratings[cat.category as ReviewCategory] < 6).map(cat => (
                <div key={cat.category} className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="mr-3 text-lg">{cat.icon}</span>
                  <span className="text-red-700 dark:text-red-300 text-sm sm:text-base flex-1 min-w-0">{cat.label}</span>
                  <span className="ml-auto text-red-600 font-semibold">{dailyReview.ratings[cat.category as ReviewCategory]}/10</span>
                </div>
              ))}
              {RATING_CATEGORIES.filter(cat => dailyReview.ratings[cat.category as ReviewCategory] < 6).length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4 italic">All areas performing well!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start">
            <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 mr-3 text-blue-600" />
            Daily Trading Review
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mt-2">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')} • {dayTrades.length} trades
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={saveDailyReview}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center font-medium touch-manipulation"
          >
            {isSaving ? (
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Save Review'}
          </button>
        </div>
      </div>

      {/* Enhanced Mobile-Friendly Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          {/* Mobile: Better scrollable tabs */}
          <nav className="flex overflow-x-auto px-4 sm:px-6 scrollbar-hide">
            <div className="flex space-x-6 sm:space-x-8 min-w-max">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-2 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap touch-manipulation ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Enhanced Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'ratings' && renderRatingsTab()}
          {activeTab === 'psychology' && renderPsychologyTab()}
          {activeTab === 'notes' && renderNotesTab()}
          {activeTab === 'reminders' && renderRemindersTab()}
          {activeTab === 'insights' && renderInsightsTab()}
        </div>
      </div>
    </div>
  );
};