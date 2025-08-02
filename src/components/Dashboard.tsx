import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar } from 'lucide-react';
import { DailyStats } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';

interface DashboardProps {
  dailyStats: DailyStats;
  selectedDate: Date;
}

export const Dashboard: React.FC<DashboardProps> = ({ dailyStats, selectedDate }) => {
  const stats = [
    {
      name: 'Daily P&L',
      value: formatCurrency(dailyStats.totalPL),
      icon: DollarSign,
      color: dailyStats.totalPL >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: dailyStats.totalPL >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
    },
    {
      name: 'Win Rate',
      value: `${dailyStats.winRate.toFixed(1)}%`,
      icon: Target,
      color: dailyStats.winRate >= 50 ? 'text-green-600' : 'text-red-600',
      bgColor: dailyStats.winRate >= 50 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
    },
    {
      name: 'Total Trades',
      value: dailyStats.totalTrades.toString(),
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      name: 'Avg Win',
      value: formatCurrency(dailyStats.avgWin),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      name: 'Avg Loss',
      value: formatCurrency(Math.abs(dailyStats.avgLoss)),
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Daily Performance
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {selectedDate.toLocaleDateString()}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className={`${stat.bgColor} rounded-lg p-4`}>
            <div className="flex items-center">
              <div className={`${stat.color} mr-3`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {stat.name}
                </p>
                <p className={`text-lg font-semibold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {dailyStats.totalTrades > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Wins</p>
            <p className="text-2xl font-bold text-green-600">{dailyStats.winCount}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Losses</p>
            <p className="text-2xl font-bold text-red-600">{dailyStats.lossCount}</p>
          </div>
        </div>
      )}
    </div>
  );
};