import React, { useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';

interface StockSearchProps {
  trades: Trade[];
  onDateSelect: (date: Date) => void;
  onViewChange: (view: 'calendar' | 'daily' | 'search') => void;
}

interface StockAnalysis {
  ticker: string;
  totalTrades: number;
  totalPL: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  trades: Trade[];
  lastTradeDate: Date;
}

export const StockSearch: React.FC<StockSearchProps> = ({
  trades,
  onDateSelect,
  onViewChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const stockAnalysis = useMemo(() => {
    const stockMap = new Map<string, Trade[]>();

    trades.forEach(trade => {
      const ticker = trade.ticker.toUpperCase();
      if (!stockMap.has(ticker)) {
        stockMap.set(ticker, []);
      }
      stockMap.get(ticker)!.push(trade);
    });

    const analysis: StockAnalysis[] = [];
    stockMap.forEach((stockTrades, ticker) => {
      const totalPL = stockTrades.reduce((sum, trade) => sum + trade.realizedPL, 0);
      const wins = stockTrades.filter(trade => trade.realizedPL > 0);
      const losses = stockTrades.filter(trade => trade.realizedPL < 0);
      const avgWin = wins.length > 0 ? wins.reduce((sum, trade) => sum + trade.realizedPL, 0) / wins.length : 0;
      const avgLoss = losses.length > 0 ? losses.reduce((sum, trade) => sum + trade.realizedPL, 0) / losses.length : 0;
      const bestTrade = Math.max(...stockTrades.map(trade => trade.realizedPL));
      const worstTrade = Math.min(...stockTrades.map(trade => trade.realizedPL));
      const lastTradeDate = new Date(Math.max(...stockTrades.map(trade => trade.timestamp.getTime())));

      analysis.push({
        ticker,
        totalTrades: stockTrades.length,
        totalPL,
        winCount: wins.length,
        lossCount: losses.length,
        winRate: stockTrades.length > 0 ? (wins.length / stockTrades.length) * 100 : 0,
        avgWin,
        avgLoss,
        bestTrade,
        worstTrade,
        trades: stockTrades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        lastTradeDate,
      });
    });

    return analysis.sort((a, b) => b.totalPL - a.totalPL);
  }, [trades]);

  const filteredStocks = useMemo(() => {
    if (!searchTerm) return stockAnalysis;
    return stockAnalysis.filter(stock =>
      stock.ticker.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stockAnalysis, searchTerm]);

  const selectedStockData = selectedStock
    ? stockAnalysis.find(stock => stock.ticker === selectedStock)
    : null;

  const handleTradeDoubleClick = (trade: Trade) => {
    onDateSelect(trade.timestamp);
    onViewChange('daily');
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 60) return 'text-green-600';
    if (winRate >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPLColor = (pl: number) => {
    return pl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Search className="h-5 w-5 mr-2 text-blue-600" />
            Stock Analysis
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredStocks.length} stocks found
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for stocks (e.g., AAPL, TSLA)..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Stock Performance
              </h4>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredStocks.map((stock) => (
                <div
                  key={stock.ticker}
                  onClick={() => setSelectedStock(stock.ticker)}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedStock === stock.ticker ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-gray-900 dark:text-white">
                        {stock.ticker}
                      </h5>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {stock.totalTrades} trades
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${getPLColor(stock.totalPL)}`}>
                        {formatCurrency(stock.totalPL)}
                      </p>
                      <p className={`text-sm ${getWinRateColor(stock.winRate)}`}>
                        {stock.winRate.toFixed(1)}% WR
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {filteredStocks.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stocks found matching "{searchTerm}"</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedStockData ? (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedStockData.ticker} Analysis
                  </h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Last traded: {selectedStockData.lastTradeDate.toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total P&L</p>
                    <p className={`text-xl font-bold ${getPLColor(selectedStockData.totalPL)}`}>
                      {formatCurrency(selectedStockData.totalPL)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
                    <p className={`text-xl font-bold ${getWinRateColor(selectedStockData.winRate)}`}>
                      {selectedStockData.winRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg Win</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(selectedStockData.avgWin)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg Loss</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(Math.abs(selectedStockData.avgLoss))}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Best Trade</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(selectedStockData.bestTrade)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Worst Trade</p>
                    <p className="text-lg font-semibold text-red-600">
                      {formatCurrency(selectedStockData.worstTrade)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Trades</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedStockData.totalTrades}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h5 className="font-medium text-gray-900 dark:text-white flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Trade History (Double-click to view day)
                  </h5>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {selectedStockData.trades.map((trade) => (
                    <div
                      key={trade.id}
                      onDoubleClick={() => handleTradeDoubleClick(trade)}
                      className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      title="Double-click to view this trading day"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${
                            trade.direction === 'long'
                              ? 'bg-green-100 dark:bg-green-900/20'
                              : 'bg-red-100 dark:bg-red-900/20'
                          }`}>
                            {trade.direction === 'long' ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {trade.quantity} shares @ ${trade.entryPrice} → ${trade.exitPrice}
                            </p>
                            {trade.notes && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {trade.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${getPLColor(trade.realizedPL)}`}>
                            {formatCurrency(trade.realizedPL)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
              <Search className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select a Stock to Analyze
              </h4>
              <p className="text-gray-500 dark:text-gray-400">
                Choose a stock from the list to see detailed performance metrics and trade history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
