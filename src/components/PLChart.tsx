import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity
} from 'lucide-react';
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

interface PLChartDataPoint {
  date: Date;
  value: number;
  label: string;
  portfolioValue: number; // Added: track total portfolio value
}

interface CurrentPLStats {
  currentValue: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
  portfolioValue: number; // Added: current portfolio value
  initialCapital: number; // Added: initial capital
}

type TimeRange = 'today' | '7d' | '1m' | '3m' | '1y' | 'all';

interface PLChartProps {
  trades: Trade[];
  selectedDate: Date;
  plTimeRange?: TimeRange;
  setPLTimeRange?: (range: TimeRange) => void;
  title?: string;
  showTimeRangeSelector?: boolean;
  initialCapital?: number; // Added: prop for initial capital
}

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

export const PLChart: React.FC<PLChartProps> = ({
  trades,
  selectedDate,
  plTimeRange = '1m',
  setPLTimeRange,
  title = 'P&L Performance',
  showTimeRangeSelector = true,
  initialCapital = 10000 // Default initial capital
}) => {
  const [localTimeRange, setLocalTimeRange] = useState<TimeRange>(plTimeRange);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const currentTimeRange = setPLTimeRange ? plTimeRange : localTimeRange;
  const setCurrentTimeRange = setPLTimeRange ? setPLTimeRange : setLocalTimeRange;

  const timeRangeOptions = [
    { key: 'today', label: '1D' },
    { key: '7d', label: '7D' },
    { key: '1m', label: '1M' },
    { key: '3m', label: '3M' },
    { key: '1y', label: '1Y' },
    { key: 'all', label: 'All' },
  ];

  const getTimeRangeLabel = () => {
    switch (currentTimeRange) {
      case 'all': return 'All time';
      case 'today': return `${format(selectedDate, 'MMM d, yyyy')}`;
      case '7d': return 'Past 7 days';
      case '1m': return 'Past month';
      case '3m': return 'Past 3 months';
      case '1y': return 'Past year';
      default: return '';
    }
  };

  // Add mounted state to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // FIXED: Improved dimension calculation with better mobile spacing for labels
  useEffect(() => {
    if (!isMounted) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        try {
          const rect = containerRef.current.getBoundingClientRect();
          const newWidth = Math.max(320, rect.width - 48);
          // FIXED: Increase mobile height to accommodate x-axis labels
          const newHeight = typeof window !== 'undefined' && window.innerWidth < 768 ? 300 : 400;
          
          setDimensions(prev => {
            if (prev.width !== newWidth || prev.height !== newHeight) {
              return { width: newWidth, height: newHeight };
            }
            return prev;
          });
        } catch (error) {
          console.error('Error updating chart dimensions:', error);
          setDimensions({ width: 800, height: 400 });
        }
      }
    };

    const timer = setTimeout(updateDimensions, 100);
    const handleResize = () => requestAnimationFrame(updateDimensions);
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      clearTimeout(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [isMounted]);

  // FIXED: Generate P&L chart data with proper portfolio value tracking
  const plChartData = useMemo((): PLChartDataPoint[] => {
    if (!trades || trades.length === 0) return [];

    try {
      // Filter out trades with invalid timestamps first
      const validTrades = trades.filter(trade => getValidDate(trade.timestamp) !== null);
      
      if (validTrades.length === 0) return [];

      const sortedTrades = [...validTrades].sort((a, b) => getTimestamp(a) - getTimestamp(b));

      const now = new Date();
      let startDate: Date;
      let filteredTrades: Trade[];

      // Improved date range filtering
      switch (currentTimeRange) {
        case 'today':
          const todayStart = startOfDay(selectedDate);
          const todayEnd = endOfDay(selectedDate);
          filteredTrades = sortedTrades.filter(trade => {
            const tradeDate = getValidDate(trade.timestamp);
            return tradeDate && isWithinInterval(tradeDate, { start: todayStart, end: todayEnd });
          });
          startDate = todayStart;
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filteredTrades = sortedTrades.filter(trade => {
            const tradeDate = getValidDate(trade.timestamp);
            return tradeDate && tradeDate >= startDate;
          });
          break;
        case '1m':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filteredTrades = sortedTrades.filter(trade => {
            const tradeDate = getValidDate(trade.timestamp);
            return tradeDate && tradeDate >= startDate;
          });
          break;
        case '3m':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          filteredTrades = sortedTrades.filter(trade => {
            const tradeDate = getValidDate(trade.timestamp);
            return tradeDate && tradeDate >= startDate;
          });
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          filteredTrades = sortedTrades.filter(trade => {
            const tradeDate = getValidDate(trade.timestamp);
            return tradeDate && tradeDate >= startDate;
          });
          break;
        default: // 'all'
          startDate = getValidDate(sortedTrades[0]?.timestamp) || now;
          filteredTrades = sortedTrades;
      }

      if (filteredTrades.length === 0) return [];

      // FIXED: Create data points showing both cumulative P&L and portfolio value
      const dataPoints: PLChartDataPoint[] = [];
      let runningPL = 0;
      
      // Calculate initial P&L before the filtered period for proper portfolio value calculation
      let initialPLBeforePeriod = 0;
      if (currentTimeRange !== 'all') {
        // Sum all P&L from trades before the start date
        const tradesBeforeStart = sortedTrades.filter(trade => {
          const tradeDate = getValidDate(trade.timestamp);
          return tradeDate && tradeDate < startDate;
        });
        initialPLBeforePeriod = tradesBeforeStart.reduce((sum, trade) => sum + trade.realizedPL, 0);
      }

      // Starting portfolio value for the period
      const startingPortfolioValue = initialCapital + initialPLBeforePeriod;

      // Add starting point for non-"all" time ranges
      if (currentTimeRange !== 'all') {
        dataPoints.push({
          date: startDate,
          value: 0, // P&L change from start of period
          label: formatCurrency(0),
          portfolioValue: startingPortfolioValue,
        });
      }

      // Add each trade's cumulative effect
      filteredTrades.forEach((trade) => {
        runningPL += trade.realizedPL;
        const tradeDate = getValidDate(trade.timestamp)!;
        const currentPortfolioValue = currentTimeRange === 'all' 
          ? initialCapital + runningPL  // For "all", portfolio = initial + total P&L
          : startingPortfolioValue + runningPL; // For periods, portfolio = period start + period P&L
        
        dataPoints.push({
          date: tradeDate,
          value: runningPL, // P&L change within the period
          label: formatCurrency(runningPL),
          portfolioValue: currentPortfolioValue,
        });
      });

      // Mobile optimization - reduce data points for better performance
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (isMobile && dataPoints.length > 50) {
        const maxPoints = 25;
        const step = Math.ceil(dataPoints.length / maxPoints);
        const sampledPoints = dataPoints.filter((_, index) => {
          if (index === 0 || index === dataPoints.length - 1) return true;
          return index % step === 0;
        });
        return sampledPoints;
      }

      return dataPoints;
    } catch (error) {
      console.error('Error generating chart data:', error);
      return [];
    }
  }, [trades, currentTimeRange, selectedDate, initialCapital]);

  // FIXED: Calculate current stats with proper percentage based on portfolio value
  const currentPLStats = useMemo((): CurrentPLStats => {
    try {
      if (plChartData.length === 0) {
        return { 
          currentValue: 0, 
          change: 0, 
          changePercent: 0, 
          isPositive: true,
          portfolioValue: initialCapital,
          initialCapital
        };
      }
      
      const current = plChartData[plChartData.length - 1].value;
      const currentPortfolioValue = plChartData[plChartData.length - 1].portfolioValue;
      
      let change: number;
      let changePercent: number;
      let startingPortfolioValue: number;

      if (currentTimeRange === 'all') {
        // For "all time", compare against initial capital
        change = current; // Total P&L
        startingPortfolioValue = initialCapital;
        changePercent = initialCapital > 0 ? (change / initialCapital) * 100 : 0;
      } else {
        // For time periods, compare against the starting portfolio value for that period
        const periodStartPoint = plChartData[0];
        change = current - periodStartPoint.value; // P&L change within period
        startingPortfolioValue = periodStartPoint.portfolioValue;
        
        // Calculate percentage based on portfolio value at start of period
        changePercent = startingPortfolioValue > 0 ? (change / startingPortfolioValue) * 100 : 0;
      }
      
      return {
        currentValue: current,
        change,
        changePercent,
        isPositive: change >= 0,
        portfolioValue: currentPortfolioValue,
        initialCapital
      };
    } catch (error) {
      console.error('Error calculating P&L stats:', error);
      return { 
        currentValue: 0, 
        change: 0, 
        changePercent: 0, 
        isPositive: true,
        portfolioValue: initialCapital,
        initialCapital
      };
    }
  }, [plChartData, currentTimeRange, initialCapital]);

  // Don't render until mounted
  if (!isMounted) {
    return (
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto">
              <BarChart3 className="h-8 w-8 opacity-60 animate-pulse" />
            </div>
            <div>
              <p className="text-lg font-medium">Loading chart...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (plChartData.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {showTimeRangeSelector && (
          <div className="px-6 py-5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-center">
              <div className="inline-flex bg-white dark:bg-gray-800 rounded-2xl p-1.5 shadow-lg border border-gray-200 dark:border-gray-600">
                {timeRangeOptions.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setCurrentTimeRange(key as TimeRange)}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 transform ${
                      currentTimeRange === key
                        ? 'bg-blue-600 text-white shadow-lg scale-105 shadow-blue-200/50'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-102'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-8">
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto">
                <BarChart3 className="h-8 w-8 opacity-60" />
              </div>
              <div>
                <p className="text-lg font-medium">No trading data available</p>
                <p className="text-sm opacity-75 mt-1">
                  {currentTimeRange === 'today' 
                    ? `No trades found for ${format(selectedDate, 'MMM d, yyyy')}`
                    : `No trades found for the selected time range`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FIXED: Better chart dimensions with increased bottom padding for labels
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const chartPadding = { 
    top: 20, 
    right: isMobile ? 20 : 60, 
    bottom: isMobile ? 45 : 60, // FIXED: Increased bottom padding for labels
    left: isMobile ? 50 : 80 
  };
  const chartWidth = Math.max(200, dimensions.width - chartPadding.left - chartPadding.right);
  const chartHeight = Math.max(150, dimensions.height - chartPadding.top - chartPadding.bottom);

  const values = plChartData.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = Math.max(maxValue - minValue, 1);
  const padding = valueRange * 0.1;

  // Helper functions with error handling
  const xAt = (i: number) => {
    try {
      return plChartData.length === 1 ? chartWidth / 2 : (i / (plChartData.length - 1)) * chartWidth;
    } catch (error) {
      console.error('Error calculating x position:', error);
      return 0;
    }
  };

  const yAt = (v: number) => {
    try {
      return chartHeight - ((v - (minValue - padding)) / (valueRange + 2 * padding)) * chartHeight;
    } catch (error) {
      console.error('Error calculating y position:', error);
      return 0;
    }
  };

  // Find closest point to mouse position
  const findClosestPoint = (mouseX: number) => {
    if (plChartData.length === 0) return null;
    
    try {
      const relativeX = mouseX - chartPadding.left;
      const pointIndex = Math.round((relativeX / chartWidth) * (plChartData.length - 1));
      return Math.max(0, Math.min(plChartData.length - 1, pointIndex));
    } catch (error) {
      console.error('Error finding closest point:', error);
      return null;
    }
  };

  // Build smooth path with error handling
  const buildSmoothPath = () => {
    if (plChartData.length < 2) return '';
    
    try {
      let path = `M ${xAt(0)} ${yAt(plChartData[0].value)}`;
      
      for (let i = 1; i < plChartData.length; i++) {
        const prevX = xAt(i - 1);
        const prevY = yAt(plChartData[i - 1].value);
        const currentX = xAt(i);
        const currentY = yAt(plChartData[i].value);
        
        const controlPointX = prevX + (currentX - prevX) * 0.5;
        path += ` Q ${controlPointX} ${prevY} ${currentX} ${currentY}`;
      }
      
      return path;
    } catch (error) {
      console.error('Error building smooth path:', error);
      return '';
    }
  };

  // Build area path with error handling
  const buildAreaPath = () => {
    if (plChartData.length < 2) return '';
    
    try {
      const linePath = buildSmoothPath();
      const zeroY = Math.min(Math.max(yAt(0), 0), chartHeight);
      
      return `${linePath} L ${xAt(plChartData.length - 1)} ${zeroY} L ${xAt(0)} ${zeroY} Z`;
    } catch (error) {
      console.error('Error building area path:', error);
      return '';
    }
  };

  // Handle mouse movement with error handling
  const handleMouseMove = (event: React.MouseEvent) => {
    try {
      if (!chartRef.current) return;
      
      const rect = chartRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      setMousePosition({ x, y });
      
      const closestPointIndex = findClosestPoint(x);
      setHoveredPoint(closestPointIndex);
    } catch (error) {
      console.error('Error handling mouse move:', error);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 dark:from-gray-800 dark:via-blue-900/20 dark:to-gray-800 px-6 py-8 border-b border-gray-200 dark:border-gray-700">
        <div className="text-center space-y-4">
          {/* Portfolio Value - Main Display */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
              Portfolio Value
            </div>
            <div className="flex items-center justify-center space-x-3">
              <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
                {formatCurrency(currentPLStats.portfolioValue)}
              </div>
            </div>
          </div>

          {/* P&L Change and Percentage */}
          <div className="space-y-3">
            <div
              className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-semibold shadow-lg transition-all duration-300 ${
                currentPLStats.isPositive 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shadow-emerald-200/50' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shadow-red-200/50'
              }`}
            >
              {currentPLStats.isPositive ? (
                <TrendingUp className="h-6 w-6 mr-3" />
              ) : (
                <TrendingDown className="h-6 w-6 mr-3" />
              )}
              <span className="flex items-center space-x-2">
                <span>{currentPLStats.isPositive ? '+' : ''}{formatCurrency(currentPLStats.change)}</span>
                <span className="opacity-75">
                  ({currentPLStats.isPositive ? '+' : ''}{currentPLStats.changePercent.toFixed(2)}%)
                </span>
              </span>
            </div>

            {/* Additional context */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {currentTimeRange === 'all' 
                ? `vs Initial Capital (${formatCurrency(initialCapital)})`
                : `${getTimeRangeLabel()} performance`
              }
            </div>
          </div>
          
          {/* Period Label */}
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
            {title} - {getTimeRangeLabel()}
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      {showTimeRangeSelector && (
        <div className="px-6 py-5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-center">
            <div className="inline-flex bg-white dark:bg-gray-800 rounded-2xl p-1.5 shadow-lg border border-gray-200 dark:border-gray-600">
              {timeRangeOptions.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCurrentTimeRange(key as TimeRange)}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 transform ${
                    currentTimeRange === key
                      ? 'bg-blue-600 text-white shadow-lg scale-105 shadow-blue-200/50'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-102'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="p-6" ref={containerRef}>
        <div 
          ref={chartRef}
          className="relative rounded-xl bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-900 border border-gray-100 dark:border-gray-700"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsMouseOver(true)}
          onMouseLeave={() => {
            setIsMouseOver(false);
            setHoveredPoint(null);
          }}
        >
          <svg
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-full"
          >
            {/* Gradient Definitions */}
            <defs>
              <linearGradient id="positiveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(16, 185, 129, 0.4)" />
                <stop offset="100%" stopColor="rgba(16, 185, 129, 0.02)" />
              </linearGradient>
              <linearGradient id="negativeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0.02)" />
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <g transform={`translate(${chartPadding.left}, ${chartPadding.top})`}>
              {/* Background grid */}
              {Array.from({ length: 6 }).map((_, i) => {
                const y = (chartHeight / 5) * i;
                const value = (minValue - padding) + ((valueRange + 2 * padding) / 5) * (5 - i);
                return (
                  <g key={i} opacity={0.4}>
                    <line 
                      x1={0} 
                      y1={y} 
                      x2={chartWidth} 
                      y2={y} 
                      stroke="currentColor" 
                      strokeWidth={i === 0 || i === 5 ? 1.5 : 0.8}
                      strokeDasharray={i === 0 || i === 5 ? "none" : "3,6"}
                      className="text-gray-300 dark:text-gray-600"
                    />
                    <text
                      x={-12}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-gray-500 dark:fill-gray-400 text-xs font-mono font-medium"
                    >
                      {formatCurrency(value)}
                    </text>
                  </g>
                );
              })}

              {/* Zero line */}
              {minValue < 0 && maxValue > 0 && (
                <line
                  x1={0}
                  y1={yAt(0)}
                  x2={chartWidth}
                  y2={yAt(0)}
                  stroke="currentColor"
                  strokeWidth={2}
                  className="text-gray-400 dark:text-gray-500"
                  strokeDasharray="5,5"
                />
              )}

              {/* Fill area */}
              {plChartData.length > 1 && (
                <path
                  d={buildAreaPath()}
                  fill={`url(#${currentPLStats.isPositive ? 'positive' : 'negative'}Gradient)`}
                  className="transition-all duration-500"
                />
              )}

              {/* Main line */}
              {plChartData.length > 1 && (
                <path
                  d={buildSmoothPath()}
                  fill="none"
                  stroke={currentPLStats.isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}
                  strokeWidth={3}
                  filter="url(#glow)"
                  className="transition-all duration-500"
                />
              )}

              {/* Crosshair lines */}
              {isMouseOver && hoveredPoint !== null && hoveredPoint < plChartData.length && (
                <g className="transition-opacity duration-200" style={{ opacity: 0.7 }}>
                  {/* Vertical line */}
                  <line
                    x1={xAt(hoveredPoint)}
                    y1={0}
                    x2={xAt(hoveredPoint)}
                    y2={chartHeight}
                    stroke="rgb(99, 102, 241)"
                    strokeWidth={1.5}
                    strokeDasharray="4,4"
                    className="animate-pulse"
                  />
                  {/* Horizontal line */}
                  <line
                    x1={0}
                    y1={yAt(plChartData[hoveredPoint].value)}
                    x2={chartWidth}
                    y2={yAt(plChartData[hoveredPoint].value)}
                    stroke="rgb(99, 102, 241)"
                    strokeWidth={1.5}
                    strokeDasharray="4,4"
                    className="animate-pulse"
                  />
                </g>
              )}

              {/* Data points */}
              {plChartData.map((point, i) => {
                const cx = xAt(i);
                const cy = yAt(point.value);
                const isHovered = hoveredPoint === i;
                
                // Better mobile point visibility logic
                let isVisible = false;
                if (isMobile) {
                  isVisible = plChartData.length < 10 || isHovered || i === 0 || i === plChartData.length - 1 || i % Math.ceil(plChartData.length / 8) === 0;
                } else {
                  isVisible = plChartData.length < 100 || isHovered || i % Math.ceil(plChartData.length / 20) === 0;
                }
                
                if (!isVisible && !isHovered) return null;
                
                return (
                  <g key={i}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 6 : (isMobile ? 3 : 4)}
                      fill="white"
                      stroke={currentPLStats.isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}
                      strokeWidth={isHovered ? 3 : 2}
                      className="cursor-pointer transition-all duration-200"
                    />
                  </g>
                );
              })}

              {/* X-axis labels with mobile optimization */}
              {plChartData.length > 1 && (
                <g transform={`translate(0, ${chartHeight + 20})`}>
                  {plChartData
                    .filter((_, i) => {
                      // Better mobile label spacing
                      const maxLabels = isMobile ? 2 : 6;
                      if (plChartData.length <= maxLabels) return true;
                      const step = Math.ceil(plChartData.length / maxLabels);
                      return i === 0 || i === plChartData.length - 1 || i % step === 0;
                    })
                    .map((point, _, filtered) => {
                      const originalIndex = plChartData.indexOf(point);
                      return (
                        <text
                          key={originalIndex}
                          x={xAt(originalIndex)}
                          y={0}
                          textAnchor="middle"
                          className="fill-gray-500 dark:fill-gray-400 text-xs font-semibold"
                        >
                          {format(point.date, currentTimeRange === 'today' ? 'HH:mm' : (isMobile ? 'M/d' : 'MMM d'))}
                        </text>
                      );
                    })}
                </g>
              )}
            </g>
          </svg>

          {/* FIXED: Tooltip positioned absolutely outside SVG to prevent clipping */}
          {isMouseOver && hoveredPoint !== null && hoveredPoint < plChartData.length && (
            (() => {
              // Calculate tooltip position relative to the chart container
              const pointX = chartPadding.left + xAt(hoveredPoint);
              const pointY = chartPadding.top + yAt(plChartData[hoveredPoint].value);
              
              // Tooltip dimensions
              const tooltipWidth = 180;
              const tooltipHeight = 90;
              const margin = 15;
              
              // Calculate position relative to chart container
              let tooltipX = pointX - tooltipWidth / 2;
              let tooltipY = pointY - tooltipHeight - margin;
              
              // Adjust horizontal position to stay within chart bounds
              if (tooltipX < margin) {
                tooltipX = margin;
              } else if (tooltipX + tooltipWidth > dimensions.width - margin) {
                tooltipX = dimensions.width - tooltipWidth - margin;
              }
              
              // Adjust vertical position - prefer above, but go below if needed
              if (tooltipY < margin) {
                tooltipY = pointY + margin; // Position below
              }
              
              // If still clipping below, position above with adjustment
              if (tooltipY + tooltipHeight > dimensions.height - margin) {
                tooltipY = Math.max(margin, pointY - tooltipHeight - margin);
              }
              
              return (
                <div 
                  className="absolute z-50 pointer-events-none"
                  style={{
                    left: `${tooltipX}px`,
                    top: `${tooltipY}px`,
                    width: `${tooltipWidth}px`,
                    height: `${tooltipHeight}px`
                  }}
                >
                  <div className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 rounded-lg shadow-xl p-3 text-sm font-medium w-full h-full">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Portfolio Value</span>
                      <span className="font-bold text-gray-900 dark:text-white text-xs">
                        {formatCurrency(plChartData[hoveredPoint].portfolioValue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-600 dark:text-gray-400">P&L Change</span>
                      <span className={`font-bold text-xs ${currentPLStats.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(plChartData[hoveredPoint].value)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Date</span>
                      <span className="text-gray-900 dark:text-white font-medium text-xs">
                        {format(plChartData[hoveredPoint].date, currentTimeRange === 'today' ? 'HH:mm' : 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
};