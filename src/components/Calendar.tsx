// src/components/Calendar.tsx - Simple two-date picker with range analysis
import React, { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth, 
  isToday, 
  isSameDay,
  isWithinInterval,
  startOfDay,
  endOfDay,
  isBefore,
  differenceInDays
} from 'date-fns';

// Types
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';

interface CalendarProps {
  trades: Trade[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  currentMonth: Date;
  onDateDoubleClick?: (date: Date) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const Calendar: React.FC<CalendarProps> = ({
  trades,
  selectedDate,
  onDateSelect,
  onMonthChange,
  currentMonth,
  onDateDoubleClick,
}) => {
  // Two-date selection state
  const [firstDate, setFirstDate] = useState<Date | null>(null);
  const [secondDate, setSecondDate] = useState<Date | null>(null);

  // Calendar data calculation
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    return days.map(day => {
      const dayTrades = trades.filter(trade => {
        const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
        return isSameDay(tradeDate, day);
      });
      
      const totalPL = dayTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
      
      return {
        date: day,
        totalPL,
        tradeCount: dayTrades.length,
        hasData: dayTrades.length > 0,
        isCurrentMonth: isSameMonth(day, currentMonth)
      };
    });
  }, [trades, currentMonth]);

  // Format compact P&L
  const formatCompactPL = (amount: number): string => {
    if (Math.abs(amount) >= 1000) {
      return `${amount > 0 ? '+' : ''}${(amount / 1000).toFixed(1)}k`;
    }
    return `${amount > 0 ? '+' : ''}${Math.round(amount)}`;
  };

  // Handle day click - simple two-date selection
  const handleDayClick = useCallback((date: Date) => {
    // Always update the main selected date for daily view
    onDateSelect(date);
    
    // Handle two-date selection
    if (!firstDate) {
      // No dates selected - this becomes first date
      setFirstDate(date);
      setSecondDate(null);
    } else if (!secondDate) {
      // First date selected - this becomes second date
      if (isBefore(date, firstDate)) {
        // If clicked date is before first date, swap them
        setSecondDate(firstDate);
        setFirstDate(date);
      } else {
        setSecondDate(date);
      }
    } else {
      // Both dates selected - start over
      setFirstDate(date);
      setSecondDate(null);
    }
  }, [onDateSelect, firstDate, secondDate]);

  // Handle double click
  const handleDoubleClick = useCallback((date: Date) => {
    if (onDateDoubleClick) {
      onDateDoubleClick(date);
    }
  }, [onDateDoubleClick]);

  // Clear date selection
  const clearSelection = useCallback(() => {
    setFirstDate(null);
    setSecondDate(null);
  }, []);

  // Check if date is in selected range
  const isInSelectedRange = useCallback((date: Date): boolean => {
    if (!firstDate) return false;
    if (!secondDate) return isSameDay(date, firstDate);
    
    return isWithinInterval(date, {
      start: startOfDay(firstDate),
      end: endOfDay(secondDate)
    });
  }, [firstDate, secondDate]);

  // Get styling for each day
  const getDayClasses = useCallback((day: any): string => {
    const inRange = isInSelectedRange(day.date);
    const isFirstDate = firstDate && isSameDay(day.date, firstDate);
    const isSecondDate = secondDate && isSameDay(day.date, secondDate);
    const isTodayDate = isToday(day.date);
    
    let classes = 'relative h-16 sm:h-20 border border-gray-200 dark:border-gray-600 cursor-pointer transition-colors duration-200 ';
    
    // Selection styling (highest priority)
    if (isFirstDate || isSecondDate) {
      classes += 'bg-blue-600 text-white hover:bg-blue-700 ';
    } else if (inRange) {
      classes += 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800/50 ';
    }
    // Today styling
    else if (isTodayDate) {
      if (day.hasData && day.isCurrentMonth) {
        if (day.totalPL > 0) {
          classes += 'bg-green-100 dark:bg-green-900/30 ring-2 ring-blue-500 hover:bg-green-200 dark:hover:bg-green-800/50 ';
        } else {
          classes += 'bg-red-100 dark:bg-red-900/30 ring-2 ring-blue-500 hover:bg-red-200 dark:hover:bg-red-800/50 ';
        }
      } else {
        classes += 'bg-white dark:bg-gray-800 ring-2 ring-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 ';
      }
    }
    // Performance coloring (full box)
    else if (day.hasData && day.isCurrentMonth) {
      if (day.totalPL > 0) {
        classes += 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/50 ';
      } else {
        classes += 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/50 ';
      }
    }
    // Regular days
    else if (day.isCurrentMonth) {
      classes += 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 ';
    }
    // Outside current month
    else {
      classes += 'bg-gray-50 dark:bg-gray-850 opacity-50 ';
    }
    
    return classes;
  }, [firstDate, secondDate, isInSelectedRange]);

  // Get text color for content
  const getTextColor = useCallback((day: any): string => {
    const isFirstDate = firstDate && isSameDay(day.date, firstDate);
    const isSecondDate = secondDate && isSameDay(day.date, secondDate);
    const inRange = isInSelectedRange(day.date);
    
    // Selected dates
    if (isFirstDate || isSecondDate) {
      return 'text-white';
    }
    
    // In range
    if (inRange) {
      return 'text-blue-900 dark:text-blue-100';
    }
    
    // Non-current month
    if (!day.isCurrentMonth) {
      return 'text-gray-400 dark:text-gray-500';
    }
    
    // Days with trading data
    if (day.hasData) {
      if (day.totalPL > 0) {
        return 'text-green-800 dark:text-green-200';
      } else {
        return 'text-red-800 dark:text-red-200';
      }
    }
    
    // Regular days
    return 'text-gray-900 dark:text-gray-100';
  }, [firstDate, secondDate, isInSelectedRange]);

  // Calculate range statistics
  const rangeStats = useMemo(() => {
    if (!firstDate) return null;
    
    const startDate = firstDate;
    const endDate = secondDate || firstDate;
    
    const rangeTrades = trades.filter(trade => {
      const tradeDate = trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp);
      return isWithinInterval(tradeDate, {
        start: startOfDay(startDate),
        end: endOfDay(endDate)
      });
    });
    
    const totalPL = rangeTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
    const wins = rangeTrades.filter(trade => trade.realizedPL > 0).length;
    const losses = rangeTrades.filter(trade => trade.realizedPL < 0).length;
    const dayCount = secondDate ? differenceInDays(endDate, startDate) + 1 : 1;
    
    // Calculate average per day
    const avgPerDay = dayCount > 0 ? totalPL / dayCount : 0;
    
    return {
      totalPL,
      tradeCount: rangeTrades.length,
      winCount: wins,
      lossCount: losses,
      dayCount,
      avgPerDay,
      winRate: rangeTrades.length > 0 ? (wins / rangeTrades.length) * 100 : 0
    };
  }, [firstDate, secondDate, trades]);

  // Split calendar data into weeks
  const weeks = [];
  for (let i = 0; i < calendarData.length; i += 7) {
    weeks.push(calendarData.slice(i, i + 7));
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Trading Calendar
        </h3>
        
        <div className="flex items-center space-x-4">
          {/* Date Range Display */}
          {firstDate && secondDate && (
            <div className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-lg">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {format(firstDate, 'MMM d')} - {format(secondDate, 'MMM d')}
              </span>
              <button 
                onClick={clearSelection}
                className="text-blue-700 dark:text-blue-300 hover:text-blue-900 ml-2 text-lg"
                title="Clear selection"
              >
                ×
              </button>
            </div>
          )}
          
          {/* Month Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onMonthChange(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            <h4 className="text-lg font-medium text-gray-900 dark:text-white min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </h4>
            
            <button
              onClick={() => onMonthChange(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Next month"
            >
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select Date Range for Analysis
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            {/* From Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={firstDate ? format(firstDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const newDate = new Date(e.target.value);
                    setFirstDate(newDate);
                    onDateSelect(newDate);
                    // If second date is before first date, clear it
                    if (secondDate && isBefore(secondDate, newDate)) {
                      setSecondDate(null);
                    }
                  } else {
                    setFirstDate(null);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            
            {/* To Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={secondDate ? format(secondDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const newDate = new Date(e.target.value);
                    // Only set if we have a first date and this date is after it
                    if (firstDate) {
                      if (isBefore(newDate, firstDate)) {
                        // If selected date is before first date, swap them
                        setSecondDate(firstDate);
                        setFirstDate(newDate);
                        onDateSelect(newDate);
                      } else {
                        setSecondDate(newDate);
                      }
                    } else {
                      // If no first date, this becomes the first date
                      setFirstDate(newDate);
                      onDateSelect(newDate);
                    }
                  } else {
                    setSecondDate(null);
                  }
                }}
                min={firstDate ? format(firstDate, 'yyyy-MM-dd') : undefined}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            
            {/* Clear Button */}
            <div className="flex space-x-2">
              <button
                onClick={clearSelection}
                disabled={!firstDate && !secondDate}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              
              {/* Quick Ranges */}
              <div className="flex space-x-1">
                <button
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    setFirstDate(weekAgo);
                    setSecondDate(today);
                    onDateSelect(today);
                  }}
                  className="px-2 py-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                  title="Last 7 days"
                >
                  7D
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                    setFirstDate(monthAgo);
                    setSecondDate(today);
                    onDateSelect(today);
                  }}
                  className="px-2 py-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                  title="Last 30 days"
                >
                  30D
                </button>
              </div>
            </div>
          </div>
          
          {/* Range Status */}
          {firstDate && (
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {!secondDate ? (
                  <>Selected: <span className="font-medium text-blue-600 dark:text-blue-400">{format(firstDate, 'MMM d, yyyy')}</span> (single day)</>
                ) : (
                  <>Range: <span className="font-medium text-blue-600 dark:text-blue-400">{format(firstDate, 'MMM d, yyyy')} - {format(secondDate, 'MMM d, yyyy')}</span> ({differenceInDays(secondDate, firstDate) + 1} days)</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Use date pickers above or click calendar dates • Double-click any date to view daily details
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-2">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2">
          {DAY_NAMES.map((day) => (
            <div key={day} className="h-8 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={getDayClasses(day)}
                onClick={() => handleDayClick(day.date)}
                onDoubleClick={() => handleDoubleClick(day.date)}
                title={day.hasData ? `${formatCurrency(day.totalPL)} (${day.tradeCount} trades)` : format(day.date, 'MMM d')}
              >
                {/* Date Number */}
                <div className="absolute top-2 left-2">
                  <span className={`text-sm font-medium ${getTextColor(day)}`}>
                    {format(day.date, 'd')}
                  </span>
                </div>
                
                {/* Selection Indicators */}
                {firstDate && isSameDay(day.date, firstDate) && (
                  <div className="absolute top-2 right-2">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">1</span>
                    </div>
                  </div>
                )}
                {secondDate && isSameDay(day.date, secondDate) && (
                  <div className="absolute top-2 right-2">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">2</span>
                    </div>
                  </div>
                )}
                
                {/* Today Indicator */}
                {isToday(day.date) && !isInSelectedRange(day.date) && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
                
                {/* Trading Data */}
                {day.hasData && day.isCurrentMonth && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className={`text-xs font-medium truncate ${getTextColor(day)}`}>
                      {formatCompactPL(day.totalPL)}
                    </div>
                    <div className={`text-xs truncate opacity-75 ${getTextColor(day)}`}>
                      {day.tradeCount} trade{day.tradeCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded border border-gray-200 dark:border-gray-600"></div>
          <span className="text-gray-600 dark:text-gray-400">Profitable Days</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 rounded border border-gray-200 dark:border-gray-600"></div>
          <span className="text-gray-600 dark:text-gray-400">Loss Days</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-600 rounded border border-gray-200 dark:border-gray-600"></div>
          <span className="text-gray-600 dark:text-gray-400">Selected Range</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">Today</span>
        </div>
      </div>

      {/* Range Analysis */}
      {rangeStats && (
        <div className="mt-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <div className="text-center mb-4">
              <h4 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                {secondDate ? 'Range Analysis' : 'Day Analysis'}
              </h4>
              <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                {firstDate && format(firstDate, 'MMM d, yyyy')}
                {secondDate && ` - ${format(secondDate, 'MMM d, yyyy')}`}
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {/* Days (only show if range) */}
              {secondDate && (
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {rangeStats.dayCount}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    Day{rangeStats.dayCount !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
              
              {/* Total P&L */}
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className={`text-2xl font-bold ${
                  rangeStats.totalPL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(rangeStats.totalPL)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total P&L
                </div>
              </div>
              
              {/* Average per day (only if range) */}
              {secondDate && (
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div className={`text-2xl font-bold ${
                    rangeStats.avgPerDay >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(rangeStats.avgPerDay)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Avg/Day
                  </div>
                </div>
              )}
              
              {/* Total Trades */}
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {rangeStats.tradeCount}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Trade{rangeStats.tradeCount !== 1 ? 's' : ''}
                </div>
              </div>
              
              {/* Win Rate */}
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className={`text-2xl font-bold ${
                  rangeStats.winRate >= 50 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {rangeStats.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Win Rate
                </div>
              </div>
              
              {/* Wins */}
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">
                  {rangeStats.winCount}
                </div>
                <div className="text-sm text-green-700 dark:text-green-400">
                  Win{rangeStats.winCount !== 1 ? 's' : ''}
                </div>
              </div>
              
              {/* Losses */}
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-600">
                  {rangeStats.lossCount}
                </div>
                <div className="text-sm text-red-700 dark:text-red-400">
                  Loss{rangeStats.lossCount !== 1 ? 'es' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};