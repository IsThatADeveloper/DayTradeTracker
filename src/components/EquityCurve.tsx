import React from 'react';
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

export const EquityCurve: React.FC<EquityCurveProps> = ({ trades, selectedDate }) => {
  const sortedTrades = [...trades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  let runningTotal = 0;
  const equityData = sortedTrades.map((trade, index) => {
    runningTotal += trade.realizedPL;
    return {
      x: trade.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      y: runningTotal,
      trade: trade,
    };
  });

  const chartData = {
    labels: equityData.map(point => point.x),
    datasets: [
      {
        label: 'Cumulative P&L',
        data: equityData.map(point => point.y),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
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
        text: 'Equity Curve',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const point = equityData[context.dataIndex];
            return [
              `Cumulative P&L: ${formatCurrency(point.y)}`,
              `Trade: ${point.trade.ticker} (${formatCurrency(point.trade.realizedPL)})`,
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

  if (trades.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Equity Curve
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            Import trades to see your equity curve
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
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {selectedDate.toLocaleDateString()}
        </span>
      </div>
      
      <Line data={chartData} options={options} />
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Final P&L: <span className={`font-semibold ${runningTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(runningTotal)}
          </span>
        </p>
      </div>
    </div>
  );
};