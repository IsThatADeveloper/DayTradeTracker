// src/utils/tradeUtils.ts - Improved version with better organization and documentation
import { 
  format, 
  parseISO, 
  startOfDay, 
  isSameDay, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addDays, 
  subDays 
} from 'date-fns';

// Types
import { Trade, DailyStats, HourlyStats } from '../types/trade';

// Constants
const EXTENDED_TRADING_START_HOUR = 4; // 4:00 AM
const EXTENDED_TRADING_END_HOUR = 20;  // 8:00 PM
const MARKET_OPEN_HOUR = 9;            // 9:30 AM (approximate)
const MARKET_CLOSE_HOUR = 16;          // 4:00 PM

/**
 * Generate a unique trade ID with timestamp and random suffix
 * @returns A unique trade identifier
 */
export const generateTradeId = (): string => {
  return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Normalize date to local midnight to avoid timezone issues
 * @param date - The date to normalize
 * @returns A new Date object set to local midnight
 */
const normalizeToLocalDate = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

/**
 * Check if two dates are the same day in local timezone
 * @param date1 - First date to compare
 * @param date2 - Second date to compare
 * @returns True if dates are the same day
 */
const isSameDayLocal = (date1: Date, date2: Date): boolean => {
  const d1 = normalizeToLocalDate(date1);
  const d2 = normalizeToLocalDate(date2);
  return d1.getTime() === d2.getTime();
};

/**
 * Calculate comprehensive daily trading statistics
 * @param trades - Array of trades to analyze
 * @param date - The target date for analysis
 * @returns Daily statistics object
 */
export const calculateDailyStats = (trades: Trade[], date: Date): DailyStats => {
  // Normalize the target date to avoid timezone issues
  const targetDate = normalizeToLocalDate(date);
  
  // Filter trades for the specific day
  const dayTrades = trades.filter(trade => {
    const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
    return isSameDayLocal(tradeDate, targetDate);
  });
  
  // Calculate basic metrics
  const totalPL = dayTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
  const wins = dayTrades.filter(trade => trade.realizedPL > 0);
  const losses = dayTrades.filter(trade => trade.realizedPL < 0);
  
  // Calculate averages
  const avgWin = wins.length > 0 
    ? wins.reduce((sum, trade) => sum + trade.realizedPL, 0) / wins.length 
    : 0;
  const avgLoss = losses.length > 0 
    ? losses.reduce((sum, trade) => sum + trade.realizedPL, 0) / losses.length 
    : 0;
  
  return {
    date: format(targetDate, 'yyyy-MM-dd'),
    totalPL,
    winCount: wins.length,
    lossCount: losses.length,
    totalTrades: dayTrades.length,
    winRate: dayTrades.length > 0 ? (wins.length / dayTrades.length) * 100 : 0,
    avgWin,
    avgLoss,
  };
};

/**
 * Calculate hourly trading statistics for extended trading hours
 * @param trades - Array of trades to analyze
 * @param date - The target date for analysis
 * @returns Array of hourly statistics
 */
export const calculateHourlyStats = (trades: Trade[], date: Date): HourlyStats[] => {
  const targetDate = normalizeToLocalDate(date);
  
  // Filter trades for the specific day
  const dayTrades = trades.filter(trade => {
    const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
    return isSameDayLocal(tradeDate, targetDate);
  });
  
  // Initialize hourly data structure for extended trading hours
  const hourlyData: { [hour: number]: { pl: number; count: number } } = {};
  for (let hour = EXTENDED_TRADING_START_HOUR; hour <= EXTENDED_TRADING_END_HOUR; hour++) {
    hourlyData[hour] = { pl: 0, count: 0 };
  }
  
  // Aggregate trades by hour
  dayTrades.forEach(trade => {
    const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
    const hour = tradeDate.getHours();
    
    if (hour >= EXTENDED_TRADING_START_HOUR && hour <= EXTENDED_TRADING_END_HOUR) {
      hourlyData[hour].pl += trade.realizedPL;
      hourlyData[hour].count += 1;
    }
  });
  
  // Convert to array format
  return Object.entries(hourlyData).map(([hour, data]) => ({
    hour: parseInt(hour),
    totalPL: data.pl,
    tradeCount: data.count,
    avgPL: data.count > 0 ? data.pl / data.count : 0,
  }));
};

/**
 * Calculate weekly trading statistics
 * @param trades - Array of trades to analyze
 * @param date - The target date for week calculation
 * @returns Weekly statistics object
 */
export const getWeeklyStats = (trades: Trade[], date: Date) => {
  const targetDate = normalizeToLocalDate(date);
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
  
  // Filter trades for the week
  const weekTrades = trades.filter(trade => {
    const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
    const normalizedTradeDate = normalizeToLocalDate(tradeDate);
    return normalizedTradeDate >= weekStart && normalizedTradeDate <= weekEnd;
  });
  
  // Calculate weekly metrics
  const totalPL = weekTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
  const wins = weekTrades.filter(trade => trade.realizedPL > 0);
  const losses = weekTrades.filter(trade => trade.realizedPL < 0);
  
  return {
    weekStart,
    weekEnd,
    totalPL,
    totalTrades: weekTrades.length,
    winCount: wins.length,
    lossCount: losses.length,
    winRate: weekTrades.length > 0 ? (wins.length / weekTrades.length) * 100 : 0,
  };
};

/**
 * Generate calendar data with trading performance for each day
 * Creates a 6-week view centered around the current date
 * @param trades - Array of trades to analyze
 * @param currentDate - The current/selected date
 * @returns Array of calendar day objects with trading data
 */
export const getCalendarData = (trades: Trade[], currentDate: Date) => {
  const normalizedCurrentDate = normalizeToLocalDate(currentDate);
  
  // Create 6-week view (3 weeks before and after current date)
  const startDate = subDays(startOfWeek(subDays(normalizedCurrentDate, 21), { weekStartsOn: 1 }), 0);
  const endDate = addDays(endOfWeek(addDays(normalizedCurrentDate, 21), { weekStartsOn: 1 }), 0);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  return days.map(day => {
    // Filter trades for this specific day
    const dayTrades = trades.filter(trade => {
      const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
      return isSameDayLocal(tradeDate, day);
    });
    
    const totalPL = dayTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
    
    return {
      date: day,
      totalPL,
      tradeCount: dayTrades.length,
      hasData: dayTrades.length > 0,
    };
  });
};

/**
 * Format a number as currency with proper locale formatting
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format trading hour for display with special market hour indicators
 * @param hour - Hour in 24-hour format (0-23)
 * @returns Formatted time string with market indicators
 */
export const formatTime = (hour: number): string => {
  // Special market hour indicators
  if (hour === EXTENDED_TRADING_START_HOUR) return '4:00 AM';
  if (hour === MARKET_OPEN_HOUR) return '9:30 AM'; // Market open
  if (hour === MARKET_CLOSE_HOUR) return '4:00 PM'; // Market close
  if (hour === EXTENDED_TRADING_END_HOUR) return '8:00 PM';
  
  // Standard time formatting
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
};

/**
 * Check if a given hour is within market hours
 * @param hour - Hour in 24-hour format
 * @returns True if hour is within standard market hours
 */
export const isMarketHours = (hour: number): boolean => {
  return hour >= MARKET_OPEN_HOUR && hour < MARKET_CLOSE_HOUR;
};

/**
 * Check if a given hour is within extended trading hours
 * @param hour - Hour in 24-hour format
 * @returns True if hour is within extended trading hours
 */
export const isExtendedTradingHours = (hour: number): boolean => {
  return hour >= EXTENDED_TRADING_START_HOUR && hour <= EXTENDED_TRADING_END_HOUR;
};

/**
 * Calculate the profit factor (average win / average loss)
 * @param trades - Array of trades to analyze
 * @returns Profit factor ratio
 */
export const calculateProfitFactor = (trades: Trade[]): number => {
  const wins = trades.filter(trade => trade.realizedPL > 0);
  const losses = trades.filter(trade => trade.realizedPL < 0);
  
  if (wins.length === 0 || losses.length === 0) return 0;
  
  const avgWin = wins.reduce((sum, trade) => sum + trade.realizedPL, 0) / wins.length;
  const avgLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.realizedPL, 0) / losses.length);
  
  return avgWin / avgLoss;
};

/**
 * Calculate the Sharpe ratio for a set of trades
 * @param trades - Array of trades to analyze
 * @param riskFreeRate - Annual risk-free rate (default: 2%)
 * @returns Sharpe ratio
 */
export const calculateSharpeRatio = (trades: Trade[], riskFreeRate: number = 0.02): number => {
  if (trades.length === 0) return 0;
  
  const returns = trades.map(trade => trade.realizedPL);
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  
  // Calculate standard deviation
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  // Annualize the risk-free rate for daily trading
  const dailyRiskFreeRate = riskFreeRate / 252; // 252 trading days per year
  
  return (avgReturn - dailyRiskFreeRate) / stdDev;
};

/**
 * Get the largest winning and losing trades
 * @param trades - Array of trades to analyze
 * @returns Object with largest win and loss
 */
export const getLargestTrades = (trades: Trade[]): { largestWin: Trade | null; largestLoss: Trade | null } => {
  if (trades.length === 0) {
    return { largestWin: null, largestLoss: null };
  }
  
  const largestWin = trades.reduce((max, trade) => 
    trade.realizedPL > max.realizedPL ? trade : max
  );
  
  const largestLoss = trades.reduce((min, trade) => 
    trade.realizedPL < min.realizedPL ? trade : min
  );
  
  return {
    largestWin: largestWin.realizedPL > 0 ? largestWin : null,
    largestLoss: largestLoss.realizedPL < 0 ? largestLoss : null
  };
};

/**
 * Calculate consecutive wins and losses streaks
 * @param trades - Array of trades sorted by timestamp
 * @returns Object with current and maximum streaks
 */
export const calculateStreaks = (trades: Trade[]): {
  currentWinStreak: number;
  currentLossStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
} => {
  if (trades.length === 0) {
    return { currentWinStreak: 0, currentLossStreak: 0, maxWinStreak: 0, maxLossStreak: 0 };
  }
  
  const sortedTrades = [...trades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;
  
  // Calculate streaks
  for (let i = 0; i < sortedTrades.length; i++) {
    const trade = sortedTrades[i];
    
    if (trade.realizedPL > 0) {
      tempWinStreak++;
      tempLossStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, tempWinStreak);
    } else if (trade.realizedPL < 0) {
      tempLossStreak++;
      tempWinStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, tempLossStreak);
    }
  }
  
  // Calculate current streaks (from the end)
  for (let i = sortedTrades.length - 1; i >= 0; i--) {
    const trade = sortedTrades[i];
    
    if (trade.realizedPL > 0 && currentLossStreak === 0) {
      currentWinStreak++;
    } else if (trade.realizedPL < 0 && currentWinStreak === 0) {
      currentLossStreak++;
    } else {
      break;
    }
  }
  
  return { currentWinStreak, currentLossStreak, maxWinStreak, maxLossStreak };
};

/**
 * Group trades by ticker symbol for analysis
 * @param trades - Array of trades to group
 * @returns Map of ticker symbols to their trades
 */
export const groupTradesByTicker = (trades: Trade[]): Map<string, Trade[]> => {
  const tickerMap = new Map<string, Trade[]>();
  
  trades.forEach(trade => {
    const ticker = trade.ticker.toUpperCase();
    if (!tickerMap.has(ticker)) {
      tickerMap.set(ticker, []);
    }
    tickerMap.get(ticker)!.push(trade);
  });
  
  return tickerMap;
};

/**
 * Calculate performance metrics for a specific ticker
 * @param trades - Array of trades for the ticker
 * @returns Performance metrics object
 */
export const calculateTickerPerformance = (trades: Trade[]) => {
  if (trades.length === 0) {
    return {
      totalPL: 0,
      totalTrades: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0
    };
  }
  
  const totalPL = trades.reduce((sum, trade) => sum + trade.realizedPL, 0);
  const wins = trades.filter(trade => trade.realizedPL > 0);
  const losses = trades.filter(trade => trade.realizedPL < 0);
  
  const avgWin = wins.length > 0 
    ? wins.reduce((sum, trade) => sum + trade.realizedPL, 0) / wins.length 
    : 0;
  const avgLoss = losses.length > 0 
    ? Math.abs(losses.reduce((sum, trade) => sum + trade.realizedPL, 0) / losses.length)
    : 0;
  
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
  
  return {
    totalPL,
    totalTrades: trades.length,
    winRate: (wins.length / trades.length) * 100,
    avgWin,
    avgLoss,
    profitFactor
  };
};

/**
 * Validate trade data for completeness and accuracy
 * @param trade - Partial trade object to validate
 * @returns Validation result with errors if any
 */
export const validateTrade = (trade: Partial<Trade>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Required field validation
  if (!trade.ticker || trade.ticker.trim() === '') {
    errors.push('Ticker symbol is required');
  }
  
  if (typeof trade.entryPrice !== 'number' || trade.entryPrice <= 0) {
    errors.push('Entry price must be a positive number');
  }
  
  if (typeof trade.exitPrice !== 'number' || trade.exitPrice <= 0) {
    errors.push('Exit price must be a positive number');
  }
  
  if (typeof trade.quantity !== 'number' || trade.quantity <= 0 || !Number.isInteger(trade.quantity)) {
    errors.push('Quantity must be a positive integer');
  }
  
  if (!trade.direction || !['long', 'short'].includes(trade.direction)) {
    errors.push('Direction must be either "long" or "short"');
  }
  
  if (!trade.timestamp || !(trade.timestamp instanceof Date) || isNaN(trade.timestamp.getTime())) {
    errors.push('Valid timestamp is required');
  }
  
  // Business logic validation
  if (trade.entryPrice && trade.exitPrice && trade.entryPrice === trade.exitPrice) {
    errors.push('Entry and exit prices cannot be the same');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sort trades by timestamp in descending order (newest first)
 * @param trades - Array of trades to sort
 * @returns Sorted array of trades
 */
export const sortTradesByTimestamp = (trades: Trade[], ascending: boolean = false): Trade[] => {
  return [...trades].sort((a, b) => {
    const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
    const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
    
    return ascending ? aTime - bTime : bTime - aTime;
  });
};

/**
 * Calculate running equity curve data points
 * @param trades - Array of trades sorted by timestamp
 * @returns Array of cumulative P&L values
 */
export const calculateEquityCurve = (trades: Trade[]): number[] => {
  const sortedTrades = sortTradesByTimestamp(trades, true); // Ascending order
  const equityCurve: number[] = [];
  let runningTotal = 0;
  
  sortedTrades.forEach(trade => {
    runningTotal += trade.realizedPL;
    equityCurve.push(runningTotal);
  });
  
  return equityCurve;
};

/**
 * Calculate maximum drawdown from equity curve
 * @param trades - Array of trades to analyze
 * @returns Maximum drawdown amount and percentage
 */
export const calculateMaxDrawdown = (trades: Trade[]): { amount: number; percentage: number } => {
  if (trades.length === 0) {
    return { amount: 0, percentage: 0 };
  }
  
  const equityCurve = calculateEquityCurve(trades);
  let maxDrawdown = 0;
  let peak = equityCurve[0];
  let maxPercentageDrawdown = 0;
  
  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i] > peak) {
      peak = equityCurve[i];
    } else {
      const drawdown = peak - equityCurve[i];
      const percentageDrawdown = peak > 0 ? (drawdown / peak) * 100 : 0;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxPercentageDrawdown = percentageDrawdown;
      }
    }
  }
  
  return {
    amount: maxDrawdown,
    percentage: maxPercentageDrawdown
  };
};