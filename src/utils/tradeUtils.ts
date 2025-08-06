import { Trade, DailyStats, HourlyStats } from '../types/trade';
import { format, parseISO, startOfDay, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays } from 'date-fns';

export const generateTradeId = (): string => {
  return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to normalize date to local midnight (fixes timezone issues)
const normalizeToLocalDate = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

// Helper function to check if two dates are the same day (timezone-safe)
const isSameDayLocal = (date1: Date, date2: Date): boolean => {
  const d1 = normalizeToLocalDate(date1);
  const d2 = normalizeToLocalDate(date2);
  return d1.getTime() === d2.getTime();
};

export const calculateDailyStats = (trades: Trade[], date: Date): DailyStats => {
  // Normalize the target date to avoid timezone issues
  const targetDate = normalizeToLocalDate(date);
  
  const dayTrades = trades.filter(trade => {
    const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
    return isSameDayLocal(tradeDate, targetDate);
  });
  
  const totalPL = dayTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
  const wins = dayTrades.filter(trade => trade.realizedPL > 0);
  const losses = dayTrades.filter(trade => trade.realizedPL < 0);
  
  const avgWin = wins.length > 0 ? wins.reduce((sum, trade) => sum + trade.realizedPL, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((sum, trade) => sum + trade.realizedPL, 0) / losses.length : 0;
  
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

export const calculateHourlyStats = (trades: Trade[], date: Date): HourlyStats[] => {
  const targetDate = normalizeToLocalDate(date);
  
  const dayTrades = trades.filter(trade => {
    const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
    return isSameDayLocal(tradeDate, targetDate);
  });
  
  const hourlyData: { [hour: number]: { pl: number; count: number } } = {};
  
  // Initialize extended trading hours (4:00 AM to 8:00 PM)
  for (let hour = 4; hour <= 20; hour++) {
    hourlyData[hour] = { pl: 0, count: 0 };
  }
  
  dayTrades.forEach(trade => {
    const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
    const hour = tradeDate.getHours();
    if (hour >= 4 && hour <= 20) {
      hourlyData[hour].pl += trade.realizedPL;
      hourlyData[hour].count += 1;
    }
  });
  
  return Object.entries(hourlyData).map(([hour, data]) => ({
    hour: parseInt(hour),
    totalPL: data.pl,
    tradeCount: data.count,
    avgPL: data.count > 0 ? data.pl / data.count : 0,
  }));
};

export const getWeeklyStats = (trades: Trade[], date: Date) => {
  const targetDate = normalizeToLocalDate(date);
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
  
  const weekTrades = trades.filter(trade => {
    const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
    const normalizedTradeDate = normalizeToLocalDate(tradeDate);
    return normalizedTradeDate >= weekStart && normalizedTradeDate <= weekEnd;
  });
  
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

export const getCalendarData = (trades: Trade[], currentDate: Date) => {
  const normalizedCurrentDate = normalizeToLocalDate(currentDate);
  const startDate = subDays(startOfWeek(subDays(normalizedCurrentDate, 21), { weekStartsOn: 1 }), 0);
  const endDate = addDays(endOfWeek(addDays(normalizedCurrentDate, 21), { weekStartsOn: 1 }), 0);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  return days.map(day => {
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

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatTime = (hour: number): string => {
  // Extended trading hours formatting
  if (hour === 4) return '4:00 AM';
  if (hour === 9) return '9:30 AM'; // Market open
  if (hour === 16) return '4:00 PM'; // Market close
  if (hour === 20) return '8:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
};