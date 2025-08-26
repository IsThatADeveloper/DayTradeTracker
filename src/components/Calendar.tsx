// src/components/Calendar.tsx - Enhanced Calendar with Custom Ranges
import React, { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, Clock } from 'lucide-react';
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
  differenceInDays,
  subDays,
  startOfYear
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
const DAY_NAMES_MOBILE = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Custom range presets
const RANGE_PRESETS = [
  { label: 'Today', value: 'today', days: 0 },
  { label: 'Last 7 Days', value: '7d', days: 7 },
  { label: 'Last 30 Days', value: '30d', days: 30 },
  { label: 'Last 60 Days', value: '60d', days: 60 },
  { label: 'Last 90 Days', value: '90d', days: 90 },
  { label: 'This Month', value: 'thisMonth', days: null },
  { label: 'This Year', value: 'thisYear', days: null },
];

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
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Handle clicking outside to clear selection
  const handleComponentClick = useCallback((e: React.MouseEvent) => {
    // Check if the clicked element is in a "safe" area (calendar days, buttons, inputs)
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('button, input, select, .calendar-day, .range-preset');
    
    // If not clicking on an interactive element, clear the selection
    if (!isInteractiveElement && (firstDate || secondDate)) {
      clearSelection();
    }
  }, [firstDate, secondDate]);

  // Clear date selection
  const clearSelection = useCallback(() => {
    setFirstDate(null);
    setSecondDate(null);
  }, []);

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

  // Handle preset range selection
  const handlePresetRange = useCallback((preset: any) => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (preset.value) {
      case 'today':
        startDate = today;
        endDate = today;
        break;
      case 'thisMonth':
        startDate = startOfMonth(today);
        endDate = today;
        break;
      case 'thisYear':
        startDate = startOfYear(today);
        endDate = today;
        break;
      default:
        if (preset.days !== null && preset.days > 0) {
          startDate = subDays(today, preset.days - 1);
        } else {
          startDate = today;
        }
    }

    setFirstDate(startDate);
    setSecondDate(preset.value === 'today' ? null : endDate);
    onDateSelect(endDate);
    setShowCustomRange(false);
  }, [onDateSelect]);

  // Handle day click - only for daily view selection
  const handleDayClick = useCallback((date: Date) => {
    // Only update the main selected date for daily view
    onDateSelect(date);
  }, [onDateSelect]);

  // Handle double click
  const handleDoubleClick = useCallback((date: Date) => {
    if (onDateDoubleClick) {
      onDateDoubleClick(date);
    }
  }, [onDateDoubleClick]);

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
    const isTodayDate = isToday(day.date);
    const isSelectedDay = isSameDay(day.date, selectedDate);
    
    let classes = 'relative h-14 sm:h-16 md:h-20 border border-slate-200 dark:border-slate-700 cursor-pointer transition-all duration-300 ';
    
    // Currently selected day for daily view (highest priority)
    if (isSelectedDay) {
      classes += 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ';
    }
    
    // Range selection styling
    if (inRange && (firstDate || secondDate)) {
      if (firstDate && isSameDay(day.date, firstDate)) {
        classes += 'bg-gradient-to-br from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg ';
      } else if (secondDate && isSameDay(day.date, secondDate)) {
        classes += 'bg-gradient-to-br from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg ';
      } else {
        classes += 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-amber-900 dark:text-amber-100 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-800/30 dark:hover:to-orange-800/30 border-amber-200 dark:border-amber-800 ';
      }
    }
    // Today styling
    else if (isTodayDate) {
      if (day.hasData && day.isCurrentMonth) {
        if (day.totalPL > 0) {
          classes += 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-800/30 dark:hover:to-teal-800/30 ';
        } else {
          classes += 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 hover:from-rose-100 hover:to-red-100 dark:hover:from-rose-800/30 dark:hover:to-red-800/30 ';
        }
      } else {
        classes += 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 ';
      }
    }
    // Performance coloring (full box)
    else if (day.hasData && day.isCurrentMonth) {
      if (day.totalPL > 0) {
        classes += 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-800/30 dark:hover:to-teal-800/30 border-emerald-200 dark:border-emerald-800 ';
      } else {
        classes += 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 hover:from-rose-100 hover:to-red-100 dark:hover:from-rose-800/30 dark:hover:to-red-800/30 border-rose-200 dark:border-rose-800 ';
      }
    }
    // Regular days
    else if (day.isCurrentMonth) {
      classes += 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 ';
    }
    // Outside current month
    else {
      classes += 'bg-slate-50 dark:bg-slate-900 opacity-50 ';
    }
    
    return classes;
  }, [selectedDate, isInSelectedRange, firstDate, secondDate]);

  // Get text color for content
  const getTextColor = useCallback((day: any): string => {
    const isFirstDate = firstDate && isSameDay(day.date, firstDate);
    const isSecondDate = secondDate && isSameDay(day.date, secondDate);
    const inRange = isInSelectedRange(day.date);
    
    // Selected range dates
    if (isFirstDate || isSecondDate) {
      return 'text-white';
    }
    
    // In range
    if (inRange && (firstDate || secondDate)) {
      return 'text-amber-900 dark:text-amber-100';
    }
    
    // Non-current month
    if (!day.isCurrentMonth) {
      return 'text-slate-400 dark:text-slate-500';
    }
    
    // Days with trading data
    if (day.hasData) {
      if (day.totalPL > 0) {
        return 'text-emerald-800 dark:text-emerald-200';
      } else {
        return 'text-rose-800 dark:text-rose-200';
      }
    }
    
    // Regular days
    return 'text-slate-900 dark:text-slate-100';
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
    <div 
      className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-6"
      onClick={handleComponentClick}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-lg">
            <CalendarIcon className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Trading Calendar
          </h3>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
          {/* Date Range Display with Clear */}
          {(firstDate || secondDate) && (
            <div className="flex items-center space-x-2">
              {firstDate && secondDate ? (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                  <Clock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    {format(firstDate, 'MMM d')} - {format(secondDate, 'MMM d')}
                  </span>
                </div>
              ) : firstDate ? (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
                  <Clock className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    {format(firstDate, 'MMM d')}
                  </span>
                </div>
              ) : null}
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                className="p-2 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/20 rounded-lg transition-all duration-200 hover:scale-105"
                title="Clear selection"
              >
                <span className="text-lg font-bold">×</span>
              </button>
            </div>
          )}
          
          {/* Month Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onMonthChange(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 hover:scale-105"
              title="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white min-w-[120px] sm:min-w-[140px] text-center">
              {format(currentMonth, 'MMM yyyy')}
            </h4>
            
            <button
              onClick={() => onMonthChange(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 hover:scale-105"
              title="Next month"
            >
              <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Range Presets */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Quick Analysis Ranges
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCustomRange(!showCustomRange);
              }}
              className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
            >
              {showCustomRange ? 'Hide Custom' : 'Custom Range'}
            </button>
          </div>
          
          {/* Preset buttons */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4 range-preset">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePresetRange(preset);
                }}
                className="px-3 py-2 text-xs sm:text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 dark:hover:from-amber-900/20 dark:hover:to-orange-900/20 hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-200 hover:scale-105"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker */}
          {showCustomRange && (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
              <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Custom Date Range
              </h5>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                {/* From Date */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm transition-all duration-200"
                  />
                </div>
                
                {/* To Date */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm transition-all duration-200"
                  />
                </div>
                
                {/* Clear Button */}
                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSelection();
                    }}
                    disabled={!firstDate && !secondDate}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
              
              {/* Range Status */}
              {firstDate && (
                <div className="mt-3 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {!secondDate ? (
                      <>Selected: <span className="font-medium text-amber-600 dark:text-amber-400">{format(firstDate, 'MMM d, yyyy')}</span> (single day)</>
                    ) : (
                      <>Range: <span className="font-medium text-amber-600 dark:text-amber-400">{format(firstDate, 'MMM d, yyyy')} - {format(secondDate, 'MMM d, yyyy')}</span> ({differenceInDays(secondDate, firstDate) + 1} days)</>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Use quick ranges above for analysis • Click any date to view daily details • Double-click for detailed view
          {(firstDate || secondDate) && (
            <><br />
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Click anywhere in empty space to clear range selection
            </span></>
          )}
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-1 sm:space-y-2">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {(window.innerWidth < 640 ? DAY_NAMES_MOBILE : DAY_NAMES).map((day, index) => (
            <div key={index} className="h-8 flex items-center justify-center">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1 sm:gap-2">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`${getDayClasses(day)} calendar-day`}
                onClick={() => handleDayClick(day.date)}
                onDoubleClick={() => handleDoubleClick(day.date)}
                title={day.hasData ? `${formatCurrency(day.totalPL)} (${day.tradeCount} trades)` : format(day.date, 'MMM d')}
              >
                {/* Date Number */}
                <div className="absolute top-1 sm:top-2 left-1 sm:left-2">
                  <span className={`text-xs sm:text-sm font-semibold ${getTextColor(day)}`}>
                    {format(day.date, 'd')}
                  </span>
                </div>
                
                {/* Selection Indicators for Range */}
                {firstDate && isSameDay(day.date, firstDate) && (
                  <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">1</span>
                    </div>
                  </div>
                )}
                {secondDate && isSameDay(day.date, secondDate) && (
                  <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">2</span>
                    </div>
                  </div>
                )}
                
                {/* Today Indicator */}
                {isToday(day.date) && !isInSelectedRange(day.date) && (
                  <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full shadow-sm"></div>
                  </div>
                )}
                
                {/* Trading Data */}
                {day.hasData && day.isCurrentMonth && (
                  <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 right-1 sm:right-2">
                    <div className={`text-xs font-semibold truncate ${getTextColor(day)}`}>
                      {formatCompactPL(day.totalPL)}
                    </div>
                    <div className={`text-xs truncate opacity-75 ${getTextColor(day)} hidden sm:block`}>
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
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded border border-emerald-200 dark:border-emerald-800"></div>
          <span className="text-slate-600 dark:text-slate-400">Profitable</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 rounded border border-rose-200 dark:border-rose-800"></div>
          <span className="text-slate-600 dark:text-slate-400">Loss Days</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded border border-amber-200"></div>
          <span className="text-slate-600 dark:text-slate-400">Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          <span className="text-slate-600 dark:text-slate-400">Today</span>
        </div>
      </div>

      {/* Range Analysis */}
      {rangeStats && (
        <div className="mt-6">
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 rounded-xl p-4 sm:p-6 border border-amber-200 dark:border-amber-800 shadow-lg">
            <div className="text-center mb-4 sm:mb-6">
              <h4 className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                {secondDate ? 'Range Analysis' : 'Day Analysis'}
              </h4>
              <p className="text-amber-700 dark:text-amber-300 text-sm mt-2">
                {firstDate && format(firstDate, 'MMM d, yyyy')}
                {secondDate && ` - ${format(secondDate, 'MMM d, yyyy')}`}
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Days (only show if range) */}
              {secondDate && (
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                  <div className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-100">
                    {rangeStats.dayCount}
                  </div>
                  <div className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 font-medium">
                    Day{rangeStats.dayCount !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
              
              {/* Total P&L */}
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                <div className={`text-xl sm:text-2xl font-bold ${
                  rangeStats.totalPL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatCurrency(rangeStats.totalPL)}
                </div>
                <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Total P&L
                </div>
              </div>
              
              {/* Average per day (only if range) */}
              {secondDate && (
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                  <div className={`text-xl sm:text-2xl font-bold ${
                    rangeStats.avgPerDay >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatCurrency(rangeStats.avgPerDay)}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Avg/Day
                  </div>
                </div>
              )}
              
              {/* Total Trades */}
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                <div className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {rangeStats.tradeCount}
                </div>
                <div className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 font-medium">
                  Trade{rangeStats.tradeCount !== 1 ? 's' : ''}
                </div>
              </div>
              
              {/* Win Rate */}
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                <div className={`text-xl sm:text-2xl font-bold ${
                  rangeStats.winRate >= 50 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {rangeStats.winRate.toFixed(1)}%
                </div>
                <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Win Rate
                </div>
              </div>
              
              {/* Wins */}
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                <div className="text-xl sm:text-2xl font-bold text-emerald-600">
                  {rangeStats.winCount}
                </div>
                <div className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                  Win{rangeStats.winCount !== 1 ? 's' : ''}
                </div>
              </div>
              
              {/* Losses */}
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                <div className="text-xl sm:text-2xl font-bold text-rose-600">
                  {rangeStats.lossCount}
                </div>
                <div className="text-xs sm:text-sm text-rose-700 dark:text-rose-400 font-medium">
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