// src/components/EarningsProjection.tsx - Enhanced with Goals Integration
import React, { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Calculator,
  DollarSign,
  Calendar,
  Target,
  AlertTriangle,
  Info,
  PieChart,
  BarChart3,
  Percent,
  LineChart,
  ArrowUp,
  ArrowDown,
  Clock,
  Award,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Save,
  X,
  TrendingDown,
} from 'lucide-react';
import { PLChart } from './PLChart';
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';
import {
  differenceInDays,
  differenceInMonths,
  subDays,
  subMonths,
  format,
  addYears,
  startOfDay,
  subYears,
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfDay,
  endOfWeek,
  endOfMonth,
  endOfYear,
  isWithinInterval,
  differenceInCalendarDays,
  addDays,
  addMonths,
  getDaysInMonth,
  getWeeksInMonth,
} from 'date-fns';

interface EarningsProjectionProps {
  trades: Trade[];
  selectedDate: Date;
}

interface ProjectionPeriod {
  period: string;
  years: number;
  projectedValue: number;
  totalGrowth: number;
  growthPercentage: number;
  projectedPL: number;
  monthlyContribution: number;
  totalContributions: number;
  cagr: number;
}

interface PerformanceMetrics {
  totalPL: number;
  totalTrades: number;
  winRate: number;
  avgDailyPL: number;
  avgMonthlyPL: number;
  avgAnnualPL: number;
  tradingDays: number;
  dailyVolatility: number;
  monthlyVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  consistency: number;
  annualReturnRate: number;
}

// Goals-related interfaces
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

type TimeRange = 'today' | '7d' | '1m' | '3m' | '1y' | 'all';

const MAX_CAPITAL = 1000000000; // 1 billion cap

// Goals configuration
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

// Helper function to safely convert timestamp to Date
const getValidDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  
  if (timestamp instanceof Date) {
    return isNaN(timestamp.getTime()) ? null : timestamp;
  }
  
  try {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error('Error converting timestamp to date:', timestamp, error);
    return null;
  }
};

// Helper function to safely get timestamp for sorting
const getTimestamp = (trade: Trade): number => {
  const date = getValidDate(trade.timestamp);
  return date ? date.getTime() : 0;
};

export const EarningsProjection: React.FC<EarningsProjectionProps> = ({ trades, selectedDate }) => {
  // Input states with proper validation
  const [initialCapital, setInitialCapital] = useState<string>('10000');
  const [monthlyContribution, setMonthlyContribution] = useState<string>('1000');
  const [dividendYield, setDividendYield] = useState<number>(2.5);
  const [dividendGrowthRate, setDividendGrowthRate] = useState<number>(5);
  const [conservativeMode, setConservativeMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'projections' | 'goals' | 'dividends' | 'plchart'>('projections');
  const [plTimeRange, setPLTimeRange] = useState<TimeRange>('all');

  // Goals state
  const [targets, setTargets] = useState<Record<Period, EarningsTarget>>(() => ({
    daily: { period: 'daily', amount: DEFAULT_TARGETS.daily, isActive: true },
    weekly: { period: 'weekly', amount: DEFAULT_TARGETS.weekly, isActive: true },
    monthly: { period: 'monthly', amount: DEFAULT_TARGETS.monthly, isActive: true },
    yearly: { period: 'yearly', amount: DEFAULT_TARGETS.yearly, isActive: true }
  }));

  const [editingTarget, setEditingTarget] = useState<Period | null>(null);
  const [tempAmount, setTempAmount] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('monthly');

  // Helper to get numeric values for calculations
  const getNumericInitialCapital = useCallback((): number => {
    const num = parseFloat(initialCapital);
    return isNaN(num) || num < 0 ? 0 : Math.min(num, MAX_CAPITAL);
  }, [initialCapital]);

  const getNumericMonthlyContribution = useCallback((): number => {
    const num = parseFloat(monthlyContribution);
    return isNaN(num) || num < 0 ? 0 : Math.min(num, MAX_CAPITAL / 12);
  }, [monthlyContribution]);

  // Input validation helpers
  const handleCapitalChange = useCallback((value: string) => {
    if (value === '') {
      setInitialCapital('');
      return;
    }
    
    if (/^\d*\.?\d*$/.test(value)) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue <= MAX_CAPITAL) {
        setInitialCapital(value);
      }
    }
  }, []);

  const handleContributionChange = useCallback((value: string) => {
    if (value === '') {
      setMonthlyContribution('');
      return;
    }
    
    if (/^\d*\.?\d*$/.test(value)) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue <= MAX_CAPITAL / 12) {
        setMonthlyContribution(value);
      }
    }
  }, []);

  // FIXED: Calculate comprehensive performance metrics with proper return rate
  const performanceMetrics = useMemo((): PerformanceMetrics => {
    if (trades.length === 0) {
      return {
        totalPL: 0,
        totalTrades: 0,
        winRate: 0,
        avgDailyPL: 0,
        avgMonthlyPL: 0,
        avgAnnualPL: 0,
        tradingDays: 0,
        dailyVolatility: 0,
        monthlyVolatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        profitFactor: 0,
        consistency: 0,
        annualReturnRate: 0,
      };
    }

    const validTrades = trades.filter(trade => getValidDate(trade.timestamp) !== null);
    
    if (validTrades.length === 0) {
      return {
        totalPL: 0,
        totalTrades: 0,
        winRate: 0,
        avgDailyPL: 0,
        avgMonthlyPL: 0,
        avgAnnualPL: 0,
        tradingDays: 0,
        dailyVolatility: 0,
        monthlyVolatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        profitFactor: 0,
        consistency: 0,
        annualReturnRate: 0,
      };
    }

    const sortedTrades = [...validTrades].sort((a, b) => getTimestamp(a) - getTimestamp(b));

    const totalPL = validTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
    const wins = validTrades.filter((trade) => trade.realizedPL > 0);
    const losses = validTrades.filter((trade) => trade.realizedPL < 0);
    const winRate = (wins.length / validTrades.length) * 100;

    // Calculate time-based metrics
    const firstTradeDate = getValidDate(sortedTrades[0].timestamp)!;
    const lastTradeDate = getValidDate(sortedTrades[sortedTrades.length - 1].timestamp)!;
    const totalDays = Math.max(differenceInDays(lastTradeDate, firstTradeDate), 1);
    const totalMonths = Math.max(differenceInMonths(lastTradeDate, firstTradeDate), 1);
    const totalYears = totalDays / 365.25;

    // Get unique trading days
    const uniqueTradingDays = new Set(validTrades.map((trade) => {
      const tradeDate = getValidDate(trade.timestamp)!;
      return format(tradeDate, 'yyyy-MM-dd');
    })).size;

    const avgDailyPL = totalPL / Math.max(uniqueTradingDays, 1);
    const avgMonthlyPL = totalPL / Math.max(totalMonths, 1);
    const avgAnnualPL = totalPL / Math.max(totalYears, 1);

    // FIXED: Calculate annual return rate as percentage of initial capital
    const initialCapitalNum = getNumericInitialCapital();
    const annualReturnRate = initialCapitalNum > 0 ? (avgAnnualPL / initialCapitalNum) * 100 : 0;

    // Calculate volatility (standard deviation of daily returns)
    const dailyPLs = Object.values(
      validTrades.reduce((acc, trade) => {
        const tradeDate = getValidDate(trade.timestamp)!;
        const dateKey = format(tradeDate, 'yyyy-MM-dd');
        acc[dateKey] = (acc[dateKey] || 0) + trade.realizedPL;
        return acc;
      }, {} as Record<string, number>)
    );

    const dailyMean = dailyPLs.reduce((sum, pl) => sum + pl, 0) / dailyPLs.length;
    const dailyVariance =
      dailyPLs.reduce((sum, pl) => sum + Math.pow(pl - dailyMean, 2), 0) / dailyPLs.length;
    const dailyVolatility = Math.sqrt(dailyVariance);
    const monthlyVolatility = dailyVolatility * Math.sqrt(21);

    // Calculate Sharpe ratio using return rate
    const riskFreeRate = 2.0; // 2% annual risk-free rate
    const excessReturn = annualReturnRate - riskFreeRate;
    const annualVolatility = initialCapitalNum > 0 ? (dailyVolatility * Math.sqrt(252) / initialCapitalNum) * 100 : 0;
    const sharpeRatio = annualVolatility > 0 ? excessReturn / annualVolatility : 0;

    // Calculate maximum drawdown
    let runningPL = 0;
    let peak = 0;
    let maxDrawdown = 0;

    sortedTrades.forEach((trade) => {
      runningPL += trade.realizedPL;
      if (runningPL > peak) peak = runningPL;
      const drawdown = peak - runningPL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    // Calculate profit factor
    const totalWins = wins.reduce((sum, trade) => sum + trade.realizedPL, 0);
    const totalLosses = Math.abs(losses.reduce((sum, trade) => sum + trade.realizedPL, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

    // Calculate consistency
    const monthlyPLs = Object.values(
      validTrades.reduce((acc, trade) => {
        const tradeDate = getValidDate(trade.timestamp)!;
        const monthKey = format(tradeDate, 'yyyy-MM');
        acc[monthKey] = (acc[monthKey] || 0) + trade.realizedPL;
        return acc;
      }, {} as Record<string, number>)
    );
    const profitableMonths = monthlyPLs.filter((pl) => pl > 0).length;
    const consistency = monthlyPLs.length > 0 ? (profitableMonths / monthlyPLs.length) * 100 : 0;

    return {
      totalPL,
      totalTrades: validTrades.length,
      winRate,
      avgDailyPL,
      avgMonthlyPL,
      avgAnnualPL,
      tradingDays: uniqueTradingDays,
      dailyVolatility,
      monthlyVolatility,
      sharpeRatio,
      maxDrawdown,
      profitFactor,
      consistency,
      annualReturnRate,
    };
  }, [trades, getNumericInitialCapital]);

  // Goals-related functions
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

  // FIXED: Calculate realistic projections with proper percentage calculations
  const projections = useMemo((): ProjectionPeriod[] => {
    const initialCapitalNum = getNumericInitialCapital();
    const monthlyContributionNum = getNumericMonthlyContribution();
    
    // Use the annual return rate (percentage of capital) rather than absolute dollars
    const baseAnnualReturnRate = performanceMetrics.annualReturnRate / 100; // Convert percentage to decimal
    const conservativeFactor = conservativeMode ? 0.6 : 1.0;
    const adjustedAnnualReturnRate = baseAnnualReturnRate * conservativeFactor;

    const periods = [1, 3, 5, 10, 15];

    return periods.map((years) => {
      let portfolioValue = initialCapitalNum;
      let totalContributions = initialCapitalNum;

      // Compound growth with monthly contributions
      for (let month = 1; month <= years * 12; month++) {
        // Add monthly contribution
        portfolioValue += monthlyContributionNum;
        totalContributions += monthlyContributionNum;
        
        // Apply monthly growth (annual rate divided by 12)
        const monthlyReturnRate = adjustedAnnualReturnRate / 12;
        portfolioValue *= (1 + monthlyReturnRate);
      }

      const totalGrowth = portfolioValue - totalContributions;
      
      // FIXED: Calculate growth percentage based on total contributions
      const growthPercentage = totalContributions > 0 ? (totalGrowth / totalContributions) * 100 : 0;
      
      // FIXED: Calculate CAGR properly
      const cagr = totalContributions > 0 && years > 0 
        ? (Math.pow(portfolioValue / totalContributions, 1 / years) - 1) * 100 
        : 0;

      return {
        period: years === 1 ? '1 Year' : `${years} Years`,
        years,
        projectedValue: portfolioValue,
        totalGrowth,
        growthPercentage,
        projectedPL: totalGrowth, // This is the same as totalGrowth
        monthlyContribution: monthlyContributionNum,
        totalContributions,
        cagr,
      };
    });
  }, [performanceMetrics, getNumericInitialCapital, getNumericMonthlyContribution, conservativeMode]);

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

  // Overall summary for goals
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

  // Render period card for goals
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

  // Mobile-responsive input component
  const renderInput = (
    label: string,
    value: string | number,
    onChange: (value: string) => void,
    prefix: string = '',
    suffix: string = '',
    step: number = 1
  ) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step={step}
          min={0}
          max={
            label.toLowerCase().includes('capital')
              ? MAX_CAPITAL
              : label.toLowerCase().includes('contribution')
              ? MAX_CAPITAL / 12
              : undefined
          }
          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base ${
            prefix ? 'pl-8' : ''
          } ${suffix ? 'pr-12' : ''}`}
          placeholder="0"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );

  if (trades.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
        <div className="text-center">
          <Calculator className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Trading Data Available
          </h3>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Start trading to see your actual P&L performance and earnings projections.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-sm">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                Trading Performance &amp; Projections
              </h2>
            </div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Track your actual trading performance and project future earnings
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('projections')}
            className={`flex items-center px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeTab === 'projections'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Calculator className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Projections</span>
            <span className="sm:hidden">Proj</span>
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex items-center px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeTab === 'goals'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Goals</span>
            <span className="sm:hidden">Goals</span>
          </button>
          <button
            onClick={() => setActiveTab('plchart')}
            className={`flex items-center px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeTab === 'plchart'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <LineChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Trading P&L</span>
            <span className="sm:hidden">P&L</span>
          </button>
          <button
            onClick={() => setActiveTab('dividends')}
            className={`flex items-center px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeTab === 'dividends'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PieChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Dividends</span>
            <span className="sm:hidden">Div</span>
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex items-center space-x-3 mb-4 sm:mb-6">
          <div className="p-2 bg-blue-500 rounded-lg">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            Trading Performance Metrics
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total P&L</p>
            <p
              className={`text-base sm:text-xl font-bold ${
                performanceMetrics.totalPL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(performanceMetrics.totalPL)}
            </p>
          </div>

          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Annual Return</p>
            <p
              className={`text-base sm:text-xl font-bold ${
                performanceMetrics.annualReturnRate >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {performanceMetrics.annualReturnRate.toFixed(1)}%
            </p>
          </div>

          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
            <p
              className={`text-base sm:text-xl font-bold ${
                performanceMetrics.winRate >= 50 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {performanceMetrics.winRate.toFixed(1)}%
            </p>
          </div>

          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Trading Days</p>
            <p className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
              {performanceMetrics.tradingDays}
            </p>
          </div>
        </div>
      </div>

{/* Tab Content */}
     {activeTab === 'projections' && (
       <div className="space-y-4 sm:space-y-6">
         {/* Input controls */}
         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
           <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
             Projection Settings
           </h3>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
             {renderInput('Initial Capital', initialCapital, handleCapitalChange, '$', '', 1000)}
             {renderInput(
               'Monthly Contribution',
               monthlyContribution,
               handleContributionChange,
               '$',
               '',
               100
             )}
           </div>

           <div className="mt-4 sm:mt-6">
             <label className="flex items-center space-x-3 cursor-pointer">
               <input
                 type="checkbox"
                 checked={conservativeMode}
                 onChange={(e) => setConservativeMode(e.target.checked)}
                 className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
               />
               <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                 Conservative Mode (40% discount on projections)
               </span>
             </label>
           </div>

           {/* FIXED: Show current return rate information */}
           <div className="mt-4 sm:mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
             <div className="flex items-start">
               <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
               <div>
                 <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                   Projection Basis
                 </h4>
                 <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                   Projections are based on your historical annual return rate of{' '}
                   <strong>{performanceMetrics.annualReturnRate.toFixed(1)}%</strong> applied to your growing capital.
                   {conservativeMode && ' Conservative mode applies a 40% discount to this rate.'}
                 </p>
               </div>
             </div>
           </div>
         </div>

         {/* Warning for insufficient data */}
         {performanceMetrics.tradingDays < 30 && (
           <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
             <div className="flex items-start">
               <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
               <div>
                 <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                   Limited Data Warning
                 </h4>
                 <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                   Projections are based on {performanceMetrics.tradingDays} trading days. For more accurate
                   projections, consider trading for at least 30–90 days.
                 </p>
               </div>
             </div>
           </div>
         )}

         {/* Projections table */}
         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
           <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
             <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
               Portfolio Projections {conservativeMode && '(Conservative)'}
             </h3>
             <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
               Based on {performanceMetrics.annualReturnRate.toFixed(1)}% annual return rate
               {conservativeMode && ' (discounted to ' + (performanceMetrics.annualReturnRate * 0.6).toFixed(1) + '%)'}
             </p>
           </div>

           {/* Desktop table view */}
           <div className="hidden sm:block overflow-x-auto">
             <table className="w-full">
               <thead className="bg-gray-50 dark:bg-gray-700">
                 <tr>
                   <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                     Time Period
                   </th>
                   <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                     Portfolio Value
                   </th>
                   <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                     Total Growth
                   </th>
                   <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                     CAGR
                   </th>
                 </tr>
               </thead>
               <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                 {projections.map((projection) => (
                   <tr key={projection.period} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                     <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                       {projection.period}
                     </td>
                     <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                       <span className="font-semibold">{formatCurrency(projection.projectedValue)}</span>
                     </td>
                     <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-right">
                       <span
                         className={`font-semibold ${
                           projection.totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                         }`}
                       >
                         {formatCurrency(projection.totalGrowth)}
                       </span>
                     </td>
                     <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-right">
                       <span className={`font-semibold ${projection.cagr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                         {projection.cagr.toFixed(1)}%
                       </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

           {/* Mobile card view */}
           <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
             {projections.map((projection) => (
               <div key={projection.period} className="p-4 space-y-3">
                 <div className="flex items-center justify-between">
                   <h4 className="font-semibold text-gray-900 dark:text-white">{projection.period}</h4>
                   <span
                     className={`text-sm px-2 py-1 rounded ${
                       projection.cagr >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                     }`}
                   >
                     {projection.cagr.toFixed(1)}% CAGR
                   </span>
                 </div>

                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div>
                     <span className="text-gray-500 dark:text-gray-400">Portfolio Value:</span>
                     <div className="font-semibold text-gray-900 dark:text-white">
                       {formatCurrency(projection.projectedValue)}
                     </div>
                   </div>
                   <div>
                     <span className="text-gray-500 dark:text-gray-400">Total Growth:</span>
                     <div
                       className={`font-semibold ${
                         projection.totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                       }`}
                     >
                       {formatCurrency(projection.totalGrowth)}
                     </div>
                   </div>
                 </div>
               </div>
             ))}
           </div>
         </div>

         {/* Key Insights */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
           <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4 sm:p-6">
             <div className="flex items-center space-x-3 mb-4">
               <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
               <h4 className="text-sm sm:text-base font-semibold text-green-800 dark:text-green-200">
                 5-Year Growth
               </h4>
             </div>
             <p className="text-xl sm:text-2xl font-bold text-green-600 mb-2">
               {projections[2] ? formatCurrency(projections[2].projectedValue) : formatCurrency(0)}
             </p>
             <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">Projected portfolio value</p>
           </div>

           <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 sm:p-6">
             <div className="flex items-center space-x-3 mb-4">
               <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
               <h4 className="text-sm sm:text-base font-semibold text-blue-800 dark:text-blue-200">
                 Monthly Income
               </h4>
             </div>
             <p className="text-xl sm:text-2xl font-bold text-blue-600 mb-2">
               {formatCurrency(performanceMetrics.avgMonthlyPL)}
             </p>
             <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
               Average monthly trading profit
             </p>
           </div>

           <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4 sm:p-6">
             <div className="flex items-center space-x-3 mb-4">
               <Target className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
               <h4 className="text-sm sm:text-base font-semibold text-purple-800 dark:text-purple-200">
                 Sharpe Ratio
               </h4>
             </div>
             <p className="text-xl sm:text-2xl font-bold text-purple-600 mb-2">
               {performanceMetrics.sharpeRatio.toFixed(2)}
             </p>
             <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">Risk-adjusted returns</p>
           </div>
         </div>
       </div>
     )}

     {activeTab === 'goals' && (
       <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
         {/* Goals Header */}
         <div className="flex items-center justify-between mb-8">
           <div className="flex items-center space-x-4">
             <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
               <Target className="h-6 w-6 text-white" />
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
     )}

     {activeTab === 'plchart' && (
       <PLChart 
         trades={trades}
         selectedDate={selectedDate}
         plTimeRange={plTimeRange}
         setPLTimeRange={setPLTimeRange}
         title="Trading P&L Performance"
         showTimeRangeSelector={true}
       />
     )}

     {activeTab === 'dividends' && (
       <div className="space-y-4 sm:space-y-6">
         {/* Dividend Input Controls */}
         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
           <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
             Dividend Settings
           </h3>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
             {renderInput(
               'Dividend Yield (%)',
               dividendYield,
               (value) => setDividendYield(parseFloat(value) || 0),
               '',
               '%',
               0.1
             )}

             {renderInput(
               'Dividend Growth Rate (%)',
               dividendGrowthRate,
               (value) => setDividendGrowthRate(parseFloat(value) || 0),
               '',
               '%',
               0.1
             )}
           </div>

           <div className="mt-4 sm:mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
             <div className="flex items-start">
               <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
               <div>
                 <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                   Dividend Calculator Info
                 </h4>
                 <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                   This calculator assumes your trading profits are invested in dividend-paying stocks with
                   reinvested dividends.
                 </p>
               </div>
             </div>
           </div>
         </div>

         {/* Dividend insights cards */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
           <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4 sm:p-6">
             <div className="flex items-center space-x-3 mb-4">
               <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
               <h4 className="text-sm sm:text-base font-semibold text-green-800 dark:text-green-200">
                 15-Year Dividend Income
               </h4>
             </div>
             <p className="text-xl sm:text-2xl font-bold text-green-600 mb-2">
               {formatCurrency(
                 performanceMetrics.totalPL * (dividendYield / 100) * 15
               )}
             </p>
             <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">Based on current trading profits</p>
           </div>

           <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 sm:p-6">
             <div className="flex items-center space-x-3 mb-4">
               <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
               <h4 className="text-sm sm:text-base font-semibold text-blue-800 dark:text-blue-200">
                 Monthly Dividend (Current)
               </h4>
             </div>
             <p className="text-xl sm:text-2xl font-bold text-blue-600 mb-2">
               {formatCurrency(
                 (performanceMetrics.totalPL * (dividendYield / 100)) / 12
               )}
             </p>
             <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">Based on current trading profits</p>
           </div>

           <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4 sm:p-6">
             <div className="flex items-center space-x-3 mb-4">
               <Percent className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
               <h4 className="text-sm sm:text-base font-semibold text-purple-800 dark:text-purple-200">
                 Future Yield on Cost
               </h4>
             </div>
             <p className="text-xl sm:text-2xl font-bold text-purple-600 mb-2">
               {(dividendYield * Math.pow(1 + dividendGrowthRate / 100, 10)).toFixed(1)}%
             </p>
             <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">
               Dividend yield in 10 years
             </p>
           </div>
         </div>
       </div>
     )}
   </div>
 );
};    
