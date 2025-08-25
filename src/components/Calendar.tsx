// src/components/Calendar.tsx - Fixed version with proper formatting
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isToday, 
  isSameDay 
} from 'date-fns';

// Types
import { Trade } from '../types/trade';
import { getCalendarData, getWeeklyStats, formatCurrency } from '../utils/tradeUtils';

interface CalendarProps {
  trades: Trade[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  currentMonth: Date;
  onDateDoubleClick?: (date: Date) => void;
}

// Constants
const WEEK_DAYS_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAYS_PER_WEEK = 7;

/**
 * Interactive trading calendar component showing daily P&L and performance
 * Supports date selection, month navigation, and day drilling
 */
export const Calendar: React.FC<CalendarProps> = ({
  trades,
  selectedDate,
  onDateSelect,
  onMonthChange,
  currentMonth,
  onDateDoubleClick,
}) => {
  const calendarData = getCalendarData(trades, currentMonth);

  // Group calendar days by weeks for grid layout
  const weeks: Array<typeof calendarData> = [];
  for (let i = 0; i < calendarData.length; i += DAYS_PER_WEEK) {
    weeks.push(calendarData.slice(i, i + DAYS_PER_WEEK));
  }

  /**
   * Calculate total P&L for a week
   */
  const getWeekTotal = (weekDays: typeof calendarData): number => {
    return weekDays.reduce((sum, day) => sum + day.totalPL, 0);
  };

  /**
   * Get CSS classes for a calendar day based on its state and performance
   */
  const getDayClassName = (day: typeof calendarData[0]): string => {
    let className = 'h-10 sm:h-12 w-full flex flex-col items-center justify-center text-xs sm:text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 relative ';
    
    if (!isSameMonth(day.date, currentMonth)) {
      className += 'text-gray-300 dark:text-gray-600 ';
    } else if (isToday(day.date)) {
      className += 'ring-2 ring-blue-500 ';
    }
    
    if (isSameDay(day.date, selectedDate)) {
      className += 'bg-blue-600 text-white ';
    } else if (day.hasData) {
      if (day.totalPL > 0) {
        className += 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 ';
      } else {
        className += 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 ';
      }
    } else {
      className += 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 ';
    }
    
    return className;
  };

  /**
   * Get CSS classes for week total display
   */
  const getWeekClassName = (weekTotal: number, hasData: boolean): string => {
    let className = 'h-10 sm:h-12 w-8 sm:w-16 flex items-center justify-center text-xs font-semibold rounded-lg ';
    
    if (!hasData) {
      className += 'text-gray-400 dark:text-gray-500 ';
    } else if (weekTotal > 0) {
      className += 'bg-green-500 text-white ';
    } else {
      className += 'bg-red-500 text-white ';
    }
    
    return className;
  };

  /**
   * Handle day click with proper date selection
   */
  const handleDayClick = (day: typeof calendarData[0]): void => {
    onDateSelect(day.date);
  };

  /**
   * Handle day double-click for drilling into daily view
   */
  const handleDayDoubleClick = (day: typeof calendarData[0]): void => {
    if (onDateDoubleClick) {
      onDateDoubleClick(day.date);
    }
  };

  /**
   * Format P&L amount for compact display in calendar cells
   */
  const formatCompactPL = (amount: number, isMobile: boolean = false): string => {
    const prefix = amount > 0 ? '+' : '';
    
    if (isMobile && Math.abs(amount) >= 1000) {
      return `${prefix}${(Math.round(amount / 100) / 10)}k`;
    }
    
    return `${prefix}${Math.round(amount)}`;
  };

  /**
   * Generate tooltip text for a calendar day
   */
  const generateDayTooltip = (day: typeof calendarData[0]): string => {
    const baseTooltip = format(day.date, 'MMM d');
    
    if (!day.hasData) {
      return onDateDoubleClick ? `${baseTooltip} - Double-click to open` : baseTooltip;
    }
    
    return `${baseTooltip}: ${formatCurrency(day.totalPL)} (${day.tradeCount} trades)${
      onDateDoubleClick ? ' - Double-click to open' : ''
    }`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          <span className="hidden sm:inline">Trading Calendar</span>
          <span className="sm:hidden">Calendar</span>
        </h3>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
            className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          <h4 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white min-w-[120px] sm:min-w-[140px] text-center">
            <span className="hidden sm:inline">{format(currentMonth, 'MMMM yyyy')}</span>
            <span className="sm:hidden">{format(currentMonth, 'MMM yyyy')}</span>
          </h4>
          
          <button
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Next month"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Instruction text */}
      <div className="mb-4 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <span className="hidden sm:inline">Click to select, double-click to open daily view</span>
          <span className="sm:hidden">Double-tap to open day</span>
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-8 gap-1 sm:gap-2">
        {/* Header Row */}
        <div className="h-6 sm:h-8 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
          <span className="hidden sm:inline">Week</span>
          <span className="sm:hidden">W</span>
        </div>
        
        {WEEK_DAYS_FULL.map((day, index) => (
          <div key={day} className="h-6 sm:h-8 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{WEEK_DAYS_SHORT[index]}</span>
          </div>
        ))}

        {/* Calendar Body */}
        {weeks.map((week, weekIndex) => {
          const weekTotal = getWeekTotal(week);
          const weekHasData = week.some(day => day.hasData);
          
          return (
            <React.Fragment key={weekIndex}>
              {/* Week Total */}
              <div 
                className={getWeekClassName(weekTotal, weekHasData)} 
                title={`Week total: ${formatCurrency(weekTotal)}`}
              >
                {weekHasData ? (
                  <span className="truncate text-xs">
                    <span className="hidden sm:inline">
                      {formatCompactPL(weekTotal)}
                    </span>
                    <span className="sm:hidden">
                      {formatCompactPL(weekTotal, true)}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs">-</span>
                )}
              </div>
              
              {/* Days of the week */}
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={getDayClassName(day)}
                  onClick={() => handleDayClick(day)}
                  onDoubleClick={() => handleDayDoubleClick(day)}
                  title={generateDayTooltip(day)}
                >
                  <div className="text-center leading-none">
                    {/* Day number */}
                    <div className="font-medium">{format(day.date, 'd')}</div>
                    
                    {/* P&L display */}
                    {day.hasData && (
                      <div className="text-xs opacity-75 mt-0.5 leading-none">
                        <span className="hidden sm:inline">
                          {formatCompactPL(day.totalPL)}
                        </span>
                        <span className="sm:hidden">
                          {formatCompactPL(day.totalPL, true)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </React.Fragment>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 sm:mt-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-100 dark:bg-green-900/30 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">
            <span className="hidden sm:inline">Profitable Day</span>
            <span className="sm:hidden">Profit</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-100 dark:bg-red-900/30 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">
            <span className="hidden sm:inline">Loss Day</span>
            <span className="sm:hidden">Loss</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-600 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">
            <span className="hidden sm:inline">Selected Day</span>
            <span className="sm:hidden">Selected</span>
          </span>
        </div>
      </div>

      {/* Mobile Stats Summary */}
      <div className="mt-4 sm:hidden">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">This Month</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {(() => {
                const monthTotal = calendarData
                  .filter(day => isSameMonth(day.date, currentMonth) && day.hasData)
                  .reduce((sum, day) => sum + day.totalPL, 0);
                return formatCurrency(monthTotal);
              })()}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Trading Days</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {calendarData
                .filter(day => isSameMonth(day.date, currentMonth) && day.hasData)
                .length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};