// src/components/StockChartModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { X, TrendingUp, TrendingDown, AlertCircle, Clock } from 'lucide-react';
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
  selectedTradeId?: string;
}

type Timeframe = '1m' | '5m' | '15m' | '1h';

interface TimeframeOption {
  value: Timeframe;
  label: string;
  seconds: number;
}

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { value: '1m', label: '1 Min', seconds: 60 },
  { value: '5m', label: '5 Min', seconds: 300 },
  { value: '15m', label: '15 Min', seconds: 900 },
  { value: '1h', label: '1 Hour', seconds: 3600 },
];

export const StockChartModal: React.FC<StockChartModalProps> = ({
  isOpen,
  onClose,
  ticker,
  trades,
  selectedDate,
  selectedTradeId,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isDelayedData, setIsDelayedData] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1m');

  const tickerTrades = trades.filter(trade => {
    const tradeDate = new Date(trade.timestamp);
    return (
      trade.ticker.toUpperCase() === ticker.toUpperCase() &&
      tradeDate.toDateString() === selectedDate.toDateString()
    );
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const displayTrades = selectedTradeId
    ? tickerTrades.filter(trade => trade.id === selectedTradeId)
    : tickerTrades;

  const getUserFriendlyError = (err: any): string => {
    const errorMessage = err.message || '';
    const errorString = typeof err === 'string' ? err : JSON.stringify(err);
    
    if (errorMessage.includes('NOT_AUTHORIZED') || errorString.includes('NOT_AUTHORIZED')) {
      return 'Real-time data is not available until trading day is complete';
    }
    
    if (errorMessage.includes('API key') || errorString.includes('API key')) {
      return 'Unable to connect to market data. Please check your API configuration.';
    }
    
    if (errorMessage.includes('market was open') || errorMessage.includes('No data')) {
      return 'No market data available for this date. The market may have been closed.';
    }
    
    if (errorMessage.includes('rate limit') || errorString.includes('rate limit')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    
    return 'Unable to load chart data. Please try again later.';
  };

  useEffect(() => {
    if (!isOpen) return;

    const loadChartData = async () => {
      setIsLoading(true);
      setError(null);
      setIsDelayedData(false);

      try {
        const timeframeOption = TIMEFRAME_OPTIONS.find(t => t.value === selectedTimeframe);
        const timeframeSeconds = timeframeOption?.seconds || 60;
        
        const data = await fetchIntradayDataWithCache(ticker, selectedDate, timeframeSeconds);
        setChartData(data);
      } catch (err: any) {
        console.error('Failed to load chart data:', err);
        const friendlyError = getUserFriendlyError(err);
        setError(friendlyError);
      } finally {
        setIsLoading(false);
      }
    };

    loadChartData();
  }, [isOpen, ticker, selectedDate, selectedTimeframe]);

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
      },
    });

    chartRef.current = chart;

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
    
    displayTrades.forEach((trade, index) => {
      candlestickSeries.createPriceLine({
        price: trade.entryPrice,
        color: trade.direction === 'long' ? colors.upColor : colors.downColor,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `Entry${displayTrades.length > 1 ? ` #${index + 1}` : ''}: ${formatCurrency(trade.entryPrice)}`,
      });
      
      candlestickSeries.createPriceLine({
        price: trade.exitPrice,
        color: trade.realizedPL >= 0 ? colors.upColor : colors.downColor,
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `Exit${displayTrades.length > 1 ? ` #${index + 1}` : ''}: ${formatCurrency(trade.exitPrice)}`,
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
  }, [isOpen, chartData, isLoading, displayTrades, selectedTimeframe]);

  if (!isOpen) return null;

  const totalTrades = displayTrades.length;
  const totalPL = displayTrades.reduce((sum, t) => sum + t.realizedPL, 0);
  const avgEntry = displayTrades.reduce((sum, t) => sum + t.entryPrice, 0) / totalTrades;
  const avgExit = displayTrades.reduce((sum, t) => sum + t.exitPrice, 0) / totalTrades;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">
              {ticker} - Price Chart {selectedTradeId && '(Single Trade)'}
            </h3>
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

        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Timeframe:</span>
            <div className="flex items-center space-x-1">
              {TIMEFRAME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedTimeframe(option.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    selectedTimeframe === option.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isDelayedData && !error && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 p-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Showing delayed market data. Upgrade to a paid plan for real-time intraday charts.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {selectedTradeId ? 'Trade' : 'Trades'}
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{totalTrades}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total P&L</div>
            <div className={`text-lg font-bold ${totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalPL)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {selectedTradeId ? 'Entry' : 'Avg Entry'}
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(avgEntry)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {selectedTradeId ? 'Exit' : 'Avg Exit'}
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(avgExit)}</div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading {TIMEFRAME_OPTIONS.find(t => t.value === selectedTimeframe)?.label} chart...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Chart Unavailable
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && <div ref={chartContainerRef} className="w-full" />}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-4 max-h-48 overflow-y-auto">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            {selectedTradeId ? 'Trade Details' : `Entry Points (${displayTrades.length})`}
          </h4>
          <div className="space-y-2">
            {displayTrades.map((trade) => (
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