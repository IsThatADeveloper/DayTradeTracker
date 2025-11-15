import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Filter, Target, DollarSign, Settings, Clock, Layers, Hash, Activity, Droplet } from 'lucide-react';

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
  status?: 'open' | 'closed';
}

interface TradingHeatmapProps {
  trades: Trade[];
  polygonApiKey?: string; // Optional API key for float data
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

interface PriceRangePerformance {
  range: string;
  rangeLabel: string;
  minPrice: number;
  maxPrice: number;
  totalPL: number;
  trades: number;
  winRate: number;
  avgPLPerTrade: number;
  isWinner: boolean;
  absValue: number;
}

interface ShareSizePerformance {
  range: string;
  rangeLabel: string;
  minShares: number;
  maxShares: number;
  totalPL: number;
  trades: number;
  winRate: number;
  avgPLPerTrade: number;
  isWinner: boolean;
  absValue: number;
}

interface FloatPerformance {
  range: string;
  rangeLabel: string;
  minFloat: number;
  maxFloat: number;
  totalPL: number;
  trades: number;
  winRate: number;
  avgPLPerTrade: number;
  isWinner: boolean;
  absValue: number;
}

type AnalysisMode = 'stocks' | 'timeOfDay' | 'priceRange' | 'shareSize' | 'float';

// Helper function to fetch stock float from Polygon API
async function fetchStockFloat(ticker: string, apiKey: string): Promise<number | null> {
  try {
    // Using Polygon v3 reference API for ticker details
    const response = await fetch(`https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${apiKey}`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch float for ${ticker}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Float can be calculated from shares outstanding
    // Polygon provides weighted_shares_outstanding or share_class_shares_outstanding
    const float = data.results?.weighted_shares_outstanding || 
                  data.results?.share_class_shares_outstanding ||
                  null;
    
    if (float) {
      console.log(`✅ ${ticker} float: ${(float / 1000000).toFixed(2)}M shares`);
    }
    
    return float;
  } catch (error) {
    console.error(`Error fetching float for ${ticker}:`, error);
    return null;
  }
}

const TradingPerformanceHeatmap: React.FC<TradingHeatmapProps> = ({ trades, polygonApiKey: propApiKey }) => {
  const [minTrades, setMinTrades] = useState(1);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', '7d', '30d', '60d', '90d', '1y', 'custom'
  const [sortBy, setSortBy] = useState('totalPL'); // 'totalPL', 'trades', 'winRate'
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('timeOfDay');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // NEW: State for float data
  const [floatData, setFloatData] = useState<Map<string, number>>(new Map());
  const [isLoadingFloatData, setIsLoadingFloatData] = useState(false);

  // Get API key from prop or environment (Vite uses import.meta.env)
  const polygonApiKey = propApiKey || 
                        import.meta.env.VITE_POLYGON_API_KEY ||
                        import.meta.env.VITE_REACT_APP_POLYGON_API_KEY ||
                        '';

  // Helper functions - MUST be defined before useMemo hooks that use them
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  // Filter trades by time period
  const filteredTrades = useMemo(() => {
    if (timeFilter === 'all') return trades;
    
    if (timeFilter === 'custom') {
      if (!customStartDate || !customEndDate) return trades;
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999); // Include entire end day
      
      return trades.filter(trade => {
        const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
        return tradeDate >= start && tradeDate <= end;
      });
    }
    
    const now = new Date();
    const daysBack = timeFilter === '7d' ? 7 : 
                     timeFilter === '30d' ? 30 : 
                     timeFilter === '60d' ? 60 :
                     timeFilter === '90d' ? 90 : 365;
    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    
    return trades.filter(trade => {
      const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
      return tradeDate >= cutoffDate;
    });
  }, [trades, timeFilter, customStartDate, customEndDate]);

  // UPDATED: Filter trades excluding current day (for float and % move analysis)
  const filteredTradesExcludingToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return filteredTrades.filter(trade => {
      const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
      const tradeDateOnly = new Date(tradeDate);
      tradeDateOnly.setHours(0, 0, 0, 0);
      return tradeDateOnly < today;
    });
  }, [filteredTrades]);

  // NEW: Fetch float data when analysis mode is 'float'
  useEffect(() => {
    if (analysisMode !== 'float' || filteredTradesExcludingToday.length === 0) return;
    
    // Check if API key is available
    if (!polygonApiKey) {
      console.error('⚠️ Polygon API key not found. Checked:', {
        prop: propApiKey ? 'yes' : 'no',
        vite_key: import.meta.env.VITE_POLYGON_API_KEY ? 'yes' : 'no',
        vite_react_key: import.meta.env.VITE_REACT_APP_POLYGON_API_KEY ? 'yes' : 'no'
      });
      console.error('💡 For Vite: Add VITE_POLYGON_API_KEY to your .env file');
      console.error('💡 Example: VITE_POLYGON_API_KEY=your_key_here');
      setIsLoadingFloatData(false);
      return;
    }
    
    console.log('✅ Polygon API key found, starting float data fetch...');
    
    const fetchFloatData = async () => {
      setIsLoadingFloatData(true);
      const uniqueTickers = [...new Set(filteredTradesExcludingToday.map(t => t.ticker.toUpperCase()))];
      const newFloatData = new Map<string, number>();
      
      console.log(`📊 Fetching float data for ${uniqueTickers.length} tickers (excluding today's trades)...`);
      
      for (const ticker of uniqueTickers) {
        // Check if we already have this data
        if (floatData.has(ticker)) {
          newFloatData.set(ticker, floatData.get(ticker)!);
          continue;
        }
        
        const float = await fetchStockFloat(ticker, polygonApiKey);
        if (float !== null) {
          newFloatData.set(ticker, float);
        } else {
          console.warn(`⚠️ ${ticker}: Float data not available`);
        }
        
        // Rate limiting: wait 200ms between requests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setFloatData(newFloatData);
      setIsLoadingFloatData(false);
      console.log(`✅ Float data loaded for ${newFloatData.size} of ${uniqueTickers.length} tickers`);
    };
    
    fetchFloatData();
  }, [analysisMode, filteredTradesExcludingToday, polygonApiKey]);

  // Process trades data for stocks
  const stockPerformance = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) return [];

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
  }, [filteredTrades, minTrades, sortBy]);

  // Process trades data by time of day
  const timePerformance = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) return [];

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

    const timeArray: TimePerformance[] = [];
    const hoursWithTrades = Array.from(hourMap.keys()).sort((a, b) => a - b);
    
    hoursWithTrades.forEach(hour => {
      const data = hourMap.get(hour);
      if (data && data.trades.length > 0) {
        const winRate = (data.wins / data.trades.length) * 100;
        const avgPLPerTrade = data.totalPL / data.trades.length;
        
        let timeLabel: string;
        if (hour === 0) timeLabel = '12:00-1:00 AM';
        else if (hour < 12) timeLabel = `${hour}:00-${hour + 1}:00 AM`;
        else if (hour === 12) timeLabel = '12:00-1:00 PM';
        else timeLabel = `${hour - 12}:00-${hour - 11}:00 PM`;
        
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
  }, [filteredTrades]);

  // Process trades by stock price range
  const priceRangePerformance = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) return [];

    const ranges = [
      { range: 'penny', label: 'Penny Stocks ($0-$5)', min: 0, max: 5 },
      { range: 'low', label: 'Low Price ($5-$20)', min: 5, max: 20 },
      { range: 'mid', label: 'Mid Price ($20-$100)', min: 20, max: 100 },
      { range: 'high', label: 'High Price ($100-$500)', min: 100, max: 500 },
      { range: 'premium', label: 'Premium ($500+)', min: 500, max: Infinity }
    ];

    const rangeMap = new Map<string, {
      totalPL: number;
      trades: Trade[];
      wins: number;
      losses: number;
      minPrice: number;
      maxPrice: number;
    }>();

    filteredTrades.forEach(trade => {
      const price = trade.entryPrice;
      const matchedRange = ranges.find(r => price >= r.min && price < r.max);
      
      if (matchedRange) {
        const existing = rangeMap.get(matchedRange.range) || {
          totalPL: 0,
          trades: [],
          wins: 0,
          losses: 0,
          minPrice: matchedRange.min,
          maxPrice: matchedRange.max
        };
        
        existing.totalPL += trade.realizedPL;
        existing.trades.push(trade);
        if (trade.realizedPL > 0) existing.wins++;
        else if (trade.realizedPL < 0) existing.losses++;
        
        rangeMap.set(matchedRange.range, existing);
      }
    });

    const priceArray: PriceRangePerformance[] = ranges.map(range => {
      const data = rangeMap.get(range.range);
      if (!data || data.trades.length === 0) {
        return {
          range: range.range,
          rangeLabel: range.label,
          minPrice: range.min,
          maxPrice: range.max,
          totalPL: 0,
          trades: 0,
          winRate: 0,
          avgPLPerTrade: 0,
          isWinner: false,
          absValue: 0
        };
      }

      const winRate = (data.wins / data.trades.length) * 100;
      const avgPLPerTrade = data.totalPL / data.trades.length;

      return {
        range: range.range,
        rangeLabel: range.label,
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        totalPL: data.totalPL,
        trades: data.trades.length,
        winRate: Math.round(winRate),
        avgPLPerTrade: Math.round(avgPLPerTrade),
        isWinner: data.totalPL > 0,
        absValue: Math.abs(data.totalPL)
      };
    }).filter(r => r.trades > 0);

    return priceArray;
  }, [filteredTrades]);

  // Process trades by share size
  const shareSizePerformance = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) return [];

    // Calculate share size ranges dynamically based on actual trade sizes
    const allQuantities = filteredTrades.map(t => t.quantity).sort((a, b) => a - b);
    const minQty = allQuantities[0];
    const maxQty = allQuantities[allQuantities.length - 1];
    
    // Create 5 ranges based on percentiles
    const p20 = allQuantities[Math.floor(allQuantities.length * 0.2)];
    const p40 = allQuantities[Math.floor(allQuantities.length * 0.4)];
    const p60 = allQuantities[Math.floor(allQuantities.length * 0.6)];
    const p80 = allQuantities[Math.floor(allQuantities.length * 0.8)];

    const ranges = [
      { range: 'xs', label: `Extra Small (${formatNumber(minQty)}-${formatNumber(p20)} shares)`, min: minQty, max: p20 },
      { range: 'small', label: `Small (${formatNumber(p20)}-${formatNumber(p40)} shares)`, min: p20, max: p40 },
      { range: 'medium', label: `Medium (${formatNumber(p40)}-${formatNumber(p60)} shares)`, min: p40, max: p60 },
      { range: 'large', label: `Large (${formatNumber(p60)}-${formatNumber(p80)} shares)`, min: p60, max: p80 },
      { range: 'xl', label: `Extra Large (${formatNumber(p80)}+ shares)`, min: p80, max: Infinity }
    ];

    const rangeMap = new Map<string, {
      totalPL: number;
      trades: Trade[];
      wins: number;
      losses: number;
      minShares: number;
      maxShares: number;
    }>();

    filteredTrades.forEach(trade => {
      const quantity = trade.quantity;
      const matchedRange = ranges.find(r => quantity >= r.min && (quantity < r.max || r.max === Infinity));
      
      if (matchedRange) {
        const existing = rangeMap.get(matchedRange.range) || {
          totalPL: 0,
          trades: [],
          wins: 0,
          losses: 0,
          minShares: matchedRange.min,
          maxShares: matchedRange.max
        };
        
        existing.totalPL += trade.realizedPL;
        existing.trades.push(trade);
        if (trade.realizedPL > 0) existing.wins++;
        else if (trade.realizedPL < 0) existing.losses++;
        
        rangeMap.set(matchedRange.range, existing);
      }
    });

    const sizeArray: ShareSizePerformance[] = ranges.map(range => {
      const data = rangeMap.get(range.range);
      if (!data || data.trades.length === 0) {
        return {
          range: range.range,
          rangeLabel: range.label,
          minShares: range.min,
          maxShares: range.max,
          totalPL: 0,
          trades: 0,
          winRate: 0,
          avgPLPerTrade: 0,
          isWinner: false,
          absValue: 0
        };
      }

      const winRate = (data.wins / data.trades.length) * 100;
      const avgPLPerTrade = data.totalPL / data.trades.length;

      return {
        range: range.range,
        rangeLabel: range.label,
        minShares: data.minShares,
        maxShares: data.maxShares,
        totalPL: data.totalPL,
        trades: data.trades.length,
        winRate: Math.round(winRate),
        avgPLPerTrade: Math.round(avgPLPerTrade),
        isWinner: data.totalPL > 0,
        absValue: Math.abs(data.totalPL)
      };
    }).filter(r => r.trades > 0);

    return sizeArray;
  }, [filteredTrades]);

  // NEW: Process trades by stock float
  const floatPerformance = useMemo(() => {
    if (!filteredTradesExcludingToday || filteredTradesExcludingToday.length === 0) return [];
    if (isLoadingFloatData) return [];

    const ranges = [
      { range: 'nano', label: 'Nano Float (<1M)', min: 0, max: 1000000 },
      { range: 'micro', label: 'Micro Float (1M-5M)', min: 1000000, max: 5000000 },
      { range: 'low', label: 'Low Float (5M-20M)', min: 5000000, max: 20000000 },
      { range: 'mid', label: 'Mid Float (20M-100M)', min: 20000000, max: 100000000 },
      { range: 'high', label: 'High Float (100M-500M)', min: 100000000, max: 500000000 },
      { range: 'massive', label: 'Massive Float (500M+)', min: 500000000, max: Infinity }
    ];

    const rangeMap = new Map<string, {
      totalPL: number;
      trades: Trade[];
      wins: number;
      losses: number;
      minFloat: number;
      maxFloat: number;
    }>();

    filteredTradesExcludingToday.forEach(trade => {
      const ticker = trade.ticker.toUpperCase();
      const float = floatData.get(ticker);
      
      // Skip trades where we don't have float data
      if (!float) return;
      
      const matchedRange = ranges.find(r => float >= r.min && float < r.max);
      
      if (matchedRange) {
        const existing = rangeMap.get(matchedRange.range) || {
          totalPL: 0,
          trades: [],
          wins: 0,
          losses: 0,
          minFloat: matchedRange.min,
          maxFloat: matchedRange.max
        };
        
        existing.totalPL += trade.realizedPL;
        existing.trades.push(trade);
        if (trade.realizedPL > 0) existing.wins++;
        else if (trade.realizedPL < 0) existing.losses++;
        
        rangeMap.set(matchedRange.range, existing);
      }
    });

    const floatArray: FloatPerformance[] = ranges.map(range => {
      const data = rangeMap.get(range.range);
      if (!data || data.trades.length === 0) {
        return {
          range: range.range,
          rangeLabel: range.label,
          minFloat: range.min,
          maxFloat: range.max,
          totalPL: 0,
          trades: 0,
          winRate: 0,
          avgPLPerTrade: 0,
          isWinner: false,
          absValue: 0
        };
      }

      const winRate = (data.wins / data.trades.length) * 100;
      const avgPLPerTrade = data.totalPL / data.trades.length;

      return {
        range: range.range,
        rangeLabel: range.label,
        minFloat: data.minFloat,
        maxFloat: data.maxFloat,
        totalPL: data.totalPL,
        trades: data.trades.length,
        winRate: Math.round(winRate),
        avgPLPerTrade: Math.round(avgPLPerTrade),
        isWinner: data.totalPL > 0,
        absValue: Math.abs(data.totalPL)
      };
    }).filter(r => r.trades > 0);

    return floatArray;
  }, [filteredTradesExcludingToday, floatData, isLoadingFloatData]);

  // Get current data based on analysis mode
  const getCurrentData = () => {
    switch (analysisMode) {
      case 'stocks': return stockPerformance;
      case 'timeOfDay': return timePerformance;
      case 'priceRange': return priceRangePerformance;
      case 'shareSize': return shareSizePerformance;
      case 'float': return floatPerformance;
      default: return [];
    }
  };

  const currentData = getCurrentData();

  // Check if we're loading data for current mode
  const isLoadingCurrentMode = () => {
    if (analysisMode === 'float' && isLoadingFloatData) return true;
    return false;
  };

  // Professional color scheme
  const getBarStyle = (item: any) => {
    const maxTrades = Math.max(...currentData.map((s: any) => s.trades));
    const tradeIntensity = Math.min(item.trades / Math.max(maxTrades, 1), 1);
    
    if (item.isWinner) {
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

  // Get label for current item based on analysis mode
  const getItemLabel = (item: any) => {
    switch (analysisMode) {
      case 'stocks': return item.ticker;
      case 'timeOfDay': return item.timeLabel;
      case 'priceRange': return item.rangeLabel;
      case 'shareSize': return item.rangeLabel;
      case 'float': return item.rangeLabel;
      default: return '';
    }
  };

  // UNIVERSAL: Render bar chart for any analysis mode
  const renderBarChart = () => {
    if (isLoadingCurrentMode()) {
      return (
        <div className="text-center py-8 sm:py-12">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Loading float data...
          </p>
        </div>
      );
    }

    if (!currentData || currentData.length === 0) {
      return (
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
            No data available for this analysis mode with current filters.
          </p>
          {analysisMode === 'float' && (
            <div className="mt-2 space-y-1">
              {!polygonApiKey && (
                <div className="text-xs space-y-1">
                  <p className="text-red-400 dark:text-red-500">
                    ⚠️ Polygon API key not found
                  </p>
                  <p className="text-gray-400 dark:text-gray-500">
                    Add <code className="bg-gray-700 px-1 py-0.5 rounded">VITE_POLYGON_API_KEY</code> to your .env file
                  </p>
                </div>
              )}
              {polygonApiKey && floatData.size === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  💡 Note: Float data only includes trades from previous days (excluding today). Make sure you have historical trades to analyze.
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    const maxAbsValue = Math.max(...currentData.map((item: any) => item.absValue));
    
    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 sm:p-4">
        <div className="space-y-2 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
          {currentData.map((item: any, index: number) => {
            const barWidth = maxAbsValue > 0 ? (item.absValue / maxAbsValue) * 100 : 0;
            const style = getBarStyle(item);
            const label = getItemLabel(item);
            
            return (
              <div key={index} className="flex items-center space-x-2 sm:space-x-3 p-1.5 sm:p-2">
                {/* Label - WIDER to prevent truncation */}
                <div className="w-32 sm:w-48 md:w-56 text-right flex-shrink-0">
                  <span className="font-bold text-xs sm:text-sm block" title={label}>
                    {label}
                  </span>
                </div>
                
                {/* Bar Container - NARROWER */}
                <div className="flex-1 relative min-w-0">
                  <div 
                    className="h-7 sm:h-8 rounded flex items-center justify-between px-2"
                    style={{
                      backgroundColor: style.backgroundColor,
                      borderLeft: `4px solid ${style.borderColor}`,
                      width: `${Math.max(barWidth, 8)}%`,
                      boxShadow: `0 2px 4px ${style.shadowColor}`
                    }}
                  >
                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: style.textColor }}>
                      {item.trades}
                    </span>
                    <span className="text-xs sm:text-sm font-bold whitespace-nowrap" style={{ color: style.textColor }}>
                      {formatCurrency(item.totalPL)}
                    </span>
                  </div>
                </div>
                
                {/* Win Rate - Fixed width */}
                <div className="w-12 sm:w-14 text-right flex-shrink-0">
                  <span className={`text-xs sm:text-sm font-medium ${
                    item.winRate >= 50 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {item.winRate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Get analysis mode title and description
  const getAnalysisModeInfo = () => {
    switch (analysisMode) {
      case 'stocks':
        return {
          title: 'Stock Performance Analysis',
          description: 'Performance breakdown by individual ticker symbols',
          icon: <Target className="h-5 w-5" />
        };
      case 'timeOfDay':
        return {
          title: 'Performance by Time of Day',
          description: 'Analyze your best and worst trading hours',
          icon: <Clock className="h-5 w-5" />
        };
      case 'priceRange':
        return {
          title: 'Performance by Stock Price Range',
          description: 'See which price ranges you excel in (penny stocks vs high-priced)',
          icon: <DollarSign className="h-5 w-5" />
        };
      case 'shareSize':
        return {
          title: 'Performance by Position Size',
          description: 'Compare small vs large position performance',
          icon: <Hash className="h-5 w-5" />
        };
      case 'float':
        return {
          title: 'Performance by Stock Float',
          description: 'Discover if you perform better with low float or high float stocks',
          icon: <Droplet className="h-5 w-5" />
        };
      default:
        return {
          title: 'Performance Analysis',
          description: 'Trading performance breakdown',
          icon: <BarChart3 className="h-5 w-5" />
        };
    }
  };

  const modeInfo = getAnalysisModeInfo();

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
                Performance Analysis
              </h2>
            </div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Multi-dimensional analysis of your trading performance
            </p>
          </div>
          
          {/* MOBILE-RESPONSIVE: Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-wrap">
            {/* Time Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="7d">Past 7 Days</option>
                <option value="30d">Past 30 Days</option>
                <option value="60d">Past 60 Days</option>
                <option value="90d">Past 90 Days</option>
                <option value="1y">Past Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Custom Date Range Inputs */}
            {timeFilter === 'custom' && (
              <>
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    From:
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    To:
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}
            
            {/* Min Trades Filter - Only for stocks mode */}
            {analysisMode === 'stocks' && (
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-gray-500 flex-shrink-0" />
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
            )}

            {/* Sort By Filter - Only for stocks mode */}
            {analysisMode === 'stocks' && (
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 sm:flex-none px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="totalPL">Sort by P&L</option>
                  <option value="trades">Sort by Trades</option>
                  <option value="winRate">Sort by Win Rate</option>
                </select>
              </div>
            )}
          </div>

          {/* Analysis Mode Selector - MOBILE-RESPONSIVE */}
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 flex flex-wrap gap-2">
            <button
              onClick={() => setAnalysisMode('timeOfDay')}
              className={`flex items-center px-3 py-2 text-xs font-medium rounded transition-all ${
                analysisMode === 'timeOfDay'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Clock className="h-3 w-3 mr-1.5" />
              Time of Day
            </button>
            <button
              onClick={() => setAnalysisMode('stocks')}
              className={`flex items-center px-3 py-2 text-xs font-medium rounded transition-all ${
                analysisMode === 'stocks'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Target className="h-3 w-3 mr-1.5" />
              By Stock
            </button>
            <button
              onClick={() => setAnalysisMode('priceRange')}
              className={`flex items-center px-3 py-2 text-xs font-medium rounded transition-all ${
                analysisMode === 'priceRange'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <DollarSign className="h-3 w-3 mr-1.5" />
              Price Range
            </button>
            <button
              onClick={() => setAnalysisMode('shareSize')}
              className={`flex items-center px-3 py-2 text-xs font-medium rounded transition-all ${
                analysisMode === 'shareSize'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Hash className="h-3 w-3 mr-1.5" />
              Position Size
            </button>
            <button
              onClick={() => setAnalysisMode('float')}
              className={`flex items-center px-3 py-2 text-xs font-medium rounded transition-all ${
                analysisMode === 'float'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Droplet className="h-3 w-3 mr-1.5" />
              Stock Float
            </button>
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
          <div className="flex items-center space-x-2 mb-2">
            {modeInfo.icon}
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {modeInfo.title}
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {modeInfo.description}
          </p>
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
              Bar length = P&L magnitude
            </span>
          </div>
        </div>

        {renderBarChart()}
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

      {/* Key Insights Section */}
      {currentData.length > 0 && !isLoadingCurrentMode() && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Key Insights
            </h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Best Category */}
            {(() => {
              const best = currentData.reduce((best: any, item: any) => 
                item.totalPL > best.totalPL ? item : best
              );
              return (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 sm:p-4 border border-emerald-200 dark:border-emerald-800">
                  <h5 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2 text-sm sm:text-base">
                    Most Profitable
                  </h5>
                  <div className="text-lg sm:text-2xl font-bold text-emerald-600 mb-1 truncate" title={getItemLabel(best)}>
                    {getItemLabel(best)}
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(best.totalPL)}
                  </div>
                  <div className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                    {best.trades} trades • {best.winRate}% win rate
                  </div>
                </div>
              );
            })()}

            {/* Most Active */}
            {(() => {
              const mostActive = currentData.reduce((most: any, item: any) => 
                item.trades > most.trades ? item : most
              );
              return (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
                  <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 text-sm sm:text-base">
                    Most Active
                  </h5>
                  <div className="text-lg sm:text-2xl font-bold text-blue-600 mb-1 truncate" title={getItemLabel(mostActive)}>
                    {getItemLabel(mostActive)}
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-blue-700 dark:text-blue-300">
                    {mostActive.trades} trades
                  </div>
                  <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                    {formatCurrency(mostActive.totalPL)} • {mostActive.winRate}% wins
                  </div>
                </div>
              );
            })()}

            {/* Best Win Rate */}
            {(() => {
              const bestWinRate = currentData.reduce((best: any, item: any) => 
                item.winRate > best.winRate ? item : best
              );
              return (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 sm:p-4 border border-purple-200 dark:border-purple-800">
                  <h5 className="font-semibold text-purple-800 dark:text-purple-200 mb-2 text-sm sm:text-base">
                    Best Win Rate
                  </h5>
                  <div className="text-lg sm:text-2xl font-bold text-purple-600 mb-1 truncate" title={getItemLabel(bestWinRate)}>
                    {getItemLabel(bestWinRate)}
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-purple-700 dark:text-purple-300">
                    {bestWinRate.winRate}% wins
                  </div>
                  <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-400">
                    {bestWinRate.trades} trades • {formatCurrency(bestWinRate.totalPL)}
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