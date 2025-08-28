// src/components/EarningsProjection.tsx - Trading Performance Projections & Dividend Calculator
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
  Clock,
  LineChart,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';
import { 
  differenceInDays, 
  differenceInMonths, 
  subDays, 
  subMonths,
  format,
  addYears 
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

interface DividendProjection {
  period: string;
  years: number;
  totalDividends: number;
  portfolioValue: number;
  totalValue: number;
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

export const EarningsProjection: React.FC<EarningsProjectionProps> = ({ trades, selectedDate }) => {
  const [initialCapital, setInitialCapital] = useState<string>('10000');
  const [monthlyContribution, setMonthlyContribution] = useState<string>('1000');
  const [dividendYield, setDividendYield] = useState<number>(2.5);
  const [dividendGrowthRate, setDividendGrowthRate] = useState<number>(5);
  const [conservativeMode, setConservativeMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'projections' | 'dividends' | 'scenarios'>('projections');

  // Helper functions for input handling
  const handleInitialCapitalChange = useCallback((value: string) => {
    // Allow empty string, numbers, and decimal points
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setInitialCapital(value);
    }
  }, []);

  const handleMonthlyContributionChange = useCallback((value: string) => {
    // Allow empty string, numbers, and decimal points
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setMonthlyContribution(value);
    }
  }, []);

  // Convert string values to numbers for calculations
  const initialCapitalValue = useMemo(() => {
    const value = parseFloat(initialCapital);
    return isNaN(value) ? 0 : value;
  }, [initialCapital]);

  const monthlyContributionValue = useMemo(() => {
    const value = parseFloat(monthlyContribution);
    return isNaN(value) ? 0 : value;
  }, [monthlyContribution]);

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
        consistency: 0
      };
    }

    // Sort trades by timestamp
    const sortedTrades = [...trades].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    const totalPL = trades.reduce((sum, trade) => sum + trade.realizedPL, 0);
    const wins = trades.filter(trade => trade.realizedPL > 0);
    const losses = trades.filter(trade => trade.realizedPL < 0);
    const winRate = (wins.length / trades.length) * 100;

    // Calculate time-based metrics
    const firstTradeDate = sortedTrades[0].timestamp;
    const lastTradeDate = sortedTrades[sortedTrades.length - 1].timestamp;
    const totalDays = Math.max(differenceInDays(lastTradeDate, firstTradeDate), 1);
    const totalMonths = Math.max(differenceInMonths(lastTradeDate, firstTradeDate), 1);

    // Get unique trading days
    const uniqueTradingDays = new Set(
      trades.map(trade => format(trade.timestamp, 'yyyy-MM-dd'))
    ).size;

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
    const dailyVariance = dailyPLs.reduce((sum, pl) => sum + Math.pow(pl - dailyMean, 2), 0) / dailyPLs.length;
    const dailyVolatility = Math.sqrt(dailyVariance);
    const monthlyVolatility = dailyVolatility * Math.sqrt(21); // 21 trading days per month

    // Calculate Sharpe ratio (assuming 2% risk-free rate)
    const riskFreeRate = 0.02;
    const excessReturn = avgAnnualPL - (initialCapitalValue * riskFreeRate);
    const annualVolatility = dailyVolatility * Math.sqrt(252); // 252 trading days per year
    const sharpeRatio = annualVolatility > 0 ? excessReturn / annualVolatility : 0;

    // Calculate maximum drawdown
    let runningPL = 0;
    let peak = 0;
    let maxDrawdown = 0;
    
    sortedTrades.forEach(trade => {
      runningPL += trade.realizedPL;
      if (runningPL > peak) peak = runningPL;
      const drawdown = peak - runningPL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    // Calculate profit factor
    const totalWins = wins.reduce((sum, trade) => sum + trade.realizedPL, 0);
    const totalLosses = Math.abs(losses.reduce((sum, trade) => sum + trade.realizedPL, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

    // Calculate consistency (percentage of profitable months)
    const monthlyPLs = Object.values(
      trades.reduce((acc, trade) => {
        const monthKey = format(trade.timestamp, 'yyyy-MM');
        acc[monthKey] = (acc[monthKey] || 0) + trade.realizedPL;
        return acc;
      }, {} as Record<string, number>)
    );
    const profitableMonths = monthlyPLs.filter(pl => pl > 0).length;
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
      consistency
    };
  }, [trades, initialCapitalValue]);

  // Calculate trading performance projections
  const projections = useMemo((): ProjectionPeriod[] => {
    const baseAnnualReturn = performanceMetrics.avgAnnualPL;
    const conservativeFactor = conservativeMode ? 0.6 : 1.0; // 40% discount for conservative mode
    const adjustedAnnualReturn = baseAnnualReturn * conservativeFactor;
    
    // Calculate annual growth rate as percentage of starting capital
    const annualGrowthRate = initialCapitalValue > 0 ? adjustedAnnualReturn / initialCapitalValue : 0;
    
    const periods = [1, 3, 5, 10, 20];
    
    return periods.map(years => {
      // Compound growth with monthly contributions
      let portfolioValue = initialCapitalValue;
      let totalContributions = initialCapitalValue;
      let totalGrowth = 0;
      
      for (let year = 1; year <= years; year++) {
        // Add monthly contributions throughout the year
        const yearlyContributions = monthlyContributionValue * 12;
        totalContributions += yearlyContributions;
        
        // Calculate growth on average portfolio value during the year
        const startValue = portfolioValue;
        const avgValueDuringYear = startValue + (yearlyContributions / 2);
        const yearGrowth = avgValueDuringYear * annualGrowthRate;
        
        portfolioValue += yearlyContributions + yearGrowth;
        totalGrowth += yearGrowth;
      }
      
      const growthPercentage = initialCapitalValue > 0 ? ((portfolioValue - totalContributions) / initialCapitalValue) * 100 : 0;
      
      return {
        period: years === 1 ? '1 Year' : `${years} Years`,
        years,
        projectedValue: portfolioValue,
        totalGrowth: portfolioValue - totalContributions,
        growthPercentage,
        projectedPL: totalGrowth,
        monthlyContribution: monthlyContributionValue
      };
    });
  }, [performanceMetrics, initialCapitalValue, monthlyContributionValue, conservativeMode]);

  // Calculate dividend projections
  const dividendProjections = useMemo((): DividendProjection[] => {
    const periods = [1, 3, 5, 10, 20];
    
    return periods.map(years => {
      let portfolioValue = initialCapitalValue;
      let totalDividends = 0;
      let currentDividendYield = dividendYield / 100;
      
      for (let year = 1; year <= years; year++) {
        // Add monthly contributions
        const yearlyContributions = monthlyContributionValue * 12;
        portfolioValue += yearlyContributions;
        
        // Calculate dividends for the year (on average portfolio value)
        const startValue = portfolioValue - yearlyContributions;
        const avgValueDuringYear = startValue + (yearlyContributions / 2);
        const yearDividends = avgValueDuringYear * currentDividendYield;
        totalDividends += yearDividends;
        
        // Reinvest dividends
        portfolioValue += yearDividends;
        
        // Grow dividend yield
        currentDividendYield *= (1 + dividendGrowthRate / 100);
      }
      
      return {
        period: years === 1 ? '1 Year' : `${years} Years`,
        years,
        totalDividends,
        portfolioValue,
        totalValue: portfolioValue + totalDividends
      };
    });
  }, [initialCapitalValue, monthlyContributionValue, dividendYield, dividendGrowthRate]);

  // Scenario analysis
  const scenarios = useMemo(() => {
    const baseReturn = performanceMetrics.avgAnnualPL;
    
    return {
      conservative: {
        name: 'Conservative',
        description: 'Bear market conditions (-50% performance)',
        annualReturn: baseReturn * 0.5,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800'
      },
      realistic: {
        name: 'Realistic',
        description: 'Based on current performance',
        annualReturn: baseReturn,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800'
      },
      optimistic: {
        name: 'Optimistic',
        description: 'Bull market conditions (+50% performance)',
        annualReturn: baseReturn * 1.5,
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800'
      }
    };
  }, [performanceMetrics]);

  // Helper functions
  const getProjectionColor = (growthPercentage: number) => {
    if (growthPercentage > 100) return 'text-green-600';
    if (growthPercentage > 50) return 'text-blue-600';
    if (growthPercentage > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const calculateCAGR = (startValue: number, endValue: number, years: number): number => {
    if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
    return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
  };

  const renderMetricsCard = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-500 rounded-lg">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Trading Performance Metrics
        </h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Total P&L</p>
          <p className={`text-xl font-bold ${performanceMetrics.totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(performanceMetrics.totalPL)}
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
          <p className={`text-xl font-bold ${performanceMetrics.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
            {performanceMetrics.winRate.toFixed(1)}%
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Annual P&L</p>
          <p className={`text-xl font-bold ${performanceMetrics.avgAnnualPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(performanceMetrics.avgAnnualPL)}
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Sharpe Ratio</p>
          <p className={`text-xl font-bold ${performanceMetrics.sharpeRatio >= 1 ? 'text-green-600' : performanceMetrics.sharpeRatio >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
            {performanceMetrics.sharpeRatio.toFixed(2)}
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Trading Days</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {performanceMetrics.tradingDays}
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Profit Factor</p>
          <p className={`text-xl font-bold ${performanceMetrics.profitFactor >= 2 ? 'text-green-600' : performanceMetrics.profitFactor >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
            {performanceMetrics.profitFactor >= 999 ? '∞' : performanceMetrics.profitFactor.toFixed(2)}
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Max Drawdown</p>
          <p className="text-xl font-bold text-red-600">
            {formatCurrency(performanceMetrics.maxDrawdown)}
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Consistency</p>
          <p className={`text-xl font-bold ${performanceMetrics.consistency >= 70 ? 'text-green-600' : performanceMetrics.consistency >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {performanceMetrics.consistency.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );

  const renderProjectionsTab = () => (
    <div className="space-y-6">
      {/* Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Initial Capital
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={initialCapital}
              onChange={(e) => handleInitialCapitalChange(e.target.value)}
              onBlur={(e) => {
                // If empty on blur, set to '0'
                if (e.target.value === '') {
                  setInitialCapital('0');
                }
              }}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter initial capital"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Monthly Contribution
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={monthlyContribution}
              onChange={(e) => handleMonthlyContributionChange(e.target.value)}
              onBlur={(e) => {
                // If empty on blur, set to '0'
                if (e.target.value === '') {
                  setMonthlyContribution('0');
                }
              }}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter monthly contribution"
            />
          </div>
        </div>
        
        <div className="flex items-center">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={conservativeMode}
              onChange={(e) => setConservativeMode(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Conservative Mode (40% discount)
            </span>
          </label>
        </div>
      </div>

      {/* Warning for insufficient data */}
      {performanceMetrics.tradingDays < 30 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Limited Data Warning
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Projections are based on {performanceMetrics.tradingDays} trading days. 
                For more accurate projections, consider trading for at least 30-90 days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Projections Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Portfolio Projections {conservativeMode && '(Conservative)'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Based on {formatCurrency(performanceMetrics.avgAnnualPL)} average annual return
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time Period
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Portfolio Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Growth
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  CAGR
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Growth %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {projections.map((projection, index) => (
                <tr key={projection.period} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {projection.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                    <span className="font-semibold">
                      {formatCurrency(projection.projectedValue)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`font-semibold ${projection.totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(projection.totalGrowth)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`font-semibold ${getProjectionColor(projection.growthPercentage)}`}>
                      {calculateCAGR(initialCapitalValue, projection.projectedValue, projection.years).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <div className="flex items-center justify-end">
                      {projection.growthPercentage >= 0 ? 
                        <ArrowUp className="h-4 w-4 text-green-500 mr-1" /> : 
                        <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                      }
                      <span className={`font-semibold ${getProjectionColor(projection.growthPercentage)}`}>
                        {Math.abs(projection.growthPercentage).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <h4 className="font-semibold text-green-800 dark:text-green-200">
              Growth Potential
            </h4>
          </div>
          <p className="text-2xl font-bold text-green-600 mb-2">
            {projections[2] ? formatCurrency(projections[2].projectedValue) : formatCurrency(0)}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            Projected portfolio value in 5 years
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Calculator className="h-6 w-6 text-blue-600" />
            <h4 className="font-semibold text-blue-800 dark:text-blue-200">
              Monthly Income
            </h4>
          </div>
          <p className="text-2xl font-bold text-blue-600 mb-2">
            {formatCurrency(performanceMetrics.avgMonthlyPL)}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Average monthly trading profit
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Target className="h-6 w-6 text-purple-600" />
            <h4 className="font-semibold text-purple-800 dark:text-purple-200">
              Risk-Adjusted Return
            </h4>
          </div>
          <p className="text-2xl font-bold text-purple-600 mb-2">
            {performanceMetrics.sharpeRatio.toFixed(2)}
          </p>
          <p className="text-sm text-purple-700 dark:text-purple-300">
            Sharpe ratio (risk vs reward)
          </p>
        </div>
      </div>
    </div>
  );

  const renderDividendsTab = () => (
    <div className="space-y-6">
      {/* Dividend Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dividend Yield (%)
          </label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="number"
              value={dividendYield}
              onChange={(e) => setDividendYield(parseFloat(e.target.value) || 0)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="20"
              step="0.1"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dividend Growth Rate (%)
          </label>
          <div className="relative">
            <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="number"
              value={dividendGrowthRate}
              onChange={(e) => setDividendGrowthRate(parseFloat(e.target.value) || 0)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="15"
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* Dividend Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Dividend Calculation Info
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              This calculator assumes your trading profits are invested in dividend-paying stocks. 
              Dividends are reinvested annually and the yield grows by the specified rate each year.
            </p>
          </div>
        </div>
      </div>

      {/* Dividend Projections Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Dividend Income Projections
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Starting yield: {dividendYield}% • Growth rate: {dividendGrowthRate}% annually
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time Period
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Portfolio Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Dividends
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Annual Dividend Income
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Current Yield
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {dividendProjections.map((projection, index) => {
                const currentYield = dividendYield * Math.pow(1 + dividendGrowthRate / 100, projection.years);
                const annualDividendIncome = projection.portfolioValue * (currentYield / 100);
                
                return (
                  <tr key={projection.period} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {projection.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                      <span className="font-semibold">
                        {formatCurrency(projection.portfolioValue)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className="font-semibold text-green-600">
                        {formatCurrency(projection.totalDividends)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(annualDividendIncome)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className="font-medium text-purple-600">
                        {currentYield.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dividend Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <DollarSign className="h-6 w-6 text-green-600" />
            <h4 className="font-semibold text-green-800 dark:text-green-200">
              20-Year Dividend Income
            </h4>
          </div>
          <p className="text-2xl font-bold text-green-600 mb-2">
            {dividendProjections[4] ? formatCurrency(dividendProjections[4].totalDividends) : formatCurrency(0)}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            Total passive income over 20 years
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h4 className="font-semibold text-blue-800 dark:text-blue-200">
              Monthly Dividend (5 Years)
            </h4>
          </div>
          <p className="text-2xl font-bold text-blue-600 mb-2">
            {dividendProjections[2] ? 
              formatCurrency((dividendProjections[2].portfolioValue * (dividendYield * Math.pow(1 + dividendGrowthRate / 100, 5) / 100)) / 12) : 
              formatCurrency(0)
            }
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Estimated monthly passive income
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Percent className="h-6 w-6 text-purple-600" />
            <h4 className="font-semibold text-purple-800 dark:text-purple-200">
              Future Yield on Cost
            </h4>
          </div>
          <p className="text-2xl font-bold text-purple-600 mb-2">
            {(dividendYield * Math.pow(1 + dividendGrowthRate / 100, 10)).toFixed(1)}%
          </p>
          <p className="text-sm text-purple-700 dark:text-purple-300">
            Dividend yield in 10 years
          </p>
        </div>
      </div>
    </div>
  );

  const renderScenariosTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Scenario Analysis - 5 Year Projections
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Compare how different market conditions could affect your portfolio growth over 5 years.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(scenarios).map(([key, scenario]) => {
            // Calculate 5-year projection for this scenario
            const annualReturn = scenario.annualReturn;
            const growthRate = initialCapitalValue > 0 ? annualReturn / initialCapitalValue : 0;
            
            let portfolioValue = initialCapitalValue;
            let totalContributions = initialCapitalValue;
            
            for (let year = 1; year <= 5; year++) {
              const yearlyContributions = monthlyContributionValue * 12;
              totalContributions += yearlyContributions;
              const startValue = portfolioValue;
              const avgValueDuringYear = startValue + (yearlyContributions / 2);
              const yearGrowth = avgValueDuringYear * growthRate;
              portfolioValue += yearlyContributions + yearGrowth;
            }
            
            const totalGrowth = portfolioValue - totalContributions;
            const cagr = calculateCAGR(initialCapitalValue, portfolioValue, 5);
            
            return (
              <div
                key={key}
                className={`${scenario.bgColor} ${scenario.borderColor} border rounded-xl p-6`}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-2 rounded-lg ${key === 'conservative' ? 'bg-orange-500' : key === 'realistic' ? 'bg-blue-500' : 'bg-green-500'}`}>
                    {key === 'conservative' ? <ArrowDown className="h-5 w-5 text-white" /> :
                     key === 'realistic' ? <LineChart className="h-5 w-5 text-white" /> :
                     <ArrowUp className="h-5 w-5 text-white" />}
                  </div>
                  <h4 className={`font-semibold ${scenario.color}`}>
                    {scenario.name}
                  </h4>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {scenario.description}
                </p>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Annual Return</p>
                    <p className={`text-xl font-bold ${scenario.color}`}>
                      {formatCurrency(scenario.annualReturn)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">5-Year Value</p>
                    <p className={`text-xl font-bold ${scenario.color}`}>
                      {formatCurrency(portfolioValue)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Growth</p>
                    <p className={`text-lg font-semibold ${totalGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totalGrowth)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">CAGR</p>
                    <p className={`text-lg font-semibold ${cagr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {cagr.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-600" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Risk Considerations
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Market Risks</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Trading performance can vary significantly</li>
              <li>• Past results don't guarantee future returns</li>
              <li>• Market conditions change over time</li>
              <li>• Consider diversification beyond trading</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Recommendations</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Maintain 3-6 months emergency fund</li>
              <li>• Don't rely solely on trading income</li>
              <li>• Consider tax implications of trading</li>
              <li>• Review and adjust strategy regularly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  if (trades.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <Calculator className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Trading Data Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Start trading to see earnings projections and dividend calculations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-sm">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Earnings Projections & Dividend Calculator
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Project your trading performance and calculate potential dividend income
            </p>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('projections')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'projections'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Performance Projections
          </button>
          <button
            onClick={() => setActiveTab('dividends')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'dividends'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PieChart className="h-4 w-4 mr-2" />
            Dividend Calculator
          </button>
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'scenarios'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Scenario Analysis
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      {renderMetricsCard()}

      {/* Tab Content */}
      {activeTab === 'projections' && renderProjectionsTab()}
      {activeTab === 'dividends' && renderDividendsTab()}
      {activeTab === 'scenarios' && renderScenariosTab()}
    </div>
  );
};