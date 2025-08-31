// src/components/EarningsProjection.tsx - Fixed percentage calculations
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
  annualReturnRate: number; // Added: Annual return rate as percentage of initial capital
}

type TimeRange = 'today' | '7d' | '1m' | '3m' | '1y' | 'all';

const MAX_CAPITAL = 1000000000; // 1 billion cap

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
  const [activeTab, setActiveTab] = useState<'projections' | 'dividends' | 'plchart'>('projections');
  const [plTimeRange, setPLTimeRange] = useState<TimeRange>('all');

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