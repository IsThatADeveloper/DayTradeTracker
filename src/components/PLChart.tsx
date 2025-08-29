import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity
} from 'lucide-react';
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';
import { format } from 'date-fns';

interface PLChartDataPoint {
  date: Date;
  value: number;
  label: string;
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const currentTimeRange = setPLTimeRange ? plTimeRange : localTimeRange;
  const setCurrentTimeRange = setPLTimeRange ? setPLTimeRange : setLocalTimeRange;

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(320, rect.width - 48),
          height: window.innerWidth < 768 ? 250 : 400
        });
      }
    };

    updateDimensions();
    const handleResize = () => {
      requestAnimationFrame(updateDimensions);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate P&L chart data based on actual trades
  const plChartData = useMemo((): PLChartDataPoint[] => {
    if (trades.length === 0) return [];

    const sortedTrades = [...trades].sort((a, b) => {
      const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return aTime - bTime;
    });

    const now = new Date();
    let startDate: Date;
    let filteredTrades: Trade[];

    // Determine date range
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
      default:
        startDate = sortedTrades[0]?.timestamp instanceof Date ? 
          sortedTrades[0].timestamp : 
          new Date(sortedTrades[0]?.timestamp || now);
    }

    // Filter trades by date range
    filteredTrades = sortedTrades.filter(trade => {
      const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
      return tradeDate >= startDate;
    });

    if (filteredTrades.length === 0) return [];

    // Create data points showing cumulative P&L
    const dataPoints: PLChartDataPoint[] = [];
    let runningPL = 0;

    // Add starting point at $0
    dataPoints.push({
      date: startDate,
      value: 0,
      label: formatCurrency(0),
    });

    // Add each trade's cumulative P&L
    filteredTrades.forEach((trade) => {
      runningPL += trade.realizedPL;
      const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
      dataPoints.push({
        date: tradeDate,
        value: runningPL,
        label: formatCurrency(runningPL),
      });
    });

    return dataPoints;
  }, [trades, currentTimeRange]);

  // Calculate current stats
  const currentPLStats = useMemo((): CurrentPLStats => {
    if (plChartData.length === 0) return { currentValue: 0, change: 0, changePercent: 0, isPositive: true };
    
    const current = plChartData[plChartData.length - 1].value;
    const previous = plChartData.length > 1 ? plChartData[0].value : 0;
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / Math.abs(previous)) * 100 : (current !== 0 ? 100 : 0);
    
    return {
      currentValue: current,
      change,
      changePercent,
      isPositive: change >= 0
    };
  }, [plChartData]);

  if (plChartData.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto">
              <BarChart3 className="h-8 w-8 opacity-60" />
            </div>
            <div>
              <p className="text-lg font-medium">No trading data available</p>
              <p className="text-sm opacity-75 mt-1">Start trading to see your P&L chart</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chart dimensions and calculations
  const chartPadding = { 
    top: 20, 
    right: window.innerWidth < 768 ? 20 : 60, 
    bottom: window.innerWidth < 768 ? 30 : 50, 
    left: window.innerWidth < 768 ? 50 : 80 
  };
  const chartWidth = dimensions.width - chartPadding.left - chartPadding.right;
  const chartHeight = dimensions.height - chartPadding.top - chartPadding.bottom;

  const values = plChartData.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const padding = valueRange * 0.1;

  // Helper functions
  const xAt = (i: number) => plChartData.length === 1 ? chartWidth / 2 : (i / (plChartData.length - 1)) * chartWidth;
  const yAt = (v: number) => chartHeight - ((v - (minValue - padding)) / (valueRange + 2 * padding)) * chartHeight;

  // Find closest point to mouse position
  const findClosestPoint = (mouseX: number) => {
    if (plChartData.length === 0) return null;
    
    const relativeX = mouseX - chartPadding.left;
    const pointIndex = Math.round((relativeX / chartWidth) * (plChartData.length - 1));
    return Math.max(0, Math.min(plChartData.length - 1, pointIndex));
  };

  // Build smooth path
  const buildSmoothPath = () => {
    if (plChartData.length < 2) return '';
    
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
  };

  // Build area path
  const buildAreaPath = () => {
    if (plChartData.length < 2) return '';
    
    const linePath = buildSmoothPath();
    const zeroY = Math.min(Math.max(yAt(0), 0), chartHeight);
    
    return `${linePath} L ${xAt(plChartData.length - 1)} ${zeroY} L ${xAt(0)} ${zeroY} Z`;
  };

  // Handle mouse movement
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!chartRef.current) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setMousePosition({ x, y });
    
    const closestPointIndex = findClosestPoint(x);
    setHoveredPoint(closestPointIndex);
  };

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
      case 'today': return 'Today';
      case '7d': return 'Past 7 days';
      case '1m': return 'Past month';
      case '3m': return 'Past 3 months';
      case '1y': return 'Past year';
      default: return '';
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 dark:from-gray-800 dark:via-blue-900/20 dark:to-gray-800 px-6 py-8 border-b border-gray-200 dark:border-gray-700">
        <div className="text-center space-y-4">
          {/* Main Value */}
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-3">
              <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
                {formatCurrency(currentPLStats.currentValue)}
              </div>
            </div>
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
          className="relative rounded-xl bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-900 border border-gray-100 dark:border-gray-700 overflow-hidden"
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
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
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
              {isMouseOver && hoveredPoint !== null && (
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
                const isVisible = plChartData.length < 100 || isHovered || i % Math.ceil(plChartData.length / 20) === 0;
                
                if (!isVisible && !isHovered) return null;
                
                return (
                  <g key={i}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 8 : 4}
                      fill="white"
                      stroke={currentPLStats.isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'}
                      strokeWidth={isHovered ? 4 : 2}
                      className={`cursor-pointer transition-all duration-300 ${isHovered ? 'drop-shadow-lg' : 'drop-shadow-md'}`}
                      filter={isHovered ? "url(#shadow)" : undefined}
                      style={{ 
                        transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                        transformOrigin: 'center'
                      }}
                    />
                  </g>
                );
              })}

              {/* Enhanced tooltip */}
              {isMouseOver && hoveredPoint !== null && (
                <g>
                  <foreignObject 
                    x={Math.max(10, Math.min(chartWidth - 160, xAt(hoveredPoint) - 80))} 
                    y={Math.max(10, yAt(plChartData[hoveredPoint].value) - 80)} 
                    width={160} 
                    height={70}
                  >
                    <div className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-600 rounded-lg shadow-xl p-3 text-sm font-medium transform transition-all duration-200 hover:scale-105">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Value</span>
                        <span className={`font-bold ${currentPLStats.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(plChartData[hoveredPoint].value)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Date</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {format(plChartData[hoveredPoint].date, currentTimeRange === 'today' ? 'HH:mm' : 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </foreignObject>
                </g>
              )}

              {/* X-axis labels */}
              {plChartData.length > 1 && (
                <g transform={`translate(0, ${chartHeight + 20})`}>
                  {plChartData
                    .filter((_, i) => {
                      const maxLabels = window.innerWidth < 768 ? 3 : 6;
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
                          {format(point.date, currentTimeRange === 'today' ? 'HH:mm' : 'MMM d')}
                        </text>
                      );
                    })}
                </g>
              )}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};