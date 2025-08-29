// PLChart.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  LineChart,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { formatCurrency } from '../utils/tradeUtils';
import { format, startOfDay, subDays, subMonths, subYears } from 'date-fns';

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
  plChartData: PLChartDataPoint[];
  currentPLStats: CurrentPLStats;
  plTimeRange: TimeRange;
  setPLTimeRange: (range: TimeRange) => void;
}

export const PLChart: React.FC<PLChartProps> = ({
  plChartData,
  currentPLStats,
  plTimeRange,
  setPLTimeRange
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(320, rect.width - 48), // Account for padding
          height: 300
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (plChartData.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto">
              <LineChart className="h-8 w-8 opacity-60" />
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

  // Compute chart dimensions and scales
  const chartPadding = { top: 20, right: 50, bottom: 40, left: 60 };
  const chartWidth = dimensions.width - chartPadding.left - chartPadding.right;
  const chartHeight = dimensions.height - chartPadding.top - chartPadding.bottom;

  const values = plChartData.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const padding = valueRange * 0.1; // 10% padding

  // Helpers to map data -> pixels
  const xAt = (i: number) =>
    plChartData.length === 1 ? chartWidth / 2 : (i / (plChartData.length - 1)) * chartWidth;
  const yAt = (v: number) => 
    chartHeight - ((v - (minValue - padding)) / (valueRange + 2 * padding)) * chartHeight;

  // Build smooth curve path using quadratic bezier curves
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

  // Build filled area path
  const buildAreaPath = () => {
    if (plChartData.length < 2) return '';
    
    const linePath = buildSmoothPath();
    const zeroY = yAt(0);
    
    return `${linePath} L ${xAt(plChartData.length - 1)} ${zeroY} L ${xAt(0)} ${zeroY} Z`;
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
    switch (plTimeRange) {
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
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 px-6 py-8 border-b border-gray-200 dark:border-gray-600">
        <div className="text-center space-y-4">
          {/* Main Value */}
          <div className="space-y-2">
            <div className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
              {formatCurrency(currentPLStats.currentValue)}
            </div>
            <div
              className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold ${
                currentPLStats.isPositive 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {currentPLStats.isPositive ? (
                <TrendingUp className="h-5 w-5 mr-2" />
              ) : (
                <TrendingDown className="h-5 w-5 mr-2" />
              )}
              {currentPLStats.isPositive ? '+' : ''}{formatCurrency(currentPLStats.change)} 
              <span className="ml-1">
                ({currentPLStats.isPositive ? '+' : ''}{currentPLStats.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          
          {/* Period Label */}
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            {getTimeRangeLabel()}
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
        <div className="flex justify-center">
          <div className="inline-flex bg-white dark:bg-gray-700 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-600">
            {timeRangeOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPLTimeRange(key as TimeRange)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  plTimeRange === key
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-6" ref={containerRef}>
        <div className="relative">
          <svg
            width={dimensions.width}
            height={dimensions.height}
            className="w-full"
            style={{ background: 'transparent' }}
          >
            {/* Gradient Definitions */}
            <defs>
              <linearGradient id="positiveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(34, 197, 94, 0.3)" />
                <stop offset="100%" stopColor="rgba(34, 197, 94, 0.05)" />
              </linearGradient>
              <linearGradient id="negativeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.3)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0.05)" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <g transform={`translate(${chartPadding.left}, ${chartPadding.top})`}>
              {/* Grid lines */}
              {Array.from({ length: 5 }).map((_, i) => {
                const y = (chartHeight / 4) * i;
                const value = (minValue - padding) + ((valueRange + 2 * padding) / 4) * (4 - i);
                return (
                  <g key={i} opacity={0.3}>
                    <line 
                      x1={0} 
                      y1={y} 
                      x2={chartWidth} 
                      y2={y} 
                      stroke="currentColor" 
                      strokeWidth={1}
                      strokeDasharray="2,4"
                      className="text-gray-300 dark:text-gray-600"
                    />
                    <text
                      x={-10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-gray-500 dark:fill-gray-400 text-xs font-mono"
                    >
                      {formatCurrency(value)}
                    </text>
                  </g>
                );
              })}

              {/* Zero line if needed */}
              {minValue < 0 && maxValue > 0 && (
                <line
                  x1={0}
                  y1={yAt(0)}
                  x2={chartWidth}
                  y2={yAt(0)}
                  stroke="currentColor"
                  strokeWidth={2}
                  className="text-gray-400 dark:text-gray-500"
                />
              )}

              {/* Fill area */}
              {plChartData.length > 1 && (
                <path
                  d={buildAreaPath()}
                  fill={`url(#${currentPLStats.isPositive ? 'positive' : 'negative'}Gradient)`}
                />
              )}

              {/* Main line */}
              {plChartData.length > 1 && (
                <path
                  d={buildSmoothPath()}
                  fill="none"
                  stroke={currentPLStats.isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                  strokeWidth={3}
                  filter="url(#glow)"
                  className="drop-shadow-sm"
                />
              )}

              {/* Data points */}
              {plChartData.map((point, i) => {
                const cx = xAt(i);
                const cy = yAt(point.value);
                const isHovered = hoveredPoint === i;
                
                return (
                  <g key={i}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 6 : 4}
                      fill="white"
                      stroke={currentPLStats.isPositive ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                      strokeWidth={3}
                      className="cursor-pointer transition-all duration-200 drop-shadow-md"
                      onMouseEnter={() => setHoveredPoint(i)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      filter={isHovered ? "url(#glow)" : undefined}
                    />
                    
                    {/* Tooltip */}
                    {isHovered && (
                      <g>
                        <foreignObject x={cx - 60} y={cy - 60} width={120} height={50}>
                          <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-2 rounded-lg shadow-lg text-xs font-medium text-center">
                            <div className="font-semibold">{formatCurrency(point.value)}</div>
                            <div className="opacity-75">{format(point.date, 'MMM d, yyyy')}</div>
                          </div>
                        </foreignObject>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* X-axis labels */}
              {plChartData.length > 1 && (
                <g transform={`translate(0, ${chartHeight + 20})`}>
                  {plChartData
                    .filter((_, i) => i === 0 || i === plChartData.length - 1 || i % Math.ceil(plChartData.length / 4) === 0)
                    .map((point, _, filtered) => {
                      const originalIndex = plChartData.indexOf(point);
                      return (
                        <text
                          key={originalIndex}
                          x={xAt(originalIndex)}
                          y={0}
                          textAnchor="middle"
                          className="fill-gray-500 dark:fill-gray-400 text-xs font-medium"
                        >
                          {format(point.date, plTimeRange === 'today' ? 'HH:mm' : 'MMM d')}
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