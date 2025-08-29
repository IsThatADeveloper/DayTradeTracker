// src/components/EarningsProjection.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  Calculator,
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Award,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Save,
  X,
  BarChart3,
  Clock,
  Percent,
  ArrowUp,
  ArrowDown,
  Plus
} from 'lucide-react';
import {
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfDay,
  endOfWeek,
  endOfMonth,
  endOfYear,
  isWithinInterval,
  differenceInDays,
  differenceInCalendarDays,
  addDays,
  addMonths,
  getDaysInMonth,
  getWeeksInMonth
} from 'date-fns';
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';

interface EarningsProjectionProps {
  trades: Trade[];
  selectedDate: Date;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface EarningsTarget {
  period: Period;
  amount: number;
  isActive: boolean;
}

interface PeriodStats {
  period: Period;
  label: string;
  target: number;
  actual: number;
  progress: number;
  remaining: number;
  daysLeft: number;
  dailyRequired: number;
  onTrack: boolean;
  timeElapsed: number;
  projectedEnd: number;
}

const PERIOD_CONFIG = {
  daily: { label: 'Daily', icon: Clock, color: 'blue' },
  weekly: { label: 'Weekly', icon: Calendar, color: 'green' },
  monthly: { label: 'Monthly', icon: BarChart3, color: 'purple' },
  yearly: { label: 'Yearly', icon: Award, color: 'orange' }
};

const DEFAULT_TARGETS: Record<Period, number> = {
  daily: 500,
  weekly: 2500,
  monthly: 10000,
  yearly: 120000
};

export const EarningsProjection: React.FC<EarningsProjectionProps> = ({
  trades,
  selectedDate
}) => {
  // State for earnings targets
  const [targets, setTargets] = useState<Record<Period, EarningsTarget>>(() => ({
    daily: { period: 'daily', amount: DEFAULT_TARGETS.daily, isActive: true },
    weekly: { period: 'weekly', amount: DEFAULT_TARGETS.weekly, isActive: true },
    monthly: { period: 'monthly', amount: DEFAULT_TARGETS.monthly, isActive: true },
    yearly: { period: 'yearly', amount: DEFAULT_TARGETS.yearly, isActive: true }
  }));

  const [editingTarget, setEditingTarget] = useState<Period | null>(null);
  const [tempAmount, setTempAmount] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('monthly');

  // Calculate period boundaries
  const getPeriodBounds = useCallback((period: Period, date: Date) => {
    switch (period) {
      case 'daily':
        return { start: startOfDay(date), end: endOfDay(date) };
      case 'weekly':
        return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(date), end: endOfMonth(date) };
      case 'yearly':
        return { start: startOfYear(date), end: endOfYear(date) };
    }
  }, []);

  // Calculate earnings stats for each period
  const earningsStats = useMemo(() => {
    const stats: Record<Period, PeriodStats> = {} as Record<Period, PeriodStats>;
    const now = new Date();

    (['daily', 'weekly', 'monthly', 'yearly'] as Period[]).forEach(period => {
      const bounds = getPeriodBounds(period, selectedDate);
      const target = targets[period];
      
      // Calculate actual earnings for this period
      const periodTrades = trades.filter(trade => {
        const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
        return isWithinInterval(tradeDate, bounds);
      });
      
      const actual = periodTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
      const progress = target.amount > 0 ? (actual / target.amount) * 100 : 0;
      const remaining = target.amount - actual;
      
      // Calculate time metrics
      let totalDays: number;
      let daysElapsed: number;
      let daysLeft: number;
      
      switch (period) {
        case 'daily':
          totalDays = 1;
          // For daily, we calculate based on market hours (9:30 AM to 4:00 PM ET = 6.5 hours)
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const currentTime = currentHour + currentMinute / 60;
          
          // Market hours: 9:30 AM to 4:00 PM (6.5 hours total)
          const marketOpen = 9.5; // 9:30 AM
          const marketClose = 16; // 4:00 PM
          const totalMarketHours = marketClose - marketOpen; // 6.5 hours
          
          if (currentTime < marketOpen) {
            // Before market opens
            daysElapsed = 0;
            daysLeft = 1;
          } else if (currentTime > marketClose) {
            // After market closes
            daysElapsed = 1;
            daysLeft = 0;
          } else {
            // During market hours
            const hoursElapsed = currentTime - marketOpen;
            daysElapsed = hoursElapsed / totalMarketHours;
            daysLeft = 1 - daysElapsed;
          }
          break;
        case 'weekly':
          totalDays = 7;
          daysElapsed = differenceInDays(now > bounds.end ? bounds.end : now, bounds.start) + 1;
          daysLeft = Math.max(0, differenceInDays(bounds.end, now > bounds.end ? bounds.end : now));
          break;
        case 'monthly':
          totalDays = getDaysInMonth(selectedDate);
          daysElapsed = differenceInDays(now > bounds.end ? bounds.end : now, bounds.start) + 1;
          daysLeft = Math.max(0, differenceInDays(bounds.end, now > bounds.end ? bounds.end : now));
          break;
        case 'yearly':
          const yearStart = startOfYear(selectedDate);
          const yearEnd = endOfYear(selectedDate);
          totalDays = differenceInDays(yearEnd, yearStart) + 1;
          daysElapsed = differenceInDays(now > yearEnd ? yearEnd : now, yearStart) + 1;
          daysLeft = Math.max(0, differenceInDays(yearEnd, now > yearEnd ? yearEnd : now));
          break;
      }
      
      const timeElapsed = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;
      const dailyRequired = daysLeft > 0 ? remaining / daysLeft : 0;
      const averageDaily = daysElapsed > 0 ? actual / daysElapsed : 0;
      const projectedEnd = totalDays > 0 ? averageDaily * totalDays : actual;
      const onTrack = progress >= timeElapsed || actual >= target.amount;
      
      stats[period] = {
        period,
        label: PERIOD_CONFIG[period].label,
        target: target.amount,
        actual,
        progress: Math.min(progress, 100),
        remaining,
        daysLeft,
        dailyRequired,
        onTrack,
        timeElapsed,
        projectedEnd
      };
    });

    return stats;
  }, [trades, selectedDate, targets, getPeriodBounds]);

  // Handle target editing
  const startEditing = useCallback((period: Period) => {
    setEditingTarget(period);
    setTempAmount(targets[period].amount.toString());
  }, [targets]);

  const saveTarget = useCallback(() => {
    if (editingTarget && tempAmount) {
      const amount = parseFloat(tempAmount);
      if (!isNaN(amount) && amount > 0) {
        setTargets(prev => ({
          ...prev,
          [editingTarget]: {
            ...prev[editingTarget],
            amount
          }
        }));
      }
    }
    setEditingTarget(null);
    setTempAmount('');
  }, [editingTarget, tempAmount]);

  const cancelEditing = useCallback(() => {
    setEditingTarget(null);
    setTempAmount('');
  }, []);

  const toggleTarget = useCallback((period: Period) => {
    setTargets(prev => ({
      ...prev,
      [period]: {
        ...prev[period],
        isActive: !prev[period].isActive
      }
    }));
  }, []);

  // Get color scheme for progress
  const getProgressColor = (progress: number, onTrack: boolean) => {
    if (progress >= 100) return 'emerald';
    if (onTrack && progress >= 75) return 'green';
    if (onTrack && progress >= 50) return 'blue';
    if (progress >= 25) return 'yellow';
    return 'red';
  };

  const getColorClasses = (color: string) => {
    const colors = {
      emerald: {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-800 dark:text-emerald-200',
        accent: 'text-emerald-600',
        progress: 'bg-emerald-500',
        ring: 'ring-emerald-500'
      },
      green: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-800 dark:text-green-200',
        accent: 'text-green-600',
        progress: 'bg-green-500',
        ring: 'ring-green-500'
      },
      blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-800 dark:text-blue-200',
        accent: 'text-blue-600',
        progress: 'bg-blue-500',
        ring: 'ring-blue-500'
      },
      yellow: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-800 dark:text-yellow-200',
        accent: 'text-yellow-600',
        progress: 'bg-yellow-500',
        ring: 'ring-yellow-500'
      },
      red: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-800 dark:text-red-200',
        accent: 'text-red-600',
        progress: 'bg-red-500',
        ring: 'ring-red-500'
      },
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-800 dark:text-purple-200',
        accent: 'text-purple-600',
        progress: 'bg-purple-500',
        ring: 'ring-purple-500'
      },
      orange: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-800',
        text: 'text-orange-800 dark:text-orange-200',
        accent: 'text-orange-600',
        progress: 'bg-orange-500',
        ring: 'ring-orange-500'
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  // Render period card
  const renderPeriodCard = (stats: PeriodStats) => {
    const config = PERIOD_CONFIG[stats.period];
    const colors = getColorClasses(getProgressColor(stats.progress, stats.onTrack));
    const Icon = config.icon;
    const isEditing = editingTarget === stats.period;

    return (
      <div
        key={stats.period}
        className={`${colors.bg} ${colors.border} border rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 ${
          selectedPeriod === stats.period ? `ring-2 ${colors.ring}` : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 ${colors.accent} bg-white dark:bg-gray-800 rounded-lg shadow-sm`}>
              <Icon className="h-5 w-5" />
            </div>
            <h3 className={`font-semibold ${colors.text}`}>
              {stats.label}
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Toggle Active */}
            <button
              onClick={() => toggleTarget(stats.period)}
              className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                targets[stats.period].isActive
                  ? `${colors.progress}`
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${
                  targets[stats.period].isActive ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
            
            {/* Edit Target */}
            {!isEditing ? (
              <button
                onClick={() => startEditing(stats.period)}
                className={`p-1 ${colors.accent} hover:opacity-75 transition-opacity`}
                title="Edit target"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center space-x-1">
                <button
                  onClick={saveTarget}
                  className="p-1 text-green-600 hover:text-green-800 transition-colors"
                  title="Save"
                >
                  <Save className="h-4 w-4" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1 text-red-600 hover:text-red-800 transition-colors"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Target Amount */}
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <Target className={`h-4 w-4 ${colors.accent}`} />
            <span className={`text-sm font-medium ${colors.text}`}>Target:</span>
            {isEditing ? (
              <input
                type="number"
                value={tempAmount}
                onChange={(e) => setTempAmount(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTarget();
                  if (e.key === 'Escape') cancelEditing();
                }}
                autoFocus
              />
            ) : (
              <span className={`font-bold ${colors.accent}`}>
                {formatCurrency(stats.target)}
              </span>
            )}
          </div>
        </div>

        {/* Actual vs Target */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className={`text-sm ${colors.text}`}>Actual:</span>
            <span className={`font-bold text-lg ${
              stats.actual >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(stats.actual)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className={`text-sm ${colors.text}`}>Remaining:</span>
            <span className={`font-semibold ${
              stats.remaining <= 0 ? 'text-green-600' : colors.accent
            }`}>
              {stats.remaining <= 0 ? 'Target Exceeded!' : formatCurrency(stats.remaining)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm font-medium ${colors.text}`}>Progress</span>
            <span className={`text-sm font-bold ${colors.accent}`}>
              {stats.progress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${colors.progress}`}
              style={{ width: `${Math.min(stats.progress, 100)}%` }}
            />
          </div>
          {/* Time Progress Indicator */}
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
            <span>Time elapsed: {stats.timeElapsed.toFixed(1)}%</span>
            <span className={stats.onTrack ? 'text-green-600' : 'text-red-600'}>
              {stats.onTrack ? '✓ On Track' : '⚠ Behind'}
            </span>
          </div>
        </div>

        {/* Projections */}
        {targets[stats.period].isActive && (
          <div className="space-y-2 text-sm">
            {stats.daysLeft > 0 && (
              <div className="flex justify-between">
                <span className={`${colors.text}`}>Daily needed:</span>
                <span className={`font-semibold ${
                  stats.dailyRequired <= 0 ? 'text-green-600' : colors.accent
                }`}>
                  {stats.dailyRequired <= 0 ? 'Target met!' : formatCurrency(stats.dailyRequired)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className={`${colors.text}`}>Projected end:</span>
              <span className={`font-semibold ${
                stats.projectedEnd >= stats.target ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(stats.projectedEnd)}
              </span>
            </div>
            
            {stats.daysLeft > 0 && (
              <div className="flex justify-between">
                <span className={`${colors.text}`}>Days left:</span>
                <span className={`font-semibold ${colors.accent}`}>
                  {stats.daysLeft}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Status Indicator */}
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          {stats.progress >= 100 ? (
            <div className="flex items-center text-green-600">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Target Achieved!</span>
            </div>
          ) : stats.onTrack ? (
            <div className="flex items-center text-blue-600">
              <TrendingUp className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">On Track</span>
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Behind Schedule</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Overall summary
  const overallStats = useMemo(() => {
    const activePeriods = Object.values(earningsStats).filter(
      s => targets[s.period].isActive
    );
    
    const onTrackCount = activePeriods.filter(s => s.onTrack).length;
    const achievedCount = activePeriods.filter(s => s.progress >= 100).length;
    
    return {
      totalActive: activePeriods.length,
      onTrack: onTrackCount,
      achieved: achievedCount,
      onTrackPercentage: activePeriods.length > 0 ? (onTrackCount / activePeriods.length) * 100 : 0,
      achievedPercentage: activePeriods.length > 0 ? (achievedCount / activePeriods.length) * 100 : 0
    };
  }, [earningsStats, targets]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Earnings Tracker
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Real performance vs projected targets
            </p>
          </div>
        </div>
        
        {/* Overall Summary */}
        <div className="hidden sm:flex items-center space-x-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {overallStats.achieved}
            </div>
            <div className="text-gray-500 dark:text-gray-400">Achieved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {overallStats.onTrack}
            </div>
            <div className="text-gray-500 dark:text-gray-400">On Track</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {overallStats.totalActive}
            </div>
            <div className="text-gray-500 dark:text-gray-400">Active</div>
          </div>
        </div>
      </div>

      {/* Period Selection Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['daily', 'weekly', 'monthly', 'yearly'] as Period[]).map(period => {
          const config = PERIOD_CONFIG[period];
          const isActive = selectedPeriod === period;
          const stats = earningsStats[period];
          
          return (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <config.icon className="h-4 w-4" />
              <span className="font-medium">{config.label}</span>
              {stats.progress >= 100 && (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Period Detail */}
      <div className="mb-8">
        {renderPeriodCard(earningsStats[selectedPeriod])}
      </div>

      {/* All Periods Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          All Periods Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {(['daily', 'weekly', 'monthly', 'yearly'] as Period[]).map(period => 
            renderPeriodCard(earningsStats[period])
          )}
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Performance Summary
        </h4>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {overallStats.achievedPercentage.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Targets Achieved
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {overallStats.onTrackPercentage.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              On Track
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(
                Object.values(earningsStats)
                  .filter(s => targets[s.period].isActive)
                  .reduce((sum, s) => sum + s.actual, 0)
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Earned
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(
                Object.values(earningsStats)
                  .filter(s => targets[s.period].isActive)
                  .reduce((sum, s) => sum + s.target, 0)
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Targets
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};