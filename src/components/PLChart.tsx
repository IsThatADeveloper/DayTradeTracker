// src/components/PLChart.tsx - Fixed getX function
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity
} from 'lucide-react';
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';

interface PLChartDataPoint {
  date: Date;
  value: number;
  label: string;
  index: number;
}

interface CurrentPLStats {
  currentValue: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

type TimeRange = 'today' | '7d' | '1m' | '3m' | '1y' | 'all';

interface PLChartProps {
  trades: Trade[];
  selectedDate: Date;
  plTimeRange?: TimeRange;
  setPLTimeRange?: (range: TimeRange) => void;
  title?: string;
  showTimeRangeSelector?: boolean;
}

// Simple date conversion that always works
const convertToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  
  try {
    if (timestamp instanceof Date) {
      return isNaN(timestamp.getTime()) ? null : timestamp;
    }
    
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

// Simple date formatting without external dependencies
const formatDate = (date: Date, isToday: boolean = false): string => {
  try {
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Invalid';
  }
};

export const PLChart: React.FC<PLChartProps> = ({
  trades,
  selectedDate,
  plTimeRange = '1m',
  setPLTimeRange,
  title = 'P&L Performance',
  showTimeRangeSelector = true
}) => {
  const [localTimeRange, setLocalTimeRange] = useState<TimeRange>(plTimeRange);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [mounted, setMounted] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const currentTimeRange = setPLTimeRange ? plTimeRange : localTimeRange;
  const setCurrentTimeRange = setPLTimeRange ? setPLTimeRange : setLocalTimeRange;

  // Mount detection
  useEffect(() => {
    setMounted(true);
  }, []);

  // Simple dimension update
  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    const updateSize = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const width = Math.max(300, rect.width - 48);
      const height = window.innerWidth < 768 ? 250 : 400;
      
      setDimensions({ width, height });
    };

    updateSize();
    
    let timeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(updateSize, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [mounted]);

  // Process trades safely
  const processedTrades = useMemo(() => {
    if (!Array.isArray(trades)) return [];
    
    return trades
      .filter(trade => {
        if (!trade || typeof trade.realizedPL !== 'number') return false;
        return convertToDate(trade.timestamp) !== null;
      })
      .sort((a, b) => {
        const dateA = convertToDate(a.timestamp);
        const dateB = convertToDate(b.timestamp);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });
  }, [trades]);

  // Generate chart data
  const chartData = useMemo((): PLChartDataPoint[] => {
    if (processedTrades.length === 0) return [];

    try {
      // Determine start date based on time range
      const now = new Date();
      let startDate: Date;

      switch (currentTimeRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '1m':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '3m':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // 'all'
          const firstTrade = processedTrades[0];
          startDate = convertToDate(firstTrade?.timestamp) || new Date();
      }

      // Filter trades by date range
      const filteredTrades = processedTrades.filter(trade => {
        const tradeDate = convertToDate(trade.timestamp);
        return tradeDate && tradeDate >= startDate;
      });

      if (filteredTrades.length === 0) {
        return [{
          date: startDate,
          value: 0,
          label: formatCurrency(0),
          index: 0
        }];
      }

      const points: PLChartDataPoint[] = [];
      let cumulativePL = 0;

      // Add starting point
      points.push({
        date: startDate,
        value: 0,
        label: formatCurrency(0),
        index: 0
      });

      // Add each trade point
      filteredTrades.forEach((trade, index) => {
        cumulativePL += trade.realizedPL;
        const tradeDate = convertToDate(trade.timestamp);
        
        if (tradeDate) {
          points.push({
            date: tradeDate,
            value: cumulativePL,
            label: formatCurrency(cumulativePL),
            index: index + 1
          });
        }
      });

      return points;
    } catch (error) {
      console.error('Error generating chart data:', error);
      return [];
    }
  }, [processedTrades, currentTimeRange]);

  // Calculate statistics
  const stats = useMemo((): CurrentPLStats => {
    if (chartData.length === 0) {
      return { currentValue: 0, change: 0, changePercent: 0, isPositive: true };
    }

    const current = chartData[chartData.length - 1]?.value || 0;
    const start = chartData[0]?.value || 0;
    const change = current - start;
    const changePercent = start !== 0 ? (change / Math.abs(start)) * 100 : (current !== 0 ? 100 : 0);

    return {
      currentValue: current,
      change,
      changePercent,
      isPositive: change >= 0
    };
  }, [chartData]);

  // Chart layout calculations
  const layout = useMemo(() => {
    if (chartData.length === 0) return null;

    const values = chartData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = Math.max(maxValue - minValue, 1);
    const padding = range * 0.1;

    const isMobile = window.innerWidth < 768;
    const chartPadding = {
      top: 20,
      right: isMobile ? 20 : 60,
      bottom: isMobile ? 30 : 50,
      left: isMobile ? 60 : 80
    };

    const chartWidth = Math.max(200, dimensions.width - chartPadding.left - chartPadding.right);
    const chartHeight = Math.max(150, dimensions.height - chartPadding.top - chartPadding.bottom);

    return {
      minValue,
      maxValue,
      range,
      padding,
      chartPadding,
      chartWidth,
      chartHeight
    };
  }, [chartData, dimensions]);

  // Position calculations - FIXED
  const getX = useCallback((index: number): number => {
    if (!layout) return 0;
    if (chartData.length <= 1) return layout.chartWidth / 2;
    return (index / (chartData.length - 1)) * layout.chartWidth;
  }, [layout, chartData.length]);

  const getY = useCallback((value: number): number => {
    if (!layout) return 0;
    const { chartHeight, minValue, padding, range } = layout;
    const adjustedMin = minValue - padding;
    const adjustedRange = range + 2 * padding;
    return chartHeight - ((value - adjustedMin) / adjustedRange) * chartHeight;
  }, [layout]);

  // Build line path
  const linePath = useMemo(() => {
    if (!layout || chartData.length < 2) return '';
    
    const points = chartData.map((_, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(chartData[i].value)}`);
    return points.join(' ');
  }, [chartData, getX, getY, layout]);

  // Build area path
  const areaPath = useMemo(() => {
    if (!layout || chartData.length < 2) return '';
    
    const zeroY = Math.max(0, Math.min(layout.chartHeight, getY(0)));
    return `${linePath} L ${getX(chartData.length - 1)} ${zeroY} L ${getX(0)} ${zeroY} Z`;
  }, [linePath, layout, chartData.length, getX, getY]);

  // Mouse handlers
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!layout || !chartRef.current) return;

    const rect = chartRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - layout.chartPadding.left;
    const relativeX = Math.max(0, Math.min(1, x / layout.chartWidth));
    const pointIndex = Math.round(relativeX * (chartData.length - 1));
    const clampedIndex = Math.max(0, Math.min(chartData.length - 1, pointIndex));
    
    setHoveredPoint(clampedIndex);
  }, [layout, chartData.length]);

  const timeRangeOptions = [
    { key: 'today', label: '1D' },
    { key: '7d', label: '7D' },
    { key: '1m', label: '1M' },
    { key: '3m', label: '3M' },
    { key: '1y', label: '1Y' },
    { key: 'all', label: 'All' },
  ] as const;

  const getTimeRangeLabel = () => {
    const labels = {
      'all': 'All time',
      'today': 'Today',
      '7d': 'Past 7 days',
      '1m': 'Past month',
      '3m': 'Past 3 months',
      '1y': 'Past year'
    };
    return labels[currentTimeRange] || '';
  };

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <BarChart3 className="h-8 w-8 opacity-60 animate-pulse" />
        </div>
      </div>
    );
  }

  // No data state
  if (chartData.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center space-y-4">
            <BarChart3 className="h-16 w-16 mx-auto opacity-60" />
            <div>
              <p className="text-lg font-medium">No trading data available</p>
              <p className="text-sm opacity-75 mt-1">Start trading to see your P&L chart</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <p>Loading chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 dark:from-gray-800 dark:via-blue-900/20 dark:to-gray-800 px-6 py-8 border-b border-gray-200 dark:border-gray-700">
        <div className="text-center space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-3">
              <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
                {formatCurrency(stats.currentValue)}
              </div>
            </div>
            <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-semibold shadow-lg transition-all duration-300 ${
              stats.isPositive 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shadow-emerald-200/50' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shadow-red-200/50'
            }`}>
              {stats.isPositive ? (
                <TrendingUp className="h-6 w-6 mr-3" />
              ) : (
                <TrendingDown className="h-6 w-6 mr-3" />
              )}
              <span className="flex items-center space-x-2">
                <span>{stats.isPositive ? '+' : ''}{formatCurrency(stats.change)}</span>
                <span className="opacity-75">
                  ({stats.isPositive ? '+' : ''}{stats.changePercent.toFixed(2)}%)
                </span>
              </span>
            </div>
          </div>
          
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
                  onClick={() => setCurrentTimeRange(key)}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    currentTimeRange === key
                      ? 'bg-blue-600 text-white shadow-lg scale-105 shadow-blue-200/50'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="p-6" ref={containerRef}>
        <div 
          ref={chartRef}
          className="relative rounded-xl bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-900 border border-gray-100 dark:border-gray-700 overflow-hidden cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsMouseOver(true)}
          onMouseLeave={() => {
            setIsMouseOver(false);
            setHoveredPoint(null);
          }}
        >
          <svg width={dimensions.width} height={dimensions.height} className="w-full h-full">
            <defs>
              <linearGradient id="positiveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(16, 185, 129, 0.4)" />
                <stop offset="100%" stopColor="rgba(16, 185, 129, 0.02)" />
              </linearGradient>
              <linearGradient id="negativeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0.02)" />
              </linearGradient>
            </defs>

            <g transform={`translate(${layout.chartPadding.left}, ${layout.chartPadding.top})`}>
              {/* Grid lines and Y-axis labels */}
              {Array.from({ length: 6 }).map((_, i) => {
                const y = (layout.chartHeight / 5) * i;
                const value = (layout.minValue - layout.padding) + 
                  ((layout.range + 2 * layout.padding) / 5) * (5 - i);
                return (
                  <g key={i} opacity={0.3}>
                    <line 
                      x1={0} 
                      y1={y} 
                      x2={layout.chartWidth} 
                      y2={y} 
                      stroke="currentColor" 
                      strokeWidth={0.5}
                      className="text-gray-300 dark:text-gray-600"
                    />
                    <text
                      x={-15}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-gray-500 dark:fill-gray-400 text-xs font-mono"
                    >
                      {formatCurrency(value)}
                    </text>
                  </g>
                );
              })}

              {/* Zero line */}
              {layout.minValue < 0 && layout.maxValue > 0 && (
                <line
                  x1={0}
                  y1={getY(0)}
                  x2={layout.chartWidth}
                  y2={getY(0)}
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                  className="text-gray-400 dark:text-gray-500"
                />
              )}

              {/* Area fill */}
              {chartData.length > 1 && areaPath && (
                <path
                  d={areaPath}
                  fill={`url(#${stats.isPositive ? 'positive' : 'negative'}Gradient)`}
                />
              )}

              {/* Main line */}
              {chartData.length > 1 && linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={stats.isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {chartData.map((point, i) => {
                const isHovered = hoveredPoint === i;
                const shouldShow = chartData.length <= 20 || isHovered || i === 0 || i === chartData.length - 1;
                
                if (!shouldShow) return null;
                
                return (
                  <circle
                    key={i}
                    cx={getX(i)}
                    cy={getY(point.value)}
                    r={isHovered ? 6 : 3}
                    fill="white"
                    stroke={stats.isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}
                    strokeWidth={isHovered ? 3 : 2}
                    className="transition-all duration-200 drop-shadow-sm"
                    style={{
                      filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' : undefined
                    }}
                  />
                );
              })}

              {/* Hover tooltip */}
              {isMouseOver && hoveredPoint !== null && hoveredPoint < chartData.length && (
                <g>
                  {/* Crosshair lines */}
                  <line
                    x1={getX(hoveredPoint)}
                    y1={0}
                    x2={getX(hoveredPoint)}
                    y2={layout.chartHeight}
                    stroke="rgb(99, 102, 241)"
                    strokeWidth={1}
                    strokeDasharray="2,2"
                    opacity={0.5}
                  />
                  <line
                    x1={0}
                    y1={getY(chartData[hoveredPoint].value)}
                    x2={layout.chartWidth}
                    y2={getY(chartData[hoveredPoint].value)}
                    stroke="rgb(99, 102, 241)"
                    strokeWidth={1}
                    strokeDasharray="2,2"
                    opacity={0.5}
                  />
                  
                  {/* Tooltip */}
                  <foreignObject 
                    x={Math.max(10, Math.min(layout.chartWidth - 140, getX(hoveredPoint) - 70))} 
                    y={Math.max(10, getY(chartData[hoveredPoint].value) - 55)} 
                    width={140} 
                    height={45}
                  >
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 text-xs">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(chartData[hoveredPoint].value)}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 mt-1">
                        {formatDate(chartData[hoveredPoint].date, currentTimeRange === 'today')}
                      </div>
                    </div>
                  </foreignObject>
                </g>
              )}

              {/* X-axis labels */}
              <g transform={`translate(0, ${layout.chartHeight + 20})`}>
                {chartData.length <= 10 ? (
                  // Show all points for small datasets
                  chartData.map((point, i) => (
                    <text
                      key={i}
                      x={getX(i)}
                      y={0}
                      textAnchor="middle"
                      className="fill-gray-500 dark:fill-gray-400 text-xs"
                    >
                      {formatDate(point.date, currentTimeRange === 'today')}
                    </text>
                  ))
                ) : (
                  // Show only key points for larger datasets
                  [0, Math.floor(chartData.length / 2), chartData.length - 1].map(i => (
                    <text
                      key={i}
                      x={getX(i)}
                      y={0}
                      textAnchor="middle"
                      className="fill-gray-500 dark:fill-gray-400 text-xs"
                    >
                      {formatDate(chartData[i].date, currentTimeRange === 'today')}
                    </text>
                  ))
                )}
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};