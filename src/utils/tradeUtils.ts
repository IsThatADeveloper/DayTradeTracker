import { Trade, DailyStats, HourlyStats } from '../types/trade';
import { format, parseISO, startOfDay, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays } from 'date-fns';

export const generateTradeId = (): string => {
  return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const calculateDailyStats = (trades: Trade[], date: Date): DailyStats => {
  const dayTrades = trades.filter(trade => isSameDay(trade.timestamp, date));
  
  const totalPL = dayTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
  const wins = dayTrades.filter(trade => trade.realizedPL > 0);
  const losses = dayTrades.filter(trade => trade.realizedPL < 0);
  
  const avgWin = wins.length > 0 ? wins.reduce((sum, trade) => sum + trade.realizedPL, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((sum, trade) => sum + trade.realizedPL, 0) / losses.length : 0;
  
  return {
    date: format(date, 'yyyy-MM-dd'),
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
  const dayTrades = trades.filter(trade => isSameDay(trade.timestamp, date));
  const hourlyData: { [hour: number]: { pl: number; count: number } } = {};
  
  // Initialize trading hours (9:30 AM to 4:00 PM)
  for (let hour = 9; hour <= 16; hour++) {
    hourlyData[hour] = { pl: 0, count: 0 };
  }
  
  dayTrades.forEach(trade => {
    const hour = trade.timestamp.getHours();
    if (hour >= 9 && hour <= 16) {
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
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  
  const weekTrades = trades.filter(trade => {
    const tradeDate = new Date(trade.timestamp);
    return tradeDate >= weekStart && tradeDate <= weekEnd;
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
  const startDate = subDays(startOfWeek(subDays(currentDate, 21), { weekStartsOn: 1 }), 0);
  const endDate = addDays(endOfWeek(addDays(currentDate, 21), { weekStartsOn: 1 }), 0);
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  return days.map(day => {
    const dayTrades = trades.filter(trade => isSameDay(new Date(trade.timestamp), day));
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
  if (hour === 9) return '9:30 AM';
  if (hour === 16) return '4:00 PM';
  if (hour > 12) return `${hour - 12}:00 PM`;
  return `${hour}:00 AM`;
};