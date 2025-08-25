// src/components/AIInsights.tsx - Fixed version with proper function organization
import React, { useMemo } from 'react';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  Target, 
  Lightbulb 
} from 'lucide-react';
import { 
  isWithinInterval, 
  startOfWeek, 
  endOfWeek, 
  subWeeks,
  getHours,
  getDay,
  format,
  differenceInMinutes
} from 'date-fns';

// Types
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';

interface AIInsightsProps {
  trades: Trade[];
  selectedDate: Date;
}

interface Pattern {
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  confidence: number;
  icon: React.ElementType;
  actionable?: string;
}

interface TimePerformance {
  hour: number;
  pl: number;
  tradeCount: number;
  winRate: number;
}

interface TickerPerformance {
  ticker: string;
  pl: number;
  tradeCount: number;
  winRate: number;
}

// Constants
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MINIMUM_TRADES_FOR_INSIGHTS = 5;
const ANALYSIS_WEEKS = 4;

/**
 * Format hour for display (e.g., 14 -> "2:00 PM")
 */
const formatHour = (hour: number): string => {
  if (hour > 12) return `${hour - 12}:00 PM`;
  if (hour === 12) return '12:00 PM';
  return `${hour}:00 AM`;
};

/**
 * Analyze for overtrading patterns
 */
const analyzeOvertrading = (recentTrades: Trade[], patterns: Pattern[]): void => {
  const tradesPerDay = recentTrades.reduce((acc, trade) => {
    const dateKey = format(trade.timestamp, 'yyyy-MM-dd');
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgTradesPerDay = Object.values(tradesPerDay).reduce((sum, count) => sum + count, 0) / Object.keys(tradesPerDay).length;
  const maxTradesInDay = Math.max(...Object.values(tradesPerDay));

  if (maxTradesInDay > 20 || avgTradesPerDay > 10) {
    patterns.push({
      type: 'warning',
      title: 'Potential Overtrading Detected',
      description: `You averaged ${avgTradesPerDay.toFixed(1)} trades per day with a peak of ${maxTradesInDay} trades. Consider reducing frequency.`,
      confidence: maxTradesInDay > 25 ? 0.9 : 0.7,
      icon: AlertTriangle,
      actionable: `Try limiting yourself to ${Math.max(5, Math.floor(avgTradesPerDay * 0.7))} trades per day for better focus.`
    });
  }
};

/**
 * Analyze time-based performance patterns
 */
const analyzeTimeBasedPerformance = (recentTrades: Trade[], patterns: Pattern[]): void => {
  const timePerformance: Record<number, TimePerformance> = {};
  
  recentTrades.forEach(trade => {
    const hour = getHours(trade.timestamp);
    if (!timePerformance[hour]) {
      timePerformance[hour] = { hour, pl: 0, tradeCount: 0, winRate: 0 };
    }
    timePerformance[hour].pl += trade.realizedPL;
    timePerformance[hour].tradeCount += 1;
  });

  // Calculate win rates for each hour
  Object.keys(timePerformance).forEach(hourStr => {
    const hour = parseInt(hourStr);
    const hourTrades = recentTrades.filter(t => getHours(t.timestamp) === hour);
    const wins = hourTrades.filter(t => t.realizedPL > 0).length;
    timePerformance[hour].winRate = wins / hourTrades.length;
  });

  const significantHours = Object.values(timePerformance).filter(h => h.tradeCount >= 3);
  const bestHours = significantHours.sort((a, b) => b.pl - a.pl).slice(0, 2);
  const worstHours = significantHours.sort((a, b) => a.pl - b.pl).slice(0, 2);

  // Best performance hours
  if (bestHours.length > 0 && bestHours[0].pl > 0) {
    patterns.push({
      type: 'success',
      title: 'Peak Performance Hours Identified',
      description: `Your best trading hours are ${bestHours.map(h => formatHour(h.hour)).join(' and ')} with ${formatCurrency(bestHours[0].pl)} average P&L.`,
      confidence: 0.8,
      icon: Clock,
      actionable: `Focus your most important trades during ${bestHours.map(h => formatHour(h.hour)).join(' and ')}.`
    });
  }

  // Worst performance hours
  if (worstHours.length > 0 && worstHours[0].pl < -100) {
    patterns.push({
      type: 'danger',
      title: 'Problematic Trading Hours',
      description: `You tend to lose money trading at ${worstHours.map(h => formatHour(h.hour)).join(' and ')} (${formatCurrency(worstHours[0].pl)} average loss).`,
      confidence: 0.8,
      icon: AlertTriangle,
      actionable: `Consider avoiding trades during ${worstHours.map(h => formatHour(h.hour)).join(' and ')} or reducing position sizes.`
    });
  }
};

/**
 * Analyze day of week performance patterns
 */
const analyzeDayOfWeekPerformance = (recentTrades: Trade[], patterns: Pattern[]): void => {
  const dayPerformance: Record<number, { pl: number; tradeCount: number; winRate: number }> = {};
  
  recentTrades.forEach(trade => {
    const day = getDay(trade.timestamp);
    if (!dayPerformance[day]) {
      dayPerformance[day] = { pl: 0, tradeCount: 0, winRate: 0 };
    }
    dayPerformance[day].pl += trade.realizedPL;
    dayPerformance[day].tradeCount += 1;
  });

  // Calculate win rates for each day
  Object.keys(dayPerformance).forEach(dayStr => {
    const day = parseInt(dayStr);
    const dayTrades = recentTrades.filter(t => getDay(t.timestamp) === day);
    const wins = dayTrades.filter(t => t.realizedPL > 0).length;
    dayPerformance[day].winRate = wins / dayTrades.length;
  });

  const significantDays = Object.entries(dayPerformance).filter(([_, data]) => data.tradeCount >= 3);
  const bestDay = significantDays.sort(([_, a], [__, b]) => b.pl - a.pl)[0];
  const worstDay = significantDays.sort(([_, a], [__, b]) => a.pl - b.pl)[0];

  // Best trading day
  if (bestDay && bestDay[1].pl > 0 && bestDay[1].winRate > 0.6) {
    patterns.push({
      type: 'success',
      title: 'Best Trading Day Identified',
      description: `${DAY_NAMES[parseInt(bestDay[0])]} is your strongest day with ${formatCurrency(bestDay[1].pl)} P&L and ${(bestDay[1].winRate * 100).toFixed(1)}% win rate.`,
      confidence: 0.7,
      icon: TrendingUp,
      actionable: `Consider allocating more capital or taking higher conviction trades on ${DAY_NAMES[parseInt(bestDay[0])]}.`
    });
  }

  // Worst trading day
  if (worstDay && worstDay[1].pl < -200) {
    patterns.push({
      type: 'warning',
      title: 'Challenging Trading Day',
      description: `${DAY_NAMES[parseInt(worstDay[0])]} shows consistent losses (${formatCurrency(worstDay[1].pl)}) with ${(worstDay[1].winRate * 100).toFixed(1)}% win rate.`,
      confidence: 0.7,
      icon: TrendingDown,
      actionable: `Be extra cautious on ${DAY_NAMES[parseInt(worstDay[0])]} or consider taking smaller positions.`
    });
  }
};

/**
 * Analyze ticker-specific performance patterns
 */
const analyzeTickerPerformance = (recentTrades: Trade[], patterns: Pattern[]): void => {
  const tickerPerformance: Record<string, TickerPerformance> = {};
  
  recentTrades.forEach(trade => {
    if (!tickerPerformance[trade.ticker]) {
      tickerPerformance[trade.ticker] = { ticker: trade.ticker, pl: 0, tradeCount: 0, winRate: 0 };
    }
    tickerPerformance[trade.ticker].pl += trade.realizedPL;
    tickerPerformance[trade.ticker].tradeCount += 1;
  });

  // Calculate win rates for each ticker
  Object.keys(tickerPerformance).forEach(ticker => {
    const tickerTrades = recentTrades.filter(t => t.ticker === ticker);
    const wins = tickerTrades.filter(t => t.realizedPL > 0).length;
    tickerPerformance[ticker].winRate = wins / tickerTrades.length;
  });

  const significantTickers = Object.values(tickerPerformance).filter(t => t.tradeCount >= 3);
  const bestTicker = significantTickers.sort((a, b) => b.pl - a.pl)[0];
  const worstTicker = significantTickers.sort((a, b) => a.pl - b.pl)[0];

  // Best performing ticker
  if (bestTicker && bestTicker.pl > 500 && bestTicker.winRate > 0.6) {
    patterns.push({
      type: 'success',
      title: 'High-Performance Ticker',
      description: `${bestTicker.ticker} is your best performer with ${formatCurrency(bestTicker.pl)} P&L across ${bestTicker.tradeCount} trades (${(bestTicker.winRate * 100).toFixed(1)}% win rate).`,
      confidence: 0.8,
      icon: Target,
      actionable: `Consider increasing position size or frequency when trading ${bestTicker.ticker}.`
    });
  }

  // Worst performing ticker
  if (worstTicker && worstTicker.pl < -500 && worstTicker.tradeCount >= 5) {
    patterns.push({
      type: 'danger',
      title: 'Problematic Ticker',
      description: `${worstTicker.ticker} has cost you ${formatCurrency(Math.abs(worstTicker.pl))} with a ${(worstTicker.winRate * 100).toFixed(1)}% win rate across ${worstTicker.tradeCount} trades.`,
      confidence: 0.8,
      icon: AlertTriangle,
      actionable: `Avoid or significantly reduce exposure to ${worstTicker.ticker} until you identify what's going wrong.`
    });
  }
};

/**
 * Analyze consecutive loss patterns
 */
const analyzeConsecutiveLosses = (recentTrades: Trade[], patterns: Pattern[]): void => {
  let consecutiveLosses = 0;
  let maxConsecutiveLosses = 0;
  let currentStreak = 0;

  // Find maximum consecutive losses in entire dataset
  recentTrades.forEach(trade => {
    if (trade.realizedPL < 0) {
      currentStreak++;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  // Check current losing streak (from end of trades)
  for (let i = recentTrades.length - 1; i >= 0; i--) {
    if (recentTrades[i].realizedPL < 0) {
      consecutiveLosses++;
    } else {
      break;
    }
  }

  if (consecutiveLosses >= 3) {
    patterns.push({
      type: 'warning',
      title: 'Current Losing Streak',
      description: `You're currently on a ${consecutiveLosses}-trade losing streak. Consider taking a break or reducing position sizes.`,
      confidence: 0.9,
      icon: AlertTriangle,
      actionable: `Take a step back, review your recent trades, and consider paper trading until you break the pattern.`
    });
  }
};

/**
 * Analyze win/loss ratio and profit factor
 */
const analyzeWinLossRatio = (recentTrades: Trade[], patterns: Pattern[]): void => {
  const wins = recentTrades.filter(t => t.realizedPL > 0);
  const losses = recentTrades.filter(t => t.realizedPL < 0);
  
  if (wins.length === 0 || losses.length === 0) return;
  
  const winRate = wins.length / recentTrades.length;
  const avgWin = wins.reduce((sum, t) => sum + t.realizedPL, 0) / wins.length;
  const avgLoss = Math.abs(losses.reduce((sum, t) => sum + t.realizedPL, 0) / losses.length);
  const profitFactor = avgWin / avgLoss;

  // Poor performance indicators
  if (winRate < 0.4 && profitFactor < 1.2) {
    patterns.push({
      type: 'danger',
      title: 'Low Win Rate & Profit Factor',
      description: `Your win rate is ${(winRate * 100).toFixed(1)}% with a profit factor of ${profitFactor.toFixed(2)}. This suggests room for improvement.`,
      confidence: 0.8,
      icon: TrendingDown,
      actionable: `Focus on cutting losses quicker or letting winners run longer to improve your profit factor.`
    });
  }

  // Strong performance indicators
  if (winRate > 0.6 && profitFactor > 2) {
    patterns.push({
      type: 'success',
      title: 'Strong Risk Management',
      description: `Excellent ${(winRate * 100).toFixed(1)}% win rate with ${profitFactor.toFixed(2)} profit factor. You're managing risk well.`,
      confidence: 0.8,
      icon: Target,
      actionable: `Consider gradually increasing position sizes to capitalize on your good risk management.`
    });
  }
};

/**
 * AI-powered trading insights component that analyzes patterns and provides recommendations
 */
export const AIInsights: React.FC<AIInsightsProps> = ({ trades, selectedDate }) => {
  const insights = useMemo(() => {
    if (trades.length < MINIMUM_TRADES_FOR_INSIGHTS) {
      return [];
    }

    const patterns: Pattern[] = [];
    
    // Get recent trades for analysis (last 4 weeks)
    const fourWeeksAgo = startOfWeek(subWeeks(selectedDate, ANALYSIS_WEEKS));
    const currentWeek = endOfWeek(selectedDate);
    
    const recentTrades = trades
      .filter(trade => isWithinInterval(trade.timestamp, { start: fourWeeksAgo, end: currentWeek }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (recentTrades.length < MINIMUM_TRADES_FOR_INSIGHTS) {
      return patterns;
    }

    // Run analysis functions
    analyzeOvertrading(recentTrades, patterns);
    analyzeTimeBasedPerformance(recentTrades, patterns);
    analyzeDayOfWeekPerformance(recentTrades, patterns);
    analyzeTickerPerformance(recentTrades, patterns);
    analyzeConsecutiveLosses(recentTrades, patterns);
    analyzeWinLossRatio(recentTrades, patterns);

    // Sort by confidence and return top 5
    return patterns.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }, [trades, selectedDate]);

  /**
   * Get color classes for different pattern types
   */
  const getColorClasses = (type: string) => {
    const colorMaps = {
      success: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        icon: 'text-green-600',
        title: 'text-green-800 dark:text-green-200',
        text: 'text-green-700 dark:text-green-300'
      },
      warning: {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: 'text-yellow-600',
        title: 'text-yellow-800 dark:text-yellow-200',
        text: 'text-yellow-700 dark:text-yellow-300'
      },
      danger: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-600',
        title: 'text-red-800 dark:text-red-200',
        text: 'text-red-700 dark:text-red-300'
      },
      info: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        icon: 'text-blue-600',
        title: 'text-blue-800 dark:text-blue-200',
        text: 'text-blue-700 dark:text-blue-300'
      }
    };

    return colorMaps[type as keyof typeof colorMaps] || colorMaps.info;
  };

  /**
   * Render empty state when insufficient data
   */
  const renderEmptyState = (icon: React.ElementType, title: string, description: string) => {
    const Icon = icon;
    
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <Icon className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-2">{title}</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">{description}</p>
      </div>
    );
  };

  // Early returns for insufficient data
  if (trades.length < MINIMUM_TRADES_FOR_INSIGHTS) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <Brain className="h-6 w-6 text-purple-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Trading Insights
          </h3>
        </div>
        {renderEmptyState(
          Lightbulb,
          'Need more data to generate insights',
          'Add at least 5 trades to see AI-powered pattern analysis and personalized recommendations'
        )}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <Brain className="h-6 w-6 text-purple-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Trading Insights
          </h3>
        </div>
        {renderEmptyState(
          Target,
          'No significant patterns detected yet',
          'Keep trading to build up data for more detailed analysis'
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Brain className="h-6 w-6 text-purple-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Trading Insights
          </h3>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
          AI Analysis
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const colors = getColorClasses(insight.type);
          const Icon = insight.icon;
          
          return (
            <div
              key={index}
              className={`${colors.bg} ${colors.border} border rounded-lg p-4`}
            >
              <div className="flex items-start">
                <Icon className={`h-5 w-5 ${colors.icon} mr-3 mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  {/* Header with confidence badge */}
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-medium ${colors.title}`}>
                      {insight.title}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-800 ${colors.text}`}>
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  </div>
                  
                  {/* Description */}
                  <p className={`text-sm ${colors.text} mb-3`}>
                    {insight.description}
                  </p>
                  
                  {/* Actionable recommendation */}
                  {insight.actionable && (
                    <div className={`text-xs ${colors.text} bg-white dark:bg-gray-800 rounded-md p-2 border-l-2 ${colors.border}`}>
                      <strong>💡 Recommendation:</strong> {insight.actionable}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with analysis stats */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Insights based on your last {ANALYSIS_WEEKS} weeks of trading data • 
          <span className="font-medium">
            {trades.filter(t => 
              isWithinInterval(t.timestamp, { 
                start: startOfWeek(subWeeks(selectedDate, ANALYSIS_WEEKS)), 
                end: endOfWeek(selectedDate) 
              })
            ).length} trades analyzed
          </span>
        </p>
      </div>
    </div>
  );
};