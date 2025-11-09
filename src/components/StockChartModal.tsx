// src/components/StockChartModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { createChart, CandlestickSeries, ISeriesApi } from 'lightweight-charts';
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';

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
  const markersLayerRef = useRef<HTMLCanvasElement | null>(null);
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

  // Generate simulated intraday data based on trades
  // This creates realistic price action that matches your actual trade prices
  // For production with real API data, replace this entire function
  const generateSimulatedData = (
    ticker: string,
    date: Date,
    trades: Trade[]
  ) => {
    const data: any[] = [];
    
    if (trades.length === 0) return data;
    
    // Get the actual price range from YOUR trades
    const allPrices = trades.flatMap(t => [t.entryPrice, t.exitPrice]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    
    // Extended hours: 4 AM - 8 PM
    const preMarketStart = new Date(date);
    preMarketStart.setHours(4, 0, 0, 0);
    
    const marketOpen = new Date(date);
    marketOpen.setHours(9, 30, 0, 0);
    
    const marketClose = new Date(date);
    marketClose.setHours(16, 0, 0, 0);
    
    const afterHoursEnd = new Date(date);
    afterHoursEnd.setHours(20, 0, 0, 0);
    
    let currentTime = new Date(preMarketStart);
    
    // Start below the minimum price to show the run-up
    let lastClose = minPrice * 0.88;
    
    // Use 1-minute candles
    const intervalMs = 1 * 60 * 1000;
    
    // Find when the price should peak (when max trade occurred)
    const maxTrade = trades.find(t => 
      Math.max(t.entryPrice, t.exitPrice) === maxPrice
    );
    const peakTime = maxTrade ? maxTrade.timestamp : 
      new Date(marketOpen.getTime() + (marketClose.getTime() - marketOpen.getTime()) * 0.5);
    
    // Add some randomness to peak timing
    const peakTimeOffset = (Math.random() - 0.5) * 10 * 60 * 1000; // +/- 10 minutes
    const adjustedPeakTime = new Date(peakTime.getTime() + peakTimeOffset);
    
    while (currentTime <= afterHoursEnd) {
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      const currentTimestamp = currentTime.getTime();
      
      // Determine session type
      const isPreMarket = currentHour < 9 || (currentHour === 9 && currentMinute < 30);
      const isRegularHours = (currentHour > 9 || (currentHour === 9 && currentMinute >= 30)) && currentHour < 16;
      const isAfterHours = currentHour >= 16;
      
      // Calculate distance from peak
      const timeToPeak = adjustedPeakTime.getTime() - currentTimestamp;
      const timeFromPeak = currentTimestamp - adjustedPeakTime.getTime();
      const isBeforePeak = timeToPeak > 0;
      
      // Base volatility as percentage of price
      let baseVolatilityPct = 0.008; // 0.8% base
      let momentumBias = 0;
      
      if (isBeforePeak) {
        // BEFORE PEAK - Building up
        const totalTimeToRise = adjustedPeakTime.getTime() - preMarketStart.getTime();
        const elapsed = currentTimestamp - preMarketStart.getTime();
        const progress = elapsed / totalTimeToRise;
        
        // Stronger upward bias as we approach peak
        if (progress < 0.2) {
          momentumBias = 0.0003; // Slow start
          baseVolatilityPct = 0.006;
        } else if (progress < 0.5) {
          momentumBias = 0.0008; // Building momentum
          baseVolatilityPct = 0.009;
        } else if (progress < 0.8) {
          momentumBias = 0.0015; // Strong push
          baseVolatilityPct = 0.012;
        } else {
          momentumBias = 0.0025; // Explosive move to peak
          baseVolatilityPct = 0.018;
        }
        
        // Ensure we're moving toward max price
        const priceGap = maxPrice - lastClose;
        if (priceGap > 0) {
          momentumBias += priceGap * 0.001; // Pull toward target
        }
      } else {
        // AFTER PEAK - Fading
        const totalTimeToFade = afterHoursEnd.getTime() - adjustedPeakTime.getTime();
        const elapsedFade = timeFromPeak;
        const fadeProgress = elapsedFade / totalTimeToFade;
        
        // Downward bias, fading over time
        if (fadeProgress < 0.3) {
          momentumBias = -0.0012; // Initial selloff
          baseVolatilityPct = 0.014;
        } else if (fadeProgress < 0.6) {
          momentumBias = -0.0008; // Continued fade
          baseVolatilityPct = 0.010;
        } else {
          momentumBias = -0.0004; // Slow bleed
          baseVolatilityPct = 0.007;
        }
      }
      
      // Session-specific volatility adjustments
      if (isPreMarket) {
        baseVolatilityPct *= 0.7; // Lower volume, choppier
      } else if (isAfterHours) {
        baseVolatilityPct *= 0.6;
      }
      
      // Calculate the candle
      const open = lastClose;
      
      // Random component + momentum
      const volatility = lastClose * baseVolatilityPct;
      const randomMove = (Math.random() - 0.5) * volatility * 2;
      const momentumMove = lastClose * momentumBias;
      
      let close = open + randomMove + momentumMove;
      
      // If we're very close to peak time, force price toward max
      const nearPeak = Math.abs(currentTimestamp - adjustedPeakTime.getTime()) < 3 * 60 * 1000;
      if (nearPeak && isBeforePeak) {
        close = Math.max(close, maxPrice * 0.98);
      }
      
      // Create realistic high/low with wicks
      const candleRange = Math.abs(close - open);
      const wickMultiplier = 0.3 + Math.random() * 0.7; // 30-100% wick size
      const upperWick = candleRange * wickMultiplier * Math.random();
      const lowerWick = candleRange * wickMultiplier * Math.random();
      
      let high = Math.max(open, close) + upperWick;
      let low = Math.min(open, close) - lowerWick;
      
      // Force the actual max price to appear at peak
      if (nearPeak) {
        high = Math.max(high, maxPrice);
      }
      
      // Don't go below our starting range
      low = Math.max(low, minPrice * 0.85);
      
      const timeInSeconds = Math.floor(currentTime.getTime() / 1000);
      
      data.push({
        time: timeInSeconds,
        open: parseFloat(open.toFixed(4)),
        high: parseFloat(high.toFixed(4)),
        low: parseFloat(low.toFixed(4)),
        close: parseFloat(close.toFixed(4)),
      });
      
      lastClose = close;
      currentTime = new Date(currentTime.getTime() + intervalMs);
    }
    
    return data;
  };

  // Draw heatmap circles for entry/exit points
  const drawTradeMarkers = () => {
    if (!chartRef.current || !seriesRef.current || !chartContainerRef.current) return;

    // Create or get canvas overlay
    let canvas = markersLayerRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '10';
      markersLayerRef.current = canvas;
      chartContainerRef.current.appendChild(canvas);
    }

    const container = chartContainerRef.current;
    canvas.width = container.clientWidth;
    canvas.height = 500;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const timeScale = chartRef.current.timeScale();
    const priceScale = seriesRef.current.priceScale();

    tickerTrades.forEach((trade) => {
      const timeInSeconds = Math.floor(trade.timestamp.getTime() / 1000);
      
      // Draw entry circle
      const entryX = timeScale.timeToCoordinate(timeInSeconds);
      const entryY = priceScale.priceToCoordinate(trade.entryPrice);
      
      if (entryX !== null && entryY !== null) {
        // Outer glow circle (heatmap effect)
        const gradient = ctx.createRadialGradient(entryX, entryY, 0, entryX, entryY, 25);
        const entryColor = trade.direction === 'long' ? '34, 197, 94' : '239, 68, 68'; // green or red
        gradient.addColorStop(0, `rgba(${entryColor}, 0.4)`);
        gradient.addColorStop(0.5, `rgba(${entryColor}, 0.2)`);
        gradient.addColorStop(1, `rgba(${entryColor}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(entryX, entryY, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner solid circle
        ctx.fillStyle = trade.direction === 'long' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
        ctx.beginPath();
        ctx.arc(entryX, entryY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // White border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(entryX, entryY, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Draw exit circle
      const exitX = timeScale.timeToCoordinate(timeInSeconds + 60); // Approximate exit time
      const exitY = priceScale.priceToCoordinate(trade.exitPrice);
      
      if (exitX !== null && exitY !== null) {
        // Outer glow circle (heatmap effect)
        const gradient = ctx.createRadialGradient(exitX, exitY, 0, exitX, exitY, 25);
        const exitColor = trade.realizedPL >= 0 ? '34, 197, 94' : '239, 68, 68';
        gradient.addColorStop(0, `rgba(${exitColor}, 0.4)`);
        gradient.addColorStop(0.5, `rgba(${exitColor}, 0.2)`);
        gradient.addColorStop(1, `rgba(${exitColor}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(exitX, exitY, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner solid circle (square for exit)
        ctx.fillStyle = trade.realizedPL >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
        ctx.fillRect(exitX - 7, exitY - 7, 14, 14);
        
        // White border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(exitX - 7, exitY - 7, 14, 14);
      }
    });
  };

  // Load chart data
  useEffect(() => {
    if (!isOpen) return;

    const loadChartData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // TODO: Replace with real API call
        const data = generateSimulatedData(ticker, selectedDate, tickerTrades);
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
        // Fix time formatting to show proper hours
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          const hours = date.getHours();
          const minutes = date.getMinutes();
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        },
      },
    });

    chartRef.current = chart;

    // Add candlestick series - following the docs pattern
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
    
    chart.timeScale().fitContent();

    // Draw trade markers after chart is ready
    setTimeout(() => {
      drawTradeMarkers();
    }, 100);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
        drawTradeMarkers();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (markersLayerRef.current) {
        markersLayerRef.current.remove();
        markersLayerRef.current = null;
      }
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
                  Note: Using simulated data. Integrate a market data API for real charts.
                </p>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <div style={{ position: 'relative' }}>
              <div ref={chartContainerRef} className="w-full" />
            </div>
          )}
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