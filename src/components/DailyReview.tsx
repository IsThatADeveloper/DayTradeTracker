// src/components/DailyReview.tsx - Fixed Version
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Star,
  TrendingUp,
  TrendingDown,
  Brain,
  Target,
  Calendar,
  Clock,
  CheckCircle,
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
  Tag
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
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'ratings', label: 'Performance', icon: Star },
  { id: 'psychology', label: 'Psychology', icon: Brain },
  { id: 'notes', label: 'Notes', icon: MessageSquare },
  { id: 'reminders', label: 'Reminders', icon: ListTodo },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
] as const;

export const DailyReview: React.FC<DailyReviewProps> = ({ trades, selectedDate, onDateSelect }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dailyReview, setDailyReview] = useState<DailyReviewType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  // Load daily review for selected date
  const loadDailyReview = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      let review = await dailyReviewService.getDailyReview(currentUser.uid, selectedDate);
      
      if (!review) {
        // Create default review with calculated metrics
        const defaultReview = dailyReviewService.createDefaultReview(currentUser.uid, selectedDate, dayTrades);
        review = {
          ...defaultReview,
          id: '', // Will be set when saved
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else {
        // Update metrics with current trades
        review.metrics = dailyReviewService.generateMetricsFromTrades(dayTrades, selectedDate);
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
      console.log('✅ Daily review saved successfully');
    } catch (error: any) {
      console.error('Failed to save daily review:', error);
      alert(`Failed to save daily review: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, dailyReview, dayTrades, selectedDate]);

  // Update review field
  const updateReview = useCallback(<T extends keyof DailyReviewType>(
    field: T,
    value: DailyReviewType[T]
  ) => {
    if (!dailyReview) return;
    
    setDailyReview({
      ...dailyReview,
      [field]: value,
    });
    setHasUnsavedChanges(true);
  }, [dailyReview]);

  // Update nested field
  const updateNestedField = useCallback(<T extends keyof DailyReviewType, K extends keyof DailyReviewType[T]>(
    parentField: T,
    field: K,
    value: DailyReviewType[T][K]
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
      <div className="text-center py-12">
        <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Sign In Required</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Sign in to access your daily trading reviews and report cards.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
        <p className="text-gray-600 dark:text-gray-400">Loading daily review...</p>
      </div>
    );
  }

  if (!dailyReview) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to Load Review</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Unable to load the daily review for {format(selectedDate, 'MMMM d, yyyy')}.
        </p>
        <button
          onClick={loadDailyReview}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const renderStarRating = (value: number, onChange: (value: number) => void, size: 'sm' | 'lg' = 'sm') => {
    const starSize = size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';
    
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`${starSize} transition-colors ${
              star <= value
                ? star <= 3 ? 'text-red-500' : star <= 6 ? 'text-yellow-500' : 'text-green-500'
                : 'text-gray-300 dark:text-gray-600 hover:text-gray-400'
            }`}
          >
            <Star className="fill-current" />
          </button>
        ))}
      </div>
    );
  };

  const renderOverviewTab = () => {
    const grade = dailyReviewService.calculateOverallGrade(dailyReview);
    const gradeColor = grade.startsWith('A') ? 'text-green-600' : 
                     grade.startsWith('B') ? 'text-blue-600' : 
                     grade.startsWith('C') ? 'text-yellow-600' : 'text-red-600';

    return (
      <div className="space-y-6">
        {/* Grade Card */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Daily Report Card
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            <div className="text-center">
              <div className={`text-4xl font-bold ${gradeColor} mb-1`}>
                {grade}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Overall Grade
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className={`text-xl font-bold ${dailyReview.metrics.totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(dailyReview.metrics.totalPL)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Total P&L</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-xl font-bold text-blue-600">
                {dailyReview.metrics.tradeCount}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Trades</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className={`text-xl font-bold ${dailyReview.metrics.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {dailyReview.metrics.winRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Win Rate</div>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-xl font-bold text-purple-600">
                {dailyReview.overallRating}/10
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Self Rating</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <Target className="h-4 w-4 mr-2 text-blue-600" />
              Overall Self-Rating
            </h4>
            {renderStarRating(
              dailyReview.overallRating,
              (value) => updateReview('overallRating', value),
              'lg'
            )}
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Rate your overall trading performance today
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <Tag className="h-4 w-4 mr-2 text-purple-600" />
              Market Tags
            </h4>
            <div className="flex flex-wrap gap-1">
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
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    dailyReview.tags.includes(tag)
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-green-600" />
            Navigate Reviews
          </h4>
          <div className="flex space-x-2">
            <button
              onClick={() => onDateSelect(subDays(selectedDate, 1))}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              ← Previous Day
            </button>
            <button
              onClick={() => onDateSelect(new Date())}
              disabled={isToday(selectedDate)}
              className="px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Today
            </button>
            <button
              onClick={() => onDateSelect(subDays(selectedDate, -1))}
              disabled={isToday(selectedDate)}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Day →
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderRatingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Star className="h-5 w-5 mr-2 text-yellow-500" />
          Trading Performance Categories
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Rate your performance in each area from 1 (very poor) to 10 (excellent)
        </p>
        
        <div className="space-y-6">
          {RATING_CATEGORIES.map((category) => (
            <div key={category.category} className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{category.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {category.label}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {category.description}
                    </p>
                  </div>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {dailyReview.ratings[category.category as ReviewCategory]}/10
                </div>
              </div>
              {renderStarRating(
                dailyReview.ratings[category.category as ReviewCategory],
                (value) => updateNestedField('ratings', category.category as ReviewCategory, value),
                'lg'
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPsychologyTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Brain className="h-5 w-5 mr-2 text-purple-500" />
          Trading Psychology & Mindset
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Track your mental and emotional state throughout the trading day
        </p>
        
        <div className="space-y-6">
          {PSYCHOLOGY_CATEGORIES.map((category) => (
            <div key={category.category} className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{category.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {category.label}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {category.description}
                    </p>
                  </div>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {dailyReview.psychology[category.category as keyof DailyReviewType['psychology']]}/10
                </div>
              </div>
              {renderStarRating(
                dailyReview.psychology[category.category as keyof DailyReviewType['psychology']],
                (value) => updateNestedField('psychology', category.category as keyof DailyReviewType['psychology'], value),
                'lg'
              )}
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
        <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <config.icon className={`h-5 w-5 mr-2 ${config.color}`} />
            {config.label}
          </h3>
          <textarea
            value={dailyReview.notes[key as keyof typeof dailyReview.notes]}
            onChange={(e) => updateNestedField('notes', key as keyof typeof dailyReview.notes, e.target.value)}
            placeholder={`Write about ${config.label.toLowerCase()}...`}
            rows={4}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      ))}
    </div>
  );

  const renderRemindersTab = () => {
    const addArrayItem = (field: keyof typeof dailyReview.reminders, value: string) => {
      if (!value.trim()) return;
      const current = dailyReview.reminders[field];
      updateNestedField('reminders', field, [...current, value.trim()]);
    };

    const removeArrayItem = (field: keyof typeof dailyReview.reminders, index: number) => {
      const current = dailyReview.reminders[field];
      updateNestedField('reminders', field, current.filter((_, i) => i !== index));
    };

    const renderArrayField = (field: keyof typeof dailyReview.reminders, label: string, icon: React.ElementType, placeholder: string) => {
      const [inputValue, setInputValue] = useState('');
      const Icon = icon;

      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Icon className="h-5 w-5 mr-2 text-blue-600" />
            {label}
          </h3>
          
          <div className="flex mb-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addArrayItem(field, inputValue);
                  setInputValue('');
                }
              }}
              placeholder={placeholder}
              className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => {
                addArrayItem(field, inputValue);
                setInputValue('');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {dailyReview.reminders[field].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-900 dark:text-white">{item}</span>
                <button
                  type="button"
                  onClick={() => removeArrayItem(field, index)}
                  className="text-red-600 hover:text-red-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {dailyReview.reminders[field].length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                No {label.toLowerCase()} added yet
              </p>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {renderArrayField('tomorrowGoals', 'Tomorrow\'s Goals', Target, 'Add a goal for tomorrow...')}
        {renderArrayField('watchList', 'Watch List', Eye, 'Add a ticker to watch...')}
        {renderArrayField('strategies', 'Strategies to Focus On', Flag, 'Add a trading strategy...')}
        {renderArrayField('reminders', 'General Reminders', AlertCircle, 'Add a reminder...')}
      </div>
    );
  };

  const renderInsightsTab = () => {
    const grade = dailyReviewService.calculateOverallGrade(dailyReview);
    
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Award className="h-5 w-5 mr-2 text-yellow-500" />
            Performance Summary
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Strengths Today</h4>
              <div className="space-y-2">
                {RATING_CATEGORIES.filter(cat => dailyReview.ratings[cat.category as ReviewCategory] >= 7).map(cat => (
                  <div key={cat.category} className="flex items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="mr-2">{cat.icon}</span>
                    <span className="text-green-700 dark:text-green-300 text-sm">{cat.label}</span>
                    <span className="ml-auto text-green-600 font-medium">{dailyReview.ratings[cat.category as ReviewCategory]}/10</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Areas for Improvement</h4>
              <div className="space-y-2">
                {RATING_CATEGORIES.filter(cat => dailyReview.ratings[cat.category as ReviewCategory] < 6).map(cat => (
                  <div key={cat.category} className="flex items-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="mr-2">{cat.icon}</span>
                    <span className="text-red-700 dark:text-red-300 text-sm">{cat.label}</span>
                    <span className="ml-auto text-red-600 font-medium">{dailyReview.ratings[cat.category as ReviewCategory]}/10</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-blue-500" />
            Today's Metrics
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {dailyReview.metrics.tradeCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Trades Executed</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className={`text-2xl font-bold mb-1 ${dailyReview.metrics.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {dailyReview.metrics.winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Win Rate</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {formatCurrency(dailyReview.metrics.largestWin)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Largest Win</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {formatCurrency(dailyReview.metrics.largestLoss)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Largest Loss</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <BookOpen className="h-6 w-6 mr-2 text-blue-600" />
            Daily Trading Review
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')} • {dayTrades.length} trades
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {hasUnsavedChanges && (
            <span className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={saveDailyReview}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Save Review'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
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