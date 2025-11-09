// src/components/StockChartModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';
import { fetchIntradayDataWithCache } from '../services/marketData';

interface StockChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  trades: Trade[];
  selectedDate: Date;
}

export const StockChartModal: React.FC<StockChartModalProps> = ({
  isOpen,
  onClose,
  ticker,
  trades,
  selectedDate,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  // Filter trades for this ticker on the selected date
  const tickerTrades = trades.filter(trade => {
    const tradeDate = new Date(trade.timestamp);
    return (
      trade.ticker.toUpperCase() === ticker.toUpperCase() &&
      tradeDate.toDateString() === selectedDate.toDateString()
    );
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Load chart data
  useEffect(() => {
    if (!isOpen) return;

    const loadChartData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch REAL market data from Polygon.io
        const data = await fetchIntradayDataWithCache(ticker, selectedDate);
        setChartData(data);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to load chart data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadChartData();
  }, [isOpen, ticker, selectedDate]);

  // Create and configure the chart
  useEffect(() => {
    if (!isOpen || !chartContainerRef.current || !chartData.length || isLoading) return;

    const isDarkMode = document.documentElement.classList.contains('dark');

    const colors = {
      background: isDarkMode ? '#1f2937' : '#ffffff',
      text: isDarkMode ? '#e5e7eb' : '#374151',
      grid: isDarkMode ? '#374151' : '#e5e7eb',
      upColor: '#22c55e',
      downColor: '#ef4444',
    };

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: colors.background },
        textColor: colors.text,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: colors.grid,
      },
      timeScale: {
        borderColor: colors.grid,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          const hours = date.getHours();
          const minutes = date.getMinutes();
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        },
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries);
    
    candlestickSeries.applyOptions({
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderUpColor: colors.upColor,
      borderDownColor: colors.downColor,
      wickUpColor: colors.upColor,
      wickDownColor: colors.downColor,
    });

    seriesRef.current = candlestickSeries;
    candlestickSeries.setData(chartData);
    
    // Add horizontal price lines for each trade
    tickerTrades.forEach((trade, index) => {
      // Entry price line (dashed)
      candlestickSeries.createPriceLine({
        price: trade.entryPrice,
        color: trade.direction === 'long' ? colors.upColor : colors.downColor,
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `Entry #${index + 1}: ${formatCurrency(trade.entryPrice)}`,
      });
      
      // Exit price line (solid)
      candlestickSeries.createPriceLine({
        price: trade.exitPrice,
        color: trade.realizedPL >= 0 ? colors.upColor : colors.downColor,
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: `Exit #${index + 1}: ${formatCurrency(trade.exitPrice)}`,
      });
    });
    
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [isOpen, chartData, isLoading, tickerTrades]);

  if (!isOpen) return null;

  const totalTrades = tickerTrades.length;
  const totalPL = tickerTrades.reduce((sum, t) => sum + t.realizedPL, 0);
  const avgEntry = tickerTrades.reduce((sum, t) => sum + t.entryPrice, 0) / totalTrades;
  const avgExit = tickerTrades.reduce((sum, t) => sum + t.exitPrice, 0) / totalTrades;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">{ticker} - Price Chart</h3>
            <p className="text-sm text-blue-100">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">Trades</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{totalTrades}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total P&L</div>
            <div className={`text-lg font-bold ${totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalPL)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">Avg Entry</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(avgEntry)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">Avg Exit</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(avgExit)}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading chart...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Check your Polygon.io API key and ensure the market was open on this date.
                </p>
              </div>
            </div>
          )}

          {!isLoading && !error && <div ref={chartContainerRef} className="w-full" />}
        </div>

        {/* Trade List */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 max-h-48 overflow-y-auto">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Entry Points ({tickerTrades.length})
          </h4>
          <div className="space-y-2">
            {tickerTrades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    trade.direction === 'long' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
                  }`}>
                    {trade.direction === 'long' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {trade.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {trade.direction.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {trade.quantity} shares @ {formatCurrency(trade.entryPrice)} → {formatCurrency(trade.exitPrice)}
                    </div>
                  </div>
                </div>
                <div className={`text-lg font-bold ${trade.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(trade.realizedPL)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};