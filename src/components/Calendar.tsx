import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay } from 'date-fns';
import { Trade } from '../types/trade';
import { getCalendarData, getWeeklyStats, formatCurrency } from '../utils/tradeUtils';

interface CalendarProps {
  trades: Trade[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  currentMonth: Date;
  onDateDoubleClick?: (date: Date) => void; // New prop for double-click handling
}

export const Calendar: React.FC<CalendarProps> = ({
  trades,
  selectedDate,
  onDateSelect,
  onMonthChange,
  currentMonth,
  onDateDoubleClick,
}) => {
  const calendarData = getCalendarData(trades, currentMonth);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekDaysShort = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Group days by weeks
  const weeks: Array<typeof calendarData> = [];
  for (let i = 0; i < calendarData.length; i += 7) {
    weeks.push(calendarData.slice(i, i + 7));
  }

  const getWeekTotal = (weekDays: typeof calendarData) => {
    return weekDays.reduce((sum, day) => sum + day.totalPL, 0);
  };

  const getDayClassName = (day: typeof calendarData[0]) => {
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

  const getWeekClassName = (weekTotal: number, hasData: boolean) => {
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

  // Handle day click with double-click detection
  const handleDayClick = (day: typeof calendarData[0]) => {
    onDateSelect(day.date);
  };

  // Handle day double-click
  const handleDayDoubleClick = (day: typeof calendarData[0]) => {
    if (onDateDoubleClick) {
      onDateDoubleClick(day.date);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          <span className="hidden sm:inline">Trading Calendar</span>
          <span className="sm:hidden">Calendar</span>
        </h3>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
            className="p-1 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
        {weekDays.map((day, index) => (
          <div key={day} className="h-6 sm:h-8 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{weekDaysShort[index]}</span>
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
                      {weekTotal > 0 ? '+' : ''}{Math.round(weekTotal)}
                    </span>
                    <span className="sm:hidden">
                      {weekTotal > 0 ? '+' : ''}{Math.abs(weekTotal) >= 1000 ? (Math.round(weekTotal/100)/10) + 'k' : Math.round(weekTotal)}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs">-</span>
                )}
              </div>
              
              {/* Days */}
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={getDayClassName(day)}
                  onClick={() => handleDayClick(day)}
                  onDoubleClick={() => handleDayDoubleClick(day)}
                  title={day.hasData ? `${format(day.date, 'MMM d')}: ${formatCurrency(day.totalPL)} (${day.tradeCount} trades)${onDateDoubleClick ? ' - Double-click to open' : ''}` : `${format(day.date, 'MMM d')}${onDateDoubleClick ? ' - Double-click to open' : ''}`}
                >
                  <div className="text-center leading-none">
                    <div className="font-medium">{format(day.date, 'd')}</div>
                    {day.hasData && (
                      <div className="text-xs opacity-75 mt-0.5 leading-none">
                        <span className="hidden sm:inline">
                          {day.totalPL > 0 ? '+' : ''}{Math.round(day.totalPL)}
                        </span>
                        <span className="sm:hidden">
                          {day.totalPL > 0 ? '+' : ''}{
                            Math.abs(day.totalPL) >= 1000 
                              ? (Math.round(day.totalPL/100)/10) + 'k' 
                              : Math.round(day.totalPL)
                          }
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