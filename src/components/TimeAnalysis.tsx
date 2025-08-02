import React from 'react';
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
import { HourlyStats } from '../types/trade';
import { formatTime, formatCurrency } from '../utils/tradeUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TimeAnalysisProps {
  hourlyStats: HourlyStats[];
  selectedDate: Date;
}

export const TimeAnalysis: React.FC<TimeAnalysisProps> = ({ hourlyStats, selectedDate }) => {
  const chartData = {
    labels: hourlyStats.map(stat => formatTime(stat.hour)),
    datasets: [
      {
        label: 'P&L by Hour',
        data: hourlyStats.map(stat => stat.totalPL),
        backgroundColor: hourlyStats.map(stat => 
          stat.totalPL >= 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
        ),
        borderColor: hourlyStats.map(stat => 
          stat.totalPL >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
        ),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Profitability by Trading Hour',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const stat = hourlyStats[context.dataIndex];
            return [
              `P&L: ${formatCurrency(stat.totalPL)}`,
              `Trades: ${stat.tradeCount}`,
              `Avg P&L: ${formatCurrency(stat.avgPL)}`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => formatCurrency(value),
        },
      },
    },
  };

  const bestHour = hourlyStats.reduce((best, current) => 
    current.totalPL > best.totalPL ? current : best, hourlyStats[0]
  );

  const worstHour = hourlyStats.reduce((worst, current) => 
    current.totalPL < worst.totalPL ? current : worst, hourlyStats[0]
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Time Analysis
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {selectedDate.toLocaleDateString()}
        </span>
      </div>

      <div className="mb-6">
        <Bar data={chartData} options={options} />
      </div>

      {hourlyStats.some(stat => stat.tradeCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              Best Trading Hour
            </h4>
            <p className="text-lg font-bold text-green-600">
              {formatTime(bestHour.hour)}
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              {formatCurrency(bestHour.totalPL)} ({bestHour.tradeCount} trades)
            </p>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              Worst Trading Hour
            </h4>
            <p className="text-lg font-bold text-red-600">
              {formatTime(worstHour.hour)}
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              {formatCurrency(worstHour.totalPL)} ({worstHour.tradeCount} trades)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};