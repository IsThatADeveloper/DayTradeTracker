import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Filter, Target, DollarSign, Settings } from 'lucide-react';

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
}

interface TreemapCell extends StockPerformance {
  x: number;
  y: number;
  width: number;
  height: number;
}

const TradingPerformanceHeatmap: React.FC<TradingHeatmapProps> = ({ trades }) => {
  const [minTrades, setMinTrades] = useState(3);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', '30d', '90d', '1y'
  const [sortBy, setSortBy] = useState('totalPL'); // 'totalPL', 'trades', 'winRate'

  // Process trades data
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
          lastTraded
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

  // Advanced treemap layout algorithm
  const calculateTreemapLayout = (data: StockPerformance[], width = 1000, height = 600): TreemapCell[] => {
    if (data.length === 0) return [];

    const totalValue = data.reduce((sum, item) => sum + item.absValue, 0);
    if (totalValue === 0) return [];

    // Squarified treemap algorithm
    const result: TreemapCell[] = [];
    const container = { x: 0, y: 0, width, height };
    
    const squarify = (items: StockPerformance[], container: any) => {
      if (items.length === 0) return;
      
      if (items.length === 1) {
        result.push({
          ...items[0],
          x: container.x,
          y: container.y,
          width: container.width,
          height: container.height
        });
        return;
      }

      const isWide = container.width > container.height;
      const total = items.reduce((sum, item) => sum + item.absValue, 0);
      
      // Split into rows/columns
      let current = 0;
      let i = 0;
      
      while (i < items.length) {
        const item = items[i];
        const newCurrent = current + item.absValue;
        const ratio = newCurrent / total;
        
        if (i === items.length - 1 || ratio > 0.4) {
          // Create a row/column
          const rowItems = items.slice(current === 0 ? 0 : i, i + 1);
          const rowTotal = rowItems.reduce((sum, item) => sum + item.absValue, 0);
          
          if (isWide) {
            const rowWidth = (rowTotal / total) * container.width;
            let y = container.y;
            
            rowItems.forEach(rowItem => {
              const itemHeight = (rowItem.absValue / rowTotal) * container.height;
              result.push({
                ...rowItem,
                x: container.x,
                y: y,
                width: rowWidth,
                height: itemHeight
              });
              y += itemHeight;
            });
            
            if (i < items.length - 1) {
              squarify(items.slice(i + 1), {
                x: container.x + rowWidth,
                y: container.y,
                width: container.width - rowWidth,
                height: container.height
              });
            }
          } else {
            const rowHeight = (rowTotal / total) * container.height;
            let x = container.x;
            
            rowItems.forEach(rowItem => {
              const itemWidth = (rowItem.absValue / rowTotal) * container.width;
              result.push({
                ...rowItem,
                x: x,
                y: container.y,
                width: itemWidth,
                height: rowHeight
              });
              x += itemWidth;
            });
            
            if (i < items.length - 1) {
              squarify(items.slice(i + 1), {
                x: container.x,
                y: container.y + rowHeight,
                width: container.width,
                height: container.height - rowHeight
              });
            }
          }
          break;
        }
        current = newCurrent;
        i++;
      }
    };

    squarify(data, container);
    return result;
  };

  const layout = calculateTreemapLayout(stockPerformance, 1200, 600);

  // Professional color scheme
  const getStockStyle = (stock: StockPerformance) => {
    const maxPL = Math.max(...stockPerformance.map(s => Math.abs(s.totalPL)));
    const intensity = Math.min(stock.absValue / maxPL, 1);
    
    if (stock.isWinner) {
      // Professional green gradient
      const baseColor = [16, 185, 129]; // emerald-500
      const darkColor = [4, 120, 87]; // emerald-700
      const lightColor = [209, 250, 229]; // emerald-50
      
      return {
        backgroundColor: `rgb(${Math.floor(lightColor[0] + (baseColor[0] - lightColor[0]) * intensity)}, ${Math.floor(lightColor[1] + (baseColor[1] - lightColor[1]) * intensity)}, ${Math.floor(lightColor[2] + (baseColor[2] - lightColor[2]) * intensity)})`,
        borderColor: `rgb(${darkColor[0]}, ${darkColor[1]}, ${darkColor[2]})`,
        textColor: intensity > 0.6 ? 'white' : `rgb(${darkColor[0]}, ${darkColor[1]}, ${darkColor[2]})`,
        shadowColor: `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0.3)`
      };
    } else {
      // Professional red gradient
      const baseColor = [239, 68, 68]; // red-500
      const darkColor = [153, 27, 27]; // red-800
      const lightColor = [254, 226, 226]; // red-50
      
      return {
        backgroundColor: `rgb(${Math.floor(lightColor[0] + (baseColor[0] - lightColor[0]) * intensity)}, ${Math.floor(lightColor[1] + (baseColor[1] - lightColor[1]) * intensity)}, ${Math.floor(lightColor[2] + (baseColor[2] - lightColor[2]) * intensity)})`,
        borderColor: `rgb(${darkColor[0]}, ${darkColor[1]}, ${darkColor[2]})`,
        textColor: intensity > 0.6 ? 'white' : `rgb(${darkColor[0]}, ${darkColor[1]}, ${darkColor[2]})`,
        shadowColor: `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0.3)`
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

  if (!trades || trades.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <BarChart3 className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Trading Data Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Start trading to see your performance heatmap visualization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Performance Heatmap
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Visual overview of your stock trading performance • Box size represents profit/loss magnitude
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="1y">Past Year</option>
                <option value="90d">Past 90 Days</option>
                <option value="30d">Past 30 Days</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <select
                value={minTrades}
                onChange={(e) => setMinTrades(parseInt(e.target.value))}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>Min 1 Trade</option>
                <option value={3}>Min 3 Trades</option>
                <option value={5}>Min 5 Trades</option>
                <option value={10}>Min 10 Trades</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className={`h-4 w-4 ${summaryStats.totalPL >= 0 ? 'text-emerald-600' : 'text-red-500'}`} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total P&L</span>
          </div>
          <div className={`text-xl font-bold ${summaryStats.totalPL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatCurrency(summaryStats.totalPL)}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Stocks</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {summaryStats.stocksTraded}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Trades</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {summaryStats.totalTrades}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Winners</span>
          </div>
          <div className="text-xl font-bold text-emerald-600">
            {summaryStats.winners}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Losers</span>
          </div>
          <div className="text-xl font-bold text-red-500">
            {summaryStats.losers}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Win Rate</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {summaryStats.avgWinRate}%
          </div>
        </div>
      </div>

      {/* Treemap Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Stock Performance Map
          </h3>
          <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-emerald-400 rounded border border-emerald-600"></div>
              <span>Profitable positions</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-400 rounded border border-red-600"></div>
              <span>Losing positions</span>
            </div>
            <span className="text-xs">Box size represents profit/loss magnitude</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-hidden">
          {stockPerformance.length > 0 ? (
            <div className="relative w-full" style={{ height: '500px' }}>
              <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 1200 500" 
                className="rounded-lg"
                style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}
              >
                {layout.map((stock) => {
                  const style = getStockStyle(stock);
                  const showFullText = stock.width > 100 && stock.height > 50;
                  const showTicker = stock.width > 60 && stock.height > 30;
                  
                  return (
                    <g key={stock.ticker}>
                      {/* Drop shadow */}
                      <rect
                        x={stock.x + 2}
                        y={stock.y + 2}
                        width={stock.width}
                        height={stock.height}
                        fill={style.shadowColor}
                        rx="6"
                        opacity="0.2"
                      />
                      
                      {/* Main rectangle */}
                      <rect
                        x={stock.x}
                        y={stock.y}
                        width={stock.width}
                        height={stock.height}
                        fill={style.backgroundColor}
                        stroke={style.borderColor}
                        strokeWidth="1.5"
                        rx="6"
                        className="hover:opacity-90 transition-opacity cursor-pointer"
                      />
                      
                      {/* Content */}
                      {showTicker && (
                        <>
                          {/* Ticker symbol */}
                          <text
                            x={stock.x + stock.width / 2}
                            y={stock.y + (showFullText ? stock.height / 2 - 12 : stock.height / 2)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={showFullText ? "16" : "14"}
                            fontWeight="700"
                            fill={style.textColor}
                            fontFamily="system-ui, -apple-system, sans-serif"
                          >
                            {stock.ticker}
                          </text>
                          
                          {/* P&L amount */}
                          {showFullText && (
                            <text
                              x={stock.x + stock.width / 2}
                              y={stock.y + stock.height / 2 + 6}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize="14"
                              fontWeight="600"
                              fill={style.textColor}
                              fontFamily="system-ui, -apple-system, sans-serif"
                            >
                              {formatCurrency(stock.totalPL)}
                            </text>
                          )}
                          
                          {/* Additional metrics */}
                          {showFullText && stock.height > 70 && (
                            <text
                              x={stock.x + stock.width / 2}
                              y={stock.y + stock.height / 2 + 24}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize="11"
                              fill={style.textColor}
                              opacity="0.8"
                              fontFamily="system-ui, -apple-system, sans-serif"
                            >
                              {stock.trades} trades • {stock.winRate}% WR
                            </text>
                          )}
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No stocks meet the current filter criteria. Try adjusting your filters.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Top Performers */}
      {summaryStats.bestStock && summaryStats.worstStock && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Performer */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-emerald-500 rounded-lg shadow-sm">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <h4 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                Top Performer
              </h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-emerald-600">
                  {summaryStats.bestStock.ticker}
                </span>
                <span className="text-2xl font-bold text-emerald-600">
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
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-500 rounded-lg shadow-sm">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <h4 className="text-lg font-bold text-red-800 dark:text-red-200">
                Needs Attention
              </h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-red-600">
                  {summaryStats.worstStock.ticker}
                </span>
                <span className="text-2xl font-bold text-red-600">
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
    </div>
  );
};

export default TradingPerformanceHeatmap;