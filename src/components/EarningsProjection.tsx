// src/components/EarningsProjection.tsx - Fixed to show ONLY actual trading P&L
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
}

interface PLChartDataPoint {
  date: Date;
  value: number;
  label: string;
}

type TimeRange = '7d' | '1m' | '3m' | '1y' | 'all';

const MAX_CAPITAL = 1000000000; // 1 billion cap

export const EarningsProjection: React.FC<EarningsProjectionProps> = ({ trades, selectedDate }) => {
  // Input states with proper validation - FIXED to allow empty editing
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

  // Input validation helpers - FIXED to allow empty values
  const handleCapitalChange = useCallback((value: string) => {
    // Allow empty string for editing
    if (value === '') {
      setInitialCapital('');
      return;
    }
    
    // Only allow valid number formats (including decimals)
    if (/^\d*\.?\d*$/.test(value)) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue <= MAX_CAPITAL) {
        setInitialCapital(value);
      }
    }
  }, []);

  const handleContributionChange = useCallback((value: string) => {
    // Allow empty string for editing
    if (value === '') {
      setMonthlyContribution('');
      return;
    }
    
    // Only allow valid number formats (including decimals)
    if (/^\d*\.?\d*$/.test(value)) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue <= MAX_CAPITAL / 12) {
        setMonthlyContribution(value);
      }
    }
  }, []);

  // Calculate comprehensive performance metrics
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
      };
    }

    // Sort trades by timestamp
    const sortedTrades = [...trades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const totalPL = trades.reduce((sum, trade) => sum + trade.realizedPL, 0);
    const wins = trades.filter((trade) => trade.realizedPL > 0);
    const losses = trades.filter((trade) => trade.realizedPL < 0);
    const winRate = (wins.length / trades.length) * 100;

    // Calculate time-based metrics
    const firstTradeDate = sortedTrades[0].timestamp;
    const lastTradeDate = sortedTrades[sortedTrades.length - 1].timestamp;
    const totalDays = Math.max(differenceInDays(lastTradeDate, firstTradeDate), 1);
    const totalMonths = Math.max(differenceInMonths(lastTradeDate, firstTradeDate), 1);

    // Get unique trading days
    const uniqueTradingDays = new Set(trades.map((trade) => format(trade.timestamp, 'yyyy-MM-dd'))).size;

    const avgDailyPL = totalPL / Math.max(uniqueTradingDays, 1);
    const avgMonthlyPL = totalPL / Math.max(totalMonths, 1);
    const avgAnnualPL = (totalPL / Math.max(totalDays, 1)) * 365;

    // Calculate volatility (standard deviation of daily returns)
    const dailyPLs = Object.values(
      trades.reduce((acc, trade) => {
        const dateKey = format(trade.timestamp, 'yyyy-MM-dd');
        acc[dateKey] = (acc[dateKey] || 0) + trade.realizedPL;
        return acc;
      }, {} as Record<string, number>)
    );

    const dailyMean = dailyPLs.reduce((sum, pl) => sum + pl, 0) / dailyPLs.length;
    const dailyVariance =
      dailyPLs.reduce((sum, pl) => sum + Math.pow(pl - dailyMean, 2), 0) / dailyPLs.length;
    const dailyVolatility = Math.sqrt(dailyVariance);
    const monthlyVolatility = dailyVolatility * Math.sqrt(21);

    // Calculate Sharpe ratio (rough)
    const riskFreeRate = 0.02;
    const initialCapitalNum = getNumericInitialCapital();
    const excessReturn = avgAnnualPL - initialCapitalNum * riskFreeRate;
    const annualVolatility = dailyVolatility * Math.sqrt(252);
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
      trades.reduce((acc, trade) => {
        const monthKey = format(trade.timestamp, 'yyyy-MM');
        acc[monthKey] = (acc[monthKey] || 0) + trade.realizedPL;
        return acc;
      }, {} as Record<string, number>)
    );
    const profitableMonths = monthlyPLs.filter((pl) => pl > 0).length;
    const consistency = monthlyPLs.length > 0 ? (profitableMonths / monthlyPLs.length) * 100 : 0;

    return {
      totalPL,
      totalTrades: trades.length,
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
    };
  }, [trades, getNumericInitialCapital]);

  // Calculate realistic projections (updated periods)
  const projections = useMemo((): ProjectionPeriod[] => {
    const baseAnnualReturn = performanceMetrics.avgAnnualPL;
    const conservativeFactor = conservativeMode ? 0.6 : 1.0;
    const adjustedAnnualReturn = baseAnnualReturn * conservativeFactor;
    const initialCapitalNum = getNumericInitialCapital();
    const monthlyContributionNum = getNumericMonthlyContribution();
    const annualGrowthRate = initialCapitalNum > 0 ? adjustedAnnualReturn / initialCapitalNum : 0;

    // More realistic time periods
    const periods = [1, 3, 5, 10, 15];

    return periods.map((years) => {
      let portfolioValue = initialCapitalNum;
      let totalContributions = initialCapitalNum;
      let totalGrowth = 0;

      for (let year = 1; year <= years; year++) {
        const yearlyContributions = monthlyContributionNum * 12;
        totalContributions += yearlyContributions;
        const startValue = portfolioValue;
        const avgValueDuringYear = startValue + yearlyContributions / 2;
        const yearGrowth = avgValueDuringYear * annualGrowthRate;
        portfolioValue += yearlyContributions + yearGrowth;
        totalGrowth += yearGrowth;
      }

      const growthPercentage =
        initialCapitalNum > 0 ? ((portfolioValue - totalContributions) / initialCapitalNum) * 100 : 0;

      return {
        period: years === 1 ? '1 Year' : `${years} Years`,
        years,
        projectedValue: portfolioValue,
        totalGrowth: portfolioValue - totalContributions,
        growthPercentage,
        projectedPL: totalGrowth,
        monthlyContribution: monthlyContributionNum,
      };
    });
  }, [performanceMetrics, getNumericInitialCapital, getNumericMonthlyContribution, conservativeMode]);

  // FIXED: Calculate P&L chart data - ONLY ACTUAL TRADING PROFITS/LOSSES
  const plChartData = useMemo((): PLChartDataPoint[] => {
    if (trades.length === 0) return [];

    const sortedTrades = [...trades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const now = new Date();
    let startDate: Date;

    // Determine date range
    switch (plTimeRange) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '1m':
        startDate = subMonths(now, 1);
        break;
      case '3m':
        startDate = subMonths(now, 3);
        break;
      case '1y':
        startDate = subYears(now, 1);
        break;
      default:
        startDate = sortedTrades[0]?.timestamp || now;
    }

    // Filter trades by date range
    const filteredTrades = sortedTrades.filter((trade) => trade.timestamp >= startDate);

    // Create data points showing ONLY ACTUAL TRADING P&L
    const dataPoints: PLChartDataPoint[] = [];
    let runningPL = 0; // Start at $0 - only trading profits/losses

    // Add starting point at $0
    if (filteredTrades.length > 0) {
      dataPoints.push({
        date: startDate,
        value: 0, // Start at zero to show only trading performance
        label: formatCurrency(0),
      });
    }

    // Add each trade's actual realized P&L
    filteredTrades.forEach((trade) => {
      runningPL += trade.realizedPL; // Cumulative trading profit/loss only
      dataPoints.push({
        date: trade.timestamp,
        value: runningPL, // This shows ONLY your trading gains/losses
        label: formatCurrency(runningPL),
      });
    });

    return dataPoints;
  }, [trades, plTimeRange, selectedDate]);

  // FIXED: Get current P&L stats - ONLY TRADING PERFORMANCE
  const currentPLStats = useMemo(() => {
    const currentValue = performanceMetrics.totalPL; // Only trading profits/losses
    const change = performanceMetrics.totalPL; // Your actual total trading profit/loss
    const initialCapitalNum = getNumericInitialCapital();
    const changePercent = initialCapitalNum > 0 ? (change / initialCapitalNum) * 100 : 0; // Percentage return on initial capital

    return {
      currentValue,
      change,
      changePercent,
      isPositive: change >= 0,
    };
  }, [performanceMetrics.totalPL, getNumericInitialCapital]);

  const renderPLChart = () => {
    if (plChartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 sm:h-80 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <LineChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No trading data available</p>
          </div>
        </div>
      );
    }

    // Compute chart dimensions and scales
    const chartHeight = 240;
    const baseWidth = 320;
    const viewWidth = Math.max(baseWidth, plChartData.length * 10);

    const values = plChartData.map((d) => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    // Helpers to map data -> pixels
    const xAt = (i: number) =>
      plChartData.length === 1 ? 0 : (i / (plChartData.length - 1)) * viewWidth;
    const yAt = (v: number) => chartHeight - ((v - minValue) / valueRange) * chartHeight;

    // Build polyline path points
    const linePoints = plChartData.map((pt, i) => `${xAt(i)},${yAt(pt.value)}`).join(' ');

    // Build filled area path (from first point, along line, then down to bottom and back)
    const areaPath = [
      `M ${xAt(0)} ${chartHeight}`,
      ...plChartData.map((pt, i) => `${i === 0 ? 'L' : 'L'} ${xAt(i)} ${yAt(pt.value)}`),
      `L ${xAt(plChartData.length - 1)} ${chartHeight}`,
      'Z',
    ].join(' ');

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        {/* P&L Summary - FIXED TO SHOW ONLY TRADING PERFORMANCE */}
        <div className="mb-6">
          <div className="text-center mb-4">
            <div className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-1">
              Trading P&L Performance
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {formatCurrency(currentPLStats.currentValue)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Total trading profit/loss
            </div>
            <div
              className={`flex items-center justify-center text-lg sm:text-xl font-semibold ${
                currentPLStats.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {currentPLStats.isPositive ? (
                <ArrowUp className="h-5 w-5 mr-2" />
              ) : (
                <ArrowDown className="h-5 w-5 mr-2" />
              )}
              {formatCurrency(Math.abs(currentPLStats.change))} (
              {Math.abs(currentPLStats.changePercent).toFixed(2)}%)
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {plTimeRange === 'all'
                ? 'All time trading performance'
                : plTimeRange === '7d'
                ? 'Past 7 days'
                : plTimeRange === '1m'
                ? 'Past month'
                : plTimeRange === '3m'
                ? 'Past 3 months'
                : 'Past year'}
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center justify-center">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex flex-wrap gap-1">
              {[
                { key: '7d', label: '7D' },
                { key: '1m', label: '1M' },
                { key: '3m', label: '3M' },
                { key: '1y', label: '1Y' },
                { key: 'all', label: 'All' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPLTimeRange(key as TimeRange)}
                  className={`px-3 py-1 text-xs sm:text-sm font-medium rounded transition-colors ${
                    plTimeRange === key
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Responsive Chart */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-full" style={{ minWidth: '320px', minHeight: `${chartHeight}px` }}>
            <svg
              width="100%"
              height={chartHeight}
              viewBox={`0 0 ${viewWidth} ${chartHeight}`}
              className="w-full h-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grid lines & labels */}
              {Array.from({ length: 5 }).map((_, i) => {
                const y = (chartHeight / 4) * i;
                const value = maxValue - (valueRange / 4) * i;
                return (
                  <g key={i}>
                    <line x1={0} y1={y} x2={viewWidth} y2={y} stroke="rgba(156,163,175,0.2)" strokeWidth={1} />
                    <text
                      x={10}
                      y={y + 4}
                      fill="rgba(156, 163, 175, 0.8)"
                      fontSize={10}
                      className="font-mono"
                    >
                      {formatCurrency(value)}
                    </text>
                  </g>
                );
              })}

              {/* Fill area */}
              {plChartData.length > 1 && (
                <path
                  d={areaPath}
                  fill={currentPLStats.isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
                />
              )}

              {/* Chart line */}
              {plChartData.length > 1 && (
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke={currentPLStats.isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Data points */}
              {plChartData.map((point, i) => {
                const cx = xAt(i);
                const cy = yAt(point.value);
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={currentPLStats.isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                    className="opacity-75 hover:opacity-100"
                  >
                    <title>{`${format(point.date, 'MMM d, yyyy')}: ${point.label}`}</title>
                  </circle>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    );
  };

  // Mobile-responsive input component - FIXED to handle string values
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
      {/* Mobile-responsive header */}
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

        {/* Mobile-responsive tab navigation */}
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

      {/* Performance Metrics - Mobile responsive */}
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
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Avg Annual P&L</p>
            <p
              className={`text-base sm:text-xl font-bold ${
                performanceMetrics.avgAnnualPL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(performanceMetrics.avgAnnualPL)}
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
          {/* Mobile-responsive input controls */}
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

          {/* Mobile-responsive projections table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Portfolio Projections {conservativeMode && '(Conservative)'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Based on {formatCurrency(performanceMetrics.avgAnnualPL)} average annual return
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
                  {projections.map((projection) => {
                    const cagr =
                      projection.years > 0
                        ? (Math.pow(projection.projectedValue / getNumericInitialCapital(), 1 / projection.years) - 1) *
                          100
                        : 0;
                    return (
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
                          <span className={`font-semibold ${cagr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {cagr.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {projections.map((projection) => {
                const cagr =
                  projection.years > 0
                    ? (Math.pow(projection.projectedValue / getNumericInitialCapital(), 1 / projection.years) - 1) * 100
                    : 0;
                return (
                  <div key={projection.period} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{projection.period}</h4>
                      <span
                        className={`text-sm px-2 py-1 rounded ${
                          cagr >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {cagr.toFixed(1)}% CAGR
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
                );
              })}
            </div>
          </div>

          {/* Key Insights - Mobile responsive */}
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

      {activeTab === 'plchart' && renderPLChart()}

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

          {/* Dividend insights cards - Mobile responsive */}
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