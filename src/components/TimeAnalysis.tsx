import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';
import { 
  format, 
  startOfWeek, 
  startOfMonth, 
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  subMonths,
  subYears,
  isWithinInterval,
  getDay,
  getHours
} from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TimeAnalysisProps {
  trades: Trade[];
  selectedDate: Date;
}

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'biannual' | 'annual';

interface TimeRangeOption {
  value: TimeRange;
  label: string;
  description: string;
}

const timeRangeOptions: TimeRangeOption[] = [
  { value: 'daily', label: 'Daily (Hours)', description: 'Trading hours performance for selected day (4 AM - 8 PM)' },
  { value: 'weekly', label: 'Weekly (Days)', description: 'Days of week performance (past 12 weeks)' },
  { value: 'monthly', label: 'Monthly (Days)', description: 'Days of month performance (past 12 months)' },
  { value: 'biannual', label: 'Biannual (Months)', description: 'Monthly performance (past 2 years)' },
  { value: 'annual', label: 'Annual (Months)', description: 'Monthly performance (past 5 years)' }
];

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TimeAnalysis: React.FC<TimeAnalysisProps> = ({ trades, selectedDate }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');

  const chartData = useMemo(() => {
    if (trades.length === 0) {
      return { 
        labels: [], 
        datasets: [],
        tradeCountData: []
      };
    }

    // Ensure trades have proper timestamp format
    const sortedTrades = [...trades]
      .map(trade => ({
        ...trade,
        timestamp: trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp)
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let labels: string[] = [];
    let data: number[] = [];
    let tradeCountData: number[] = [];

    switch (timeRange) {
      case 'daily': {
        // Hourly analysis for the selected day - Extended to 4 AM - 8 PM
        const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        
        const dayTrades = sortedTrades.filter(trade => 
          trade.timestamp >= startOfDay && trade.timestamp < endOfDay
        );

        // Create hourly buckets (4 AM to 8 PM - extended trading hours)
        const hourlyData: { [hour: number]: { pl: number; count: number } } = {};
        
        // Initialize trading hours from 4 AM to 8 PM
        for (let hour = 4; hour <= 20; hour++) {
          hourlyData[hour] = { pl: 0, count: 0 };
        }

        dayTrades.forEach(trade => {
          const hour = trade.timestamp.getHours();
          if (hour >= 4 && hour <= 20) {
            hourlyData[hour].pl += trade.realizedPL;
            hourlyData[hour].count += 1;
          }
        });

        labels = Object.keys(hourlyData).map(hour => {
          const h = parseInt(hour);
          if (h === 4) return '4:00 AM';
          if (h === 9) return '9:30 AM'; // Market open
          if (h === 16) return '4:00 PM'; // Market close
          if (h === 20) return '8:00 PM';
          if (h < 12) return `${h}:00 AM`;
          if (h === 12) return '12:00 PM';
          return `${h - 12}:00 PM`;
        });

        data = Object.values(hourlyData).map(d => d.pl);
        tradeCountData = Object.values(hourlyData).map(d => d.count);
        break;
      }

      case 'weekly': {
        // Day of week analysis for past 12 weeks
        const endDate = endOfWeek(selectedDate, { weekStartsOn: 0 });
        const startDate = startOfWeek(subMonths(selectedDate, 3), { weekStartsOn: 0 });
        
        const weekTrades = sortedTrades.filter(trade => 
          isWithinInterval(trade.timestamp, { start: startDate, end: endDate })
        );

        const dayData: { [day: number]: { pl: number; count: number } } = {};
        
        // Initialize days (0 = Sunday, 6 = Saturday)
        for (let day = 0; day <= 6; day++) {
          dayData[day] = { pl: 0, count: 0 };
        }

        weekTrades.forEach(trade => {
          const day = getDay(trade.timestamp);
          dayData[day].pl += trade.realizedPL;
          dayData[day].count += 1;
        });

        labels = dayNames;
        data = Object.values(dayData).map(d => d.pl);
        tradeCountData = Object.values(dayData).map(d => d.count);
        break;
      }

      case 'monthly': {
        // Day of month analysis for past 12 months
        const endDate = endOfMonth(selectedDate);
        const startDate = startOfMonth(subMonths(selectedDate, 11));
        
        const monthTrades = sortedTrades.filter(trade => 
          isWithinInterval(trade.timestamp, { start: startDate, end: endDate })
        );

        const dayData: { [day: number]: { pl: number; count: number } } = {};
        
        // Initialize days 1-31
        for (let day = 1; day <= 31; day++) {
          dayData[day] = { pl: 0, count: 0 };
        }

        monthTrades.forEach(trade => {
          const day = trade.timestamp.getDate();
          dayData[day].pl += trade.realizedPL;
          dayData[day].count += 1;
        });

        labels = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
        data = Object.values(dayData).map(d => d.pl);
        tradeCountData = Object.values(dayData).map(d => d.count);
        break;
      }

      case 'biannual': {
        // Monthly analysis for past 2 years
        const endDate = endOfMonth(selectedDate);
        const startDate = startOfMonth(subMonths(selectedDate, 23));
        
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        
        const monthData = months.map(monthStart => {
          const monthEnd = endOfMonth(monthStart);
          const monthTrades = sortedTrades.filter(trade => 
            isWithinInterval(trade.timestamp, { start: monthStart, end: monthEnd })
          );
          const monthPL = monthTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
          return {
            pl: monthPL,
            count: monthTrades.length
          };
        });

        labels = months.map(month => format(month, 'MMM yy'));
        data = monthData.map(d => d.pl);
        tradeCountData = monthData.map(d => d.count);
        break;
      }

      case 'annual': {
        // Monthly analysis for past 5 years
        const endDate = endOfMonth(selectedDate);
        const startDate = startOfMonth(subMonths(selectedDate, 59)); // 5 years = 60 months
        
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        
        const monthData = months.map(monthStart => {
          const monthEnd = endOfMonth(monthStart);
          const monthTrades = sortedTrades.filter(trade => 
            isWithinInterval(trade.timestamp, { start: monthStart, end: monthEnd })
          );
          const monthPL = monthTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
          return {
            pl: monthPL,
            count: monthTrades.length
          };
        });

        labels = months.map(month => format(month, 'MMM yyyy'));
        data = monthData.map(d => d.pl);
        tradeCountData = monthData.map(d => d.count);
        break;
      }
    }

    return {
      labels,
      datasets: [
        {
          label: 'P&L',
          data,
          backgroundColor: data.map(value => 
            value >= 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
          ),
          borderColor: data.map(value => 
            value >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
          ),
          borderWidth: 1,
        },
      ],
      tradeCountData
    };
  }, [trades, selectedDate, timeRange]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const index = context.dataIndex;
            const pl = context.parsed.y;
            const tradeCount = chartData.tradeCountData?.[index] || 0;
            return [
              `P&L: ${formatCurrency(pl)}`,
              `Trades: ${tradeCount}`,
              tradeCount > 0 ? `Avg P&L: ${formatCurrency(pl / tradeCount)}` : 'Avg P&L: $0.00'
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          maxTicksLimit: timeRange === 'daily' ? 12 : 12, // Increased for more hours
          color: 'rgba(156, 163, 175, 0.8)',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          callback: (value: any) => formatCurrency(value),
          color: 'rgba(156, 163, 175, 0.8)',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  // Safely find best and worst performing periods
  const dataset = chartData.datasets[0];
  const hasValidData = dataset && dataset.data && dataset.data.length > 0;
  
  let bestIndex = 0;
  let worstIndex = 0;
  let bestValue = 0;
  let worstValue = 0;
  let bestLabel = '';
  let worstLabel = '';
  let bestTradeCount = 0;
  let worstTradeCount = 0;
  
  if (hasValidData) {
    bestIndex = dataset.data.reduce((bestIdx, value, idx, arr) => 
      (value as number) > (arr[bestIdx] as number) ? idx : bestIdx, 0);
    worstIndex = dataset.data.reduce((worstIdx, value, idx, arr) => 
      (value as number) < (arr[worstIdx] as number) ? idx : worstIdx, 0);
    
    bestValue = dataset.data[bestIndex] as number;
    worstValue = dataset.data[worstIndex] as number;
    bestLabel = chartData.labels[bestIndex] || '';
    worstLabel = chartData.labels[worstIndex] || '';
    bestTradeCount = chartData.tradeCountData?.[bestIndex] || 0;
    worstTradeCount = chartData.tradeCountData?.[worstIndex] || 0;
  }

  const currentOption = timeRangeOptions.find(option => option.value === timeRange);
  const hasData = hasValidData && dataset.data.some(value => (value as number) !== 0);

  if (trades.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Time Analysis
        </h3>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Add trades to see your time-based performance
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Time Analysis
        </h3>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          {timeRangeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {currentOption?.description}
        </p>
      </div>

      <div className="h-80 mb-6">
        <Bar data={chartData} options={options} />
      </div>

      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              Best Performing {timeRange === 'daily' ? 'Hour' : timeRange === 'weekly' ? 'Day' : 'Period'}
            </h4>
            <p className="text-lg font-bold text-green-600">
              {bestLabel}
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              {formatCurrency(bestValue)} ({bestTradeCount} trades)
            </p>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              Worst Performing {timeRange === 'daily' ? 'Hour' : timeRange === 'weekly' ? 'Day' : 'Period'}
            </h4>
            <p className="text-lg font-bold text-red-600">
              {worstLabel}
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              {formatCurrency(worstValue)} ({worstTradeCount} trades)
            </p>
          </div>
        </div>
      )}

      {!hasData && hasValidData && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No trading data available for the selected time range
          </p>
        </div>
      )}
    </div>
  );
};