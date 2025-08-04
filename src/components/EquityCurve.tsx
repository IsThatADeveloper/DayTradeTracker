import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
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
  isWithinInterval
} from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface EquityCurveProps {
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
  { value: 'daily', label: 'Daily', description: 'Current day trades' },
  { value: 'weekly', label: 'Weekly', description: 'Past 12 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Past 12 months' },
  { value: 'biannual', label: 'Biannual', description: 'Past 2 years by month' },
  { value: 'annual', label: 'Annual', description: 'Past 5 years by year' }
];

export const EquityCurve: React.FC<EquityCurveProps> = ({ trades, selectedDate }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');

  const chartData = useMemo(() => {
    if (trades.length === 0) {
      return { labels: [], datasets: [] };
    }

    let filteredTrades: Trade[] = [];
    let labels: string[] = [];
    let equityPoints: number[] = [];

    const sortedTrades = [...trades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    switch (timeRange) {
      case 'daily': {
        // Filter trades for the selected day
        const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        
        filteredTrades = sortedTrades.filter(trade => 
          trade.timestamp >= startOfDay && trade.timestamp < endOfDay
        );

        let runningTotal = 0;
        labels = filteredTrades.map(trade => 
          trade.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
        equityPoints = filteredTrades.map(trade => {
          runningTotal += trade.realizedPL;
          return runningTotal;
        });
        break;
      }

      case 'weekly': {
        // Past 12 weeks
        const endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
        const startDate = startOfWeek(subMonths(selectedDate, 3), { weekStartsOn: 1 });
        
        const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
        
        let runningTotal = 0;
        // Calculate running total up to start date
        sortedTrades
          .filter(trade => trade.timestamp < startDate)
          .forEach(trade => runningTotal += trade.realizedPL);

        labels = weeks.map(week => format(week, 'MMM d'));
        equityPoints = weeks.map(weekStart => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const weekTrades = sortedTrades.filter(trade => 
            isWithinInterval(trade.timestamp, { start: weekStart, end: weekEnd })
          );
          const weekPL = weekTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
          runningTotal += weekPL;
          return runningTotal;
        });
        break;
      }

      case 'monthly': {
        // Past 12 months
        const endDate = endOfMonth(selectedDate);
        const startDate = startOfMonth(subMonths(selectedDate, 11));
        
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        
        let runningTotal = 0;
        // Calculate running total up to start date
        sortedTrades
          .filter(trade => trade.timestamp < startDate)
          .forEach(trade => runningTotal += trade.realizedPL);

        labels = months.map(month => format(month, 'MMM yyyy'));
        equityPoints = months.map(monthStart => {
          const monthEnd = endOfMonth(monthStart);
          const monthTrades = sortedTrades.filter(trade => 
            isWithinInterval(trade.timestamp, { start: monthStart, end: monthEnd })
          );
          const monthPL = monthTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
          runningTotal += monthPL;
          return runningTotal;
        });
        break;
      }

      case 'biannual': {
        // Past 2 years by month
        const endDate = endOfMonth(selectedDate);
        const startDate = startOfMonth(subMonths(selectedDate, 23));
        
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        
        let runningTotal = 0;
        // Calculate running total up to start date
        sortedTrades
          .filter(trade => trade.timestamp < startDate)
          .forEach(trade => runningTotal += trade.realizedPL);

        labels = months.map(month => format(month, 'MMM yy'));
        equityPoints = months.map(monthStart => {
          const monthEnd = endOfMonth(monthStart);
          const monthTrades = sortedTrades.filter(trade => 
            isWithinInterval(trade.timestamp, { start: monthStart, end: monthEnd })
          );
          const monthPL = monthTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
          runningTotal += monthPL;
          return runningTotal;
        });
        break;
      }

      case 'annual': {
        // Past 5 years
        const endDate = endOfYear(selectedDate);
        const startDate = startOfYear(subYears(selectedDate, 4));
        
        const years = eachYearOfInterval({ start: startDate, end: endDate });
        
        let runningTotal = 0;
        // Calculate running total up to start date
        sortedTrades
          .filter(trade => trade.timestamp < startDate)
          .forEach(trade => runningTotal += trade.realizedPL);

        labels = years.map(year => format(year, 'yyyy'));
        equityPoints = years.map(yearStart => {
          const yearEnd = endOfYear(yearStart);
          const yearTrades = sortedTrades.filter(trade => 
            isWithinInterval(trade.timestamp, { start: yearStart, end: yearEnd })
          );
          const yearPL = yearTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
          runningTotal += yearPL;
          return runningTotal;
        });
        break;
      }
    }

    return {
      labels,
      datasets: [
        {
          label: 'Cumulative P&L',
          data: equityPoints,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: 'rgb(59, 130, 246)',
          pointRadius: timeRange === 'daily' ? 3 : 4,
          pointHoverRadius: timeRange === 'daily' ? 5 : 6,
        },
      ],
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
            const value = context.parsed.y;
            return `Cumulative P&L: ${formatCurrency(value)}`;
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
          maxTicksLimit: timeRange === 'daily' ? 10 : 12,
          color: 'rgba(156, 163, 175, 0.8)',
        },
      },
      y: {
        beginAtZero: false,
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

  const currentOption = timeRangeOptions.find(option => option.value === timeRange);
  const finalPL = chartData.datasets[0]?.data[chartData.datasets[0].data.length - 1] || 0;

  if (trades.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Equity Curve
        </h3>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Add trades to see your equity curve
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Equity Curve
        </h3>
        
        <div className="flex items-center space-x-4">
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
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {currentOption?.description}
        </p>
      </div>
      
      <div className="h-80 mb-4">
        <Line data={chartData} options={options} />
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Period P&L</p>
          <p className={`text-lg font-semibold ${
            finalPL >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(finalPL)}
          </p>
        </div>
        
        {chartData.datasets[0]?.data.length > 0 && (
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Data Points</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {chartData.datasets[0].data.length}
            </p>
          </div>
        )}
        
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">View</p>
          <p className="text-lg font-semibold text-blue-600">
            {currentOption?.label}
          </p>
        </div>
      </div>
    </div>
  );
};