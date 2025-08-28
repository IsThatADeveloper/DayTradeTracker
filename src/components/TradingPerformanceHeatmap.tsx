import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Filter, Target, DollarSign, Settings, Clock } from 'lucide-react';

// Your existing Trade type (imported from '../types/trade')
interface Trade {
  id: string;
  ticker: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  timestamp: Date;
  direction: 'long' | 'short';
  realizedPL: number;
  notes?: string | null;
  updateCount?: number;
  lastUpdated?: Date;
}

interface TradingHeatmapProps {
  trades: Trade[];
}

interface StockPerformance {
  ticker: string;
  totalPL: number;
  trades: number;
  winRate: number;
  avgPLPerTrade: number;
  absValue: number;
  isWinner: boolean;
  bestTrade: number;
  worstTrade: number;
  lastTraded: Date;
  displaySize: number;
}

interface TimePerformance {
  hour: number;
  timeLabel: string;
  totalPL: number;
  trades: number;
  winRate: number;
  avgPLPerTrade: number;
  isWinner: boolean;
  absValue: number;
}

interface TreemapNode {
  ticker: string;
  totalPL: number;
  trades: number;
  winRate: number;
  isWinner: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
}

const TradingPerformanceHeatmap: React.FC<TradingHeatmapProps> = ({ trades }) => {
  const [minTrades, setMinTrades] = useState(3);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', '30d', '90d', '1y'
  const [sortBy, setSortBy] = useState('totalPL'); // 'totalPL', 'trades', 'winRate'
  const [visualMode, setVisualMode] = useState<'grid' | 'bars'>('grid');
  const [barChartMode, setBarChartMode] = useState<'stocks' | 'timeOfDay'>('timeOfDay');

  // Process trades data for stocks
  const stockPerformance = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    // Filter by time period
    let filteredTrades = trades;
    if (timeFilter !== 'all') {
      const now = new Date();
      const daysBack = timeFilter === '30d' ? 30 : timeFilter === '90d' ? 90 : 365;
      const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      filteredTrades = trades.filter(trade => {
        const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
        return tradeDate >= cutoffDate;
      });
    }

    // Group by ticker
    const stockMap = new Map<string, {
      totalPL: number;
      trades: Trade[];
      wins: number;
      losses: number;
    }>();

    filteredTrades.forEach(trade => {
      const ticker = trade.ticker.toUpperCase();
      const existing = stockMap.get(ticker) || { totalPL: 0, trades: [], wins: 0, losses: 0 };
      
      existing.totalPL += trade.realizedPL;
      existing.trades.push(trade);
      if (trade.realizedPL > 0) existing.wins++;
      else if (trade.realizedPL < 0) existing.losses++;
      
      stockMap.set(ticker, existing);
    });

    // Convert to array and calculate metrics
    const stockArray: StockPerformance[] = Array.from(stockMap.entries())
      .map(([ticker, data]) => {
        const winRate = data.trades.length > 0 ? (data.wins / data.trades.length) * 100 : 0;
        const avgPLPerTrade = data.trades.length > 0 ? data.totalPL / data.trades.length : 0;
        const bestTrade = Math.max(...data.trades.map(t => t.realizedPL));
        const worstTrade = Math.min(...data.trades.map(t => t.realizedPL));
        const lastTraded = new Date(Math.max(...data.trades.map(t => 
          t.timestamp instanceof Date ? t.timestamp.getTime() : new Date(t.timestamp).getTime()
        )));

        // Better size calculation combining P&L magnitude and trade volume
        const plWeight = Math.abs(data.totalPL);
        const tradeWeight = data.trades.length * 50;
        const displaySize = plWeight + tradeWeight;

        return {
          ticker,
          totalPL: data.totalPL,
          trades: data.trades.length,
          winRate: Math.round(winRate),
          avgPLPerTrade: Math.round(avgPLPerTrade),
          absValue: Math.abs(data.totalPL),
          isWinner: data.totalPL > 0,
          bestTrade,
          worstTrade,
          lastTraded,
          displaySize
        };
      })
      .filter(stock => stock.trades >= minTrades)
      .sort((a, b) => {
        switch (sortBy) {
          case 'trades': return b.trades - a.trades;
          case 'winRate': return b.winRate - a.winRate;
          default: return b.totalPL - a.totalPL;
        }
      });

    return stockArray;
  }, [trades, minTrades, timeFilter, sortBy]);

  // Process trades data by time of day
  const timePerformance = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    // Filter by time period (same as stock performance)
    let filteredTrades = trades;
    if (timeFilter !== 'all') {
      const now = new Date();
      const daysBack = timeFilter === '30d' ? 30 : timeFilter === '90d' ? 90 : 365;
      const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      filteredTrades = trades.filter(trade => {
        const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
        return tradeDate >= cutoffDate;
      });
    }

    // Group by hour (market hours focus: 9:30 AM - 4:00 PM ET)
    const hourMap = new Map<number, {
      totalPL: number;
      trades: Trade[];
      wins: number;
      losses: number;
    }>();

    filteredTrades.forEach(trade => {
      const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
      const hour = tradeDate.getHours();
      const existing = hourMap.get(hour) || { totalPL: 0, trades: [], wins: 0, losses: 0 };
      
      existing.totalPL += trade.realizedPL;
      existing.trades.push(trade);
      if (trade.realizedPL > 0) existing.wins++;
      else if (trade.realizedPL < 0) existing.losses++;
      
      hourMap.set(hour, existing);
    });

    // Convert to array for ALL hours that have trades
    const timeArray: TimePerformance[] = [];
    
    // Get all hours that actually have trades and sort them
    const hoursWithTrades = Array.from(hourMap.keys()).sort((a, b) => a - b);
    
    hoursWithTrades.forEach(hour => {
      const data = hourMap.get(hour);
      if (data && data.trades.length > 0) {
        const winRate = (data.wins / data.trades.length) * 100;
        const avgPLPerTrade = data.totalPL / data.trades.length;
        
        // Format time labels for all hours
        let timeLabel: string;
        if (hour === 0) timeLabel = '12:00-1:00 AM';
        else if (hour < 12) timeLabel = `${hour}:00-${hour + 1}:00 AM`;
        else if (hour === 12) timeLabel = '12:00-1:00 PM';
        else timeLabel = `${hour - 12}:00-${hour - 11}:00 PM`;
        
        // Special market hour labels
        if (hour === 9) timeLabel = '9:30-10:00 AM (Market Open)';
        else if (hour === 16) timeLabel = '3:30-4:00 PM (Market Close)';
        else if (hour === 4) timeLabel = '4:00-5:00 AM (Pre-market)';
        else if (hour === 20) timeLabel = '8:00-9:00 PM (After Hours)';
        
        timeArray.push({
          hour,
          timeLabel,
          totalPL: data.totalPL,
          trades: data.trades.length,
          winRate: Math.round(winRate),
          avgPLPerTrade: Math.round(avgPLPerTrade),
          isWinner: data.totalPL > 0,
          absValue: Math.abs(data.totalPL)
        });
      }
    });

    return timeArray.sort((a, b) => a.hour - b.hour);
  }, [trades, timeFilter]);

  // MOBILE-RESPONSIVE: Proper treemap layout algorithm with responsive sizing
  const calculateTreemapLayout = (data: StockPerformance[], containerWidth = 320, containerHeight = 240): TreemapNode[] => {
    if (data.length === 0) return [];

    // Mobile-responsive container sizing
    const isMobile = window.innerWidth < 768;
    const actualWidth = isMobile ? Math.min(containerWidth, window.innerWidth - 32) : containerWidth;
    const actualHeight = isMobile ? Math.min(containerHeight, 300) : containerHeight;

    // Sort by display size (largest first)
    const sortedData = [...data].sort((a, b) => b.displaySize - a.displaySize);
    
    // Calculate total area
    const totalArea = sortedData.reduce((sum, item) => sum + item.displaySize, 0);
    const targetArea = actualWidth * actualHeight;
    
    // Scale factor to fit container
    const scale = targetArea / totalArea;
    
    // Squarified treemap algorithm
    const rectangles: TreemapNode[] = [];
    let currentRow: StockPerformance[] = [];
    let x = 0;
    let y = 0;
    let rowWidth = actualWidth;
    let rowHeight = 0;
    
    const layoutRow = (items: StockPerformance[], width: number, height: number, startX: number, startY: number) => {
      const totalItemArea = items.reduce((sum, item) => sum + item.displaySize * scale, 0);
      let currentX = startX;
      
      items.forEach((item) => {
        const itemArea = item.displaySize * scale;
        const itemWidth = (itemArea / totalItemArea) * width;
        const itemHeight = height;
        
        rectangles.push({
          ticker: item.ticker,
          totalPL: item.totalPL,
          trades: item.trades,
          winRate: item.winRate,
          isWinner: item.isWinner,
          area: itemArea,
          x: currentX,
          y: startY,
          width: itemWidth,
          height: itemHeight
        });
        
        currentX += itemWidth;
      });
    };
    
    const calculateAspectRatio = (items: StockPerformance[], width: number): number => {
      if (items.length === 0) return Infinity;
      
      const totalArea = items.reduce((sum, item) => sum + item.displaySize * scale, 0);
      const height = totalArea / width;
      
      const minArea = Math.min(...items.map(item => item.displaySize * scale));
      const maxArea = Math.max(...items.map(item => item.displaySize * scale));
      
      const minAspect = Math.min((width * width * minArea) / (height * height * totalArea * totalArea), 
                                 (height * height * totalArea * totalArea) / (width * width * minArea));
      const maxAspect = Math.min((width * width * maxArea) / (height * height * totalArea * totalArea),
                                 (height * height * totalArea * totalArea) / (width * width * maxArea));
      
      return Math.min(minAspect, maxAspect);
    };
    
    for (let i = 0; i < sortedData.length; i++) {
      const item = sortedData[i];
      currentRow.push(item);
      
      const currentAspect = calculateAspectRatio(currentRow, rowWidth);
      const nextItem = sortedData[i + 1];
      
      if (nextItem) {
        const nextRowWithItem = [...currentRow, nextItem];
        const nextAspect = calculateAspectRatio(nextRowWithItem, rowWidth);
        
        if (nextAspect < currentAspect) {
          continue; // Add next item to current row
        }
      }
      
      // Layout current row
      const totalRowArea = currentRow.reduce((sum, item) => sum + item.displaySize * scale, 0);
      rowHeight = totalRowArea / rowWidth;
      
      layoutRow(currentRow, rowWidth, rowHeight, x, y);
      
      // Move to next row
      y += rowHeight;
      currentRow = [];
      
      // Adjust remaining space
      const remainingHeight = actualHeight - y;
      if (remainingHeight > 0 && i < sortedData.length - 1) {
        rowWidth = actualWidth;
      }
    }
    
    return rectangles;
  };

  // MOBILE-RESPONSIVE: Calculate treemap with responsive dimensions
  const treemapLayout = useMemo(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      const width = isMobile ? window.innerWidth - 64 : 1200;
      const height = isMobile ? 250 : 500;
      return calculateTreemapLayout(stockPerformance, width, height);
    }
    return calculateTreemapLayout(stockPerformance);
  }, [stockPerformance]);

  // Professional color scheme
  const getStockStyle = (stock: StockPerformance | TreemapNode) => {
    const maxTrades = Math.max(...stockPerformance.map(s => s.trades));
    const tradeIntensity = Math.min(stock.trades / Math.max(maxTrades, 1), 1);
    
    if (stock.isWinner) {
      const intensity = 0.4 + (0.5 * tradeIntensity);
      return {
        backgroundColor: `rgba(34, 197, 94, ${intensity})`,
        borderColor: `rgba(21, 128, 61, 0.8)`,
        textColor: intensity > 0.6 ? 'white' : 'rgba(21, 128, 61, 1)',
        shadowColor: `rgba(34, 197, 94, 0.3)`
      };
    } else {
      const intensity = 0.4 + (0.5 * tradeIntensity);
      return {
        backgroundColor: `rgba(239, 68, 68, ${intensity})`,
        borderColor: `rgba(153, 27, 27, 0.8)`,
        textColor: intensity > 0.6 ? 'white' : 'rgba(153, 27, 27, 1)',
        shadowColor: `rgba(239, 68, 68, 0.3)`
      };
    }
  };

  const getTimeStyle = (timeData: TimePerformance) => {
    if (timeData.isWinner) {
      return {
        backgroundColor: `rgba(34, 197, 94, 0.7)`,
        borderColor: `rgba(21, 128, 61, 0.8)`,
        textColor: 'white'
      };
    } else {
      return {
        backgroundColor: `rgba(239, 68, 68, 0.7)`,
        borderColor: `rgba(153, 27, 27, 0.8)`,
        textColor: 'white'
      };
    }
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalPL = stockPerformance.reduce((sum, stock) => sum + stock.totalPL, 0);
    const totalTrades = stockPerformance.reduce((sum, stock) => sum + stock.trades, 0);
    const winners = stockPerformance.filter(s => s.isWinner);
    const losers = stockPerformance.filter(s => !s.isWinner);
    const avgWinRate = stockPerformance.length > 0 ? 
      stockPerformance.reduce((sum, s) => sum + s.winRate, 0) / stockPerformance.length : 0;

    return {
      totalPL,
      totalTrades,
      stocksTraded: stockPerformance.length,
      winners: winners.length,
      losers: losers.length,
      avgWinRate: Math.round(avgWinRate),
      bestStock: stockPerformance.length > 0 ? stockPerformance[0] : null,
      worstStock: stockPerformance.length > 0 ? 
        stockPerformance.reduce((worst, stock) => stock.totalPL < worst.totalPL ? stock : worst) : null
    };
  }, [stockPerformance]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // MOBILE-RESPONSIVE: Render stock bar chart
  const renderStockBarChart = () => {
    const maxAbsValue = Math.max(...stockPerformance.map(s => s.absValue));
    
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 sm:p-4">
        <div className="space-y-2 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
          {stockPerformance.map((stock) => {
            const barWidth = maxAbsValue > 0 ? (stock.absValue / maxAbsValue) * 100 : 0;
            const style = getStockStyle(stock);
            
            return (
              <div key={stock.ticker} className="flex items-center space-x-2 sm:space-x-4 p-2">
                <div className="w-8 sm:w-12 text-right">
                  <span className="font-bold text-xs sm:text-sm">{stock.ticker}</span>
                </div>
                
                <div className="flex-1 relative">
                  <div 
                    className="h-6 sm:h-8 rounded flex items-center justify-between px-1 sm:px-2"
                    style={{
                      backgroundColor: style.backgroundColor,
                      borderLeft: `4px solid ${style.borderColor}`,
                      width: `${Math.max(barWidth, 10)}%`,
                      boxShadow: `0 2px 4px ${style.shadowColor}`
                    }}
                  >
                    <span className="text-xs font-medium" style={{ color: style.textColor }}>
                      {stock.trades}
                    </span>
                    <span className="text-xs sm:text-sm font-bold" style={{ color: style.textColor }}>
                      {formatCurrency(stock.totalPL)}
                    </span>
                  </div>
                </div>
                
                <div className="w-10 sm:w-16 text-right">
                  <span className={`text-xs sm:text-sm font-medium ${
                    stock.winRate >= 50 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {stock.winRate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // MOBILE-RESPONSIVE: Render time-based bar chart
  const renderTimeBarChart = () => {
    const maxValue = Math.max(...timePerformance.map(t => Math.abs(t.totalPL)));
    
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 sm:p-4">
        <div className="space-y-2 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
          {timePerformance.map((timeData) => {
            const barWidth = maxValue > 0 ? (Math.abs(timeData.totalPL) / maxValue) * 100 : 0;
            const style = getTimeStyle(timeData);
            
            return (
              <div key={timeData.hour} className="flex items-center space-x-2 sm:space-x-4 p-2">
                <div className="w-16 sm:w-20 text-right">
                  <span className="font-bold text-xs">{timeData.timeLabel}</span>
                </div>
                
                <div className="flex-1 relative">
                  <div 
                    className="h-6 sm:h-8 rounded flex items-center justify-between px-1 sm:px-2"
                    style={{
                      backgroundColor: style.backgroundColor,
                      borderLeft: `4px solid ${style.borderColor}`,
                      width: `${Math.max(barWidth, 10)}%`,
                      boxShadow: `0 2px 4px rgba(0,0,0,0.1)`
                    }}
                  >
                    <span className="text-xs font-medium" style={{ color: style.textColor }}>
                      {timeData.trades}
                    </span>
                    <span className="text-xs sm:text-sm font-bold" style={{ color: style.textColor }}>
                      {formatCurrency(timeData.totalPL)}
                    </span>
                  </div>
                </div>
                
                <div className="w-10 sm:w-16 text-right">
                  <span className={`text-xs sm:text-sm font-medium ${
                    timeData.winRate >= 50 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {timeData.winRate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!trades || trades.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Trading Data Available
          </h3>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            Start trading to see your performance heatmap visualization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* MOBILE-RESPONSIVE: Header with Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                Performance Heatmap
              </h2>
            </div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Visual overview of your trading performance
            </p>
          </div>
          
          {/* MOBILE-RESPONSIVE: Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Time Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="1y">Past Year</option>
                <option value="90d">Past 90 Days</option>
                <option value="30d">Past 30 Days</option>
              </select>
            </div>
            
            {/* Min Trades Filter */}
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <select
                value={minTrades}
                onChange={(e) => setMinTrades(parseInt(e.target.value))}
                className="flex-1 sm:flex-none px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>Min 1 Trade</option>
                <option value={3}>Min 3 Trades</option>
                <option value={5}>Min 5 Trades</option>
                <option value={10}>Min 10 Trades</option>
              </select>
            </div>

            {/* Visualization Mode Toggle - MOBILE-RESPONSIVE */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setVisualMode('grid')}
                className={`px-2 sm:px-3 py-1 text-xs font-medium rounded transition-colors ${
                  visualMode === 'grid'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setVisualMode('bars')}
                className={`px-2 sm:px-3 py-1 text-xs font-medium rounded transition-colors ${
                  visualMode === 'bars'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Bars
              </button>
            </div>

            {/* Bar Chart Mode Toggle - MOBILE-RESPONSIVE */}
            {visualMode === 'bars' && (
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setBarChartMode('stocks')}
                  className={`px-2 sm:px-3 py-1 text-xs font-medium rounded transition-colors ${
                    barChartMode === 'stocks'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Stocks
                </button>
                <button
                  onClick={() => setBarChartMode('timeOfDay')}
                  className={`px-2 sm:px-3 py-1 text-xs font-medium rounded transition-colors ${
                    barChartMode === 'timeOfDay'
                      ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Clock className="h-3 w-3 mr-1 inline" />
                  Time
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE-RESPONSIVE: Summary Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className={`h-4 w-4 ${summaryStats.totalPL >= 0 ? 'text-emerald-600' : 'text-red-500'}`} />
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total P&L</span>
          </div>
          <div className={`text-lg sm:text-xl font-bold ${summaryStats.totalPL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatCurrency(summaryStats.totalPL)}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-blue-500" />
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Stocks</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {summaryStats.stocksTraded}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Trades</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {summaryStats.totalTrades}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Winners</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600">
            {summaryStats.winners}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Losers</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-red-500">
            {summaryStats.losers}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-indigo-500" />
            <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Avg Win Rate</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {summaryStats.avgWinRate}%
          </div>
        </div>
      </div>

      {/* MOBILE-RESPONSIVE: Main Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {visualMode === 'grid' ? 'Stock Performance Treemap' : 
             barChartMode === 'timeOfDay' ? 'Performance by Time of Day' : 'Stock Performance Bars'}
          </h3>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-emerald-400 rounded border border-emerald-600"></div>
              <span>Profitable positions</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-400 rounded border border-red-600"></div>
              <span>Losing positions</span>
            </div>
            <span className="text-xs hidden sm:inline">
              {visualMode === 'grid' 
                ? 'Size = P&L magnitude + trade volume' 
                : barChartMode === 'timeOfDay' 
                  ? 'Bar length = P&L magnitude by hour' 
                  : 'Bar length = P&L magnitude by stock'}
            </span>
          </div>
        </div>

        {stockPerformance.length > 0 ? (
          visualMode === 'grid' ? (
            <div className="relative w-full overflow-x-auto">
              <div className="min-w-full" style={{ minHeight: '240px' }}>
                <svg 
                  width="100%" 
                  height="240"
                  viewBox={`0 0 ${typeof window !== 'undefined' && window.innerWidth < 768 ? window.innerWidth - 64 : 1200} 240`}
                  className="rounded-lg border border-gray-200 dark:border-gray-700"
                  style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {treemapLayout.map((node) => {
                    const style = getStockStyle(node);
                    const showFullText = node.width > 60 && node.height > 30;
                    const showTicker = node.width > 30 && node.height > 20;
                    
                    return (
                      <g key={node.ticker}>
                        {/* Drop shadow */}
                        <rect
                          x={node.x + 1}
                          y={node.y + 1}
                          width={node.width}
                          height={node.height}
                          fill="rgba(0,0,0,0.1)"
                          rx="3"
                        />
                        
                        {/* Main rectangle */}
                        <rect
                          x={node.x}
                          y={node.y}
                          width={node.width}
                          height={node.height}
                          fill={style.backgroundColor}
                          stroke={style.borderColor}
                          strokeWidth="1"
                          rx="3"
                          className="cursor-pointer"
                        />
                        
                        {/* Content */}
                        {showTicker && (
                          <>
                            {/* Ticker symbol */}
                            <text
                              x={node.x + node.width / 2}
                              y={node.y + (showFullText ? node.height / 2 - 8 : node.height / 2 - 2)}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={Math.min(node.width / 5, showFullText ? 12 : 10)}
                              fontWeight="700"
                              fill={style.textColor}
                              fontFamily="system-ui, -apple-system, sans-serif"
                            >
                              {node.ticker}
                            </text>
                            
                            {/* P&L amount */}
                            <text
                              x={node.x + node.width / 2}
                              y={node.y + (showFullText ? node.height / 2 + 2 : node.height / 2 + 6)}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={Math.min(node.width / 7, showFullText ? 10 : 8)}
                              fontWeight="600"
                              fill={style.textColor}
                              fontFamily="system-ui, -apple-system, sans-serif"
                            >
                              {formatCurrency(node.totalPL)}
                            </text>
                            
                            {/* Trade count and win rate - only show if there's enough space */}
                            {showFullText && node.height > 50 && (
                              <text
                                x={node.x + node.width / 2}
                                y={node.y + node.height / 2 + 14}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="8"
                                fontWeight="500"
                                fill={style.textColor}
                                fontFamily="system-ui, -apple-system, sans-serif"
                              >
                                {node.trades} • {node.winRate}%
                              </text>
                            )}
                          </>
                        )}
                        
                        {/* Small indicator for tiny rectangles */}
                        {!showTicker && node.width > 15 && node.height > 10 && (
                          <text
                            x={node.x + node.width / 2}
                            y={node.y + node.height / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="6"
                            fontWeight="700"
                            fill={style.textColor}
                            fontFamily="system-ui, -apple-system, sans-serif"
                          >
                            {node.ticker.substring(0, 2)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          ) : (
            barChartMode === 'timeOfDay' ? renderTimeBarChart() : renderStockBarChart()
          )
        ) : (
          <div className="text-center py-8 sm:py-12">
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              No stocks meet the current filter criteria. Try adjusting your filters.
            </p>
          </div>
        )}
      </div>

      {/* MOBILE-RESPONSIVE: Top Performers */}
      {summaryStats.bestStock && summaryStats.worstStock && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Best Performer */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-emerald-500 rounded-lg shadow-sm">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-emerald-800 dark:text-emerald-200">
                Top Performer
              </h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xl sm:text-2xl font-bold text-emerald-600">
                  {summaryStats.bestStock.ticker}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-emerald-600">
                  {formatCurrency(summaryStats.bestStock.totalPL)}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                    {summaryStats.bestStock.trades}
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 text-xs">
                    Trades
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                    {summaryStats.bestStock.winRate}%
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 text-xs">
                    Win Rate
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                    {formatCurrency(summaryStats.bestStock.avgPLPerTrade)}
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 text-xs">
                    Avg/Trade
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Worst Performer */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-500 rounded-lg shadow-sm">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h4 className="text-base sm:text-lg font-bold text-red-800 dark:text-red-200">
                Needs Attention
              </h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xl sm:text-2xl font-bold text-red-600">
                  {summaryStats.worstStock.ticker}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-red-600">
                  {formatCurrency(summaryStats.worstStock.totalPL)}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-red-800 dark:text-red-300">
                    {summaryStats.worstStock.trades}
                  </div>
                  <div className="text-red-600 dark:text-red-400 text-xs">
                    Trades
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-red-800 dark:text-red-300">
                    {summaryStats.worstStock.winRate}%
                  </div>
                  <div className="text-red-600 dark:text-red-400 text-xs">
                    Win Rate
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-red-800 dark:text-red-300">
                    {formatCurrency(summaryStats.worstStock.avgPLPerTrade)}
                  </div>
                  <div className="text-red-600 dark:text-red-400 text-xs">
                    Avg/Trade
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE-RESPONSIVE: Best Time of Day Analysis */}
      {timePerformance.length > 0 && visualMode === 'bars' && barChartMode === 'timeOfDay' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Trading Hours Analysis
            </h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Best Hour */}
            {(() => {
              const bestHour = timePerformance.reduce((best, hour) => 
                hour.totalPL > best.totalPL ? hour : best
              );
              return (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 sm:p-4 border border-emerald-200 dark:border-emerald-800">
                  <h5 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2 text-sm sm:text-base">
                    Most Profitable Hour
                  </h5>
                  <div className="text-lg sm:text-2xl font-bold text-emerald-600 mb-1">
                    {bestHour.timeLabel}
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(bestHour.totalPL)}
                  </div>
                  <div className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                    {bestHour.trades} trades • {bestHour.winRate}% win rate
                  </div>
                </div>
              );
            })()}

            {/* Most Active Hour */}
            {(() => {
              const mostActiveHour = timePerformance.reduce((most, hour) => 
                hour.trades > most.trades ? hour : most
              );
              return (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
                  <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 text-sm sm:text-base">
                    Most Active Hour
                  </h5>
                  <div className="text-lg sm:text-2xl font-bold text-blue-600 mb-1">
                    {mostActiveHour.timeLabel}
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-blue-700 dark:text-blue-300">
                    {mostActiveHour.trades} trades
                  </div>
                  <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                    {formatCurrency(mostActiveHour.totalPL)} • {mostActiveHour.winRate}% wins
                  </div>
                </div>
              );
            })()}

            {/* Best Win Rate Hour */}
            {(() => {
              const bestWinRateHour = timePerformance.reduce((best, hour) => 
                hour.winRate > best.winRate ? hour : best
              );
              return (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 sm:p-4 border border-purple-200 dark:border-purple-800">
                  <h5 className="font-semibold text-purple-800 dark:text-purple-200 mb-2 text-sm sm:text-base">
                    Best Win Rate Hour
                  </h5>
                  <div className="text-lg sm:text-2xl font-bold text-purple-600 mb-1">
                    {bestWinRateHour.timeLabel}
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-purple-700 dark:text-purple-300">
                    {bestWinRateHour.winRate}% wins
                  </div>
                  <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-400">
                    {bestWinRateHour.trades} trades • {formatCurrency(bestWinRateHour.totalPL)}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingPerformanceHeatmap;