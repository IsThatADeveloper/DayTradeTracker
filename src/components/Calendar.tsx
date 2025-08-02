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
}

export const Calendar: React.FC<CalendarProps> = ({
  trades,
  selectedDate,
  onDateSelect,
  onMonthChange,
  currentMonth,
}) => {
  const calendarData = getCalendarData(trades, currentMonth);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Group days by weeks
  const weeks: Array<typeof calendarData> = [];
  for (let i = 0; i < calendarData.length; i += 7) {
    weeks.push(calendarData.slice(i, i + 7));
  }

  const getWeekTotal = (weekDays: typeof calendarData) => {
    return weekDays.reduce((sum, day) => sum + day.totalPL, 0);
  };

  const getDayClassName = (day: typeof calendarData[0]) => {
    let className = 'h-12 w-full flex items-center justify-center text-sm font-medium rounded-lg cursor-pointer transition-all duration-200 ';
    
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
    let className = 'h-12 w-16 flex items-center justify-center text-xs font-semibold rounded-lg ';
    
    if (!hasData) {
      className += 'text-gray-400 dark:text-gray-500 ';
    } else if (weekTotal > 0) {
      className += 'bg-green-500 text-white ';
    } else {
      className += 'bg-red-500 text-white ';
    }
    
    return className;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Trading Calendar
        </h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          <h4 className="text-lg font-medium text-gray-900 dark:text-white min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h4>
          <button
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-2">
        {/* Header */}
        <div className="h-8 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
          Week
        </div>
        {weekDays.map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}

        {/* Calendar Grid */}
        {weeks.map((week, weekIndex) => {
          const weekTotal = getWeekTotal(week);
          const weekHasData = week.some(day => day.hasData);
          
          return (
            <React.Fragment key={weekIndex}>
              {/* Week Total */}
              <div className={getWeekClassName(weekTotal, weekHasData)} title={`Week total: ${formatCurrency(weekTotal)}`}>
                {weekHasData ? (
                  <span className="truncate">
                    {weekTotal > 0 ? '+' : ''}{Math.round(weekTotal)}
                  </span>
                ) : (
                  <span>-</span>
                )}
              </div>
              
              {/* Days */}
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={getDayClassName(day)}
                  onClick={() => onDateSelect(day.date)}
                  title={day.hasData ? `${format(day.date, 'MMM d')}: ${formatCurrency(day.totalPL)} (${day.tradeCount} trades)` : format(day.date, 'MMM d')}
                >
                  <div className="text-center">
                    <div>{format(day.date, 'd')}</div>
                    {day.hasData && (
                      <div className="text-xs opacity-75 leading-none mt-0.5">
                        {day.totalPL > 0 ? '+' : ''}{Math.round(day.totalPL)}
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
      <div className="flex items-center justify-center space-x-6 mt-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Profitable Day</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Loss Day</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Selected Day</span>
        </div>
      </div>
    </div>
  );
};