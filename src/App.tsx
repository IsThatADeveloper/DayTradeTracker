import React, { useState, useMemo } from 'react';
import { Moon, Sun, TrendingUp, CalendarDays } from 'lucide-react';
import { Trade } from './types/trade';
import { useLocalStorage } from './hooks/useLocalStorage';
import { calculateDailyStats, calculateHourlyStats, getWeeklyStats } from './utils/tradeUtils';
import { ManualTradeEntry } from './components/ManualTradeEntry';
import { Calendar } from './components/Calendar';
import { Dashboard } from './components/Dashboard';
import { TimeAnalysis } from './components/TimeAnalysis';
import { TradeTable } from './components/TradeTable';
import { EquityCurve } from './components/EquityCurve';
import { isSameDay } from 'date-fns';

function App() {
  const [trades, setTrades] = useLocalStorage<Trade[]>('day-trader-trades', []);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useState<'calendar' | 'daily'>('daily');
  const [darkMode, setDarkMode] = useLocalStorage('day-trader-dark-mode', false);

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const dailyTrades = useMemo(() => {
    return trades
      .map(trade => ({
        ...trade,
        timestamp: new Date(trade.timestamp),
      }))
      .filter(trade => isSameDay(trade.timestamp, selectedDate));
  }, [trades, selectedDate]);

  const dailyStats = useMemo(() => calculateDailyStats(dailyTrades, selectedDate), [dailyTrades, selectedDate]);
  const hourlyStats = useMemo(() => calculateHourlyStats(dailyTrades, selectedDate), [dailyTrades, selectedDate]);
  const weeklyStats = useMemo(() => getWeeklyStats(trades, selectedDate), [trades, selectedDate]);

  const handleTradeAdded = (newTrade: Trade) => {
    setTrades(prevTrades => [...prevTrades, newTrade]);
  };

  const handleUpdateTrade = (tradeId: string, updates: Partial<Trade>) => {
    setTrades(prevTrades =>
      prevTrades.map(trade =>
        trade.id === tradeId ? { ...trade, ...updates } : trade
      )
    );
  };

  const handleDeleteTrade = (tradeId: string) => {
    setTrades(prevTrades => prevTrades.filter(trade => trade.id !== tradeId));
  };

  const handleExportTrades = () => {
    if (dailyTrades.length === 0) return;

    const csv = [
      'Time,Ticker,Direction,Quantity,Entry Price,Exit Price,Realized P&L,Notes',
      ...dailyTrades.map(trade =>
        `${trade.timestamp.toLocaleString()},${trade.ticker},${trade.direction},${trade.quantity},${trade.entryPrice},${trade.exitPrice},${trade.realizedPL},"${trade.notes || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_${selectedDate.toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Day Trade Tracker
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveView('calendar')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'calendar'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <CalendarDays className="h-4 w-4 mr-1 inline" />
                  Calendar
                </button>
                <button
                  onClick={() => setActiveView('daily')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'daily'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Daily
                </button>
              </div>

              {activeView === 'daily' && (
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <ManualTradeEntry onTradeAdded={handleTradeAdded} />

          {activeView === 'calendar' ? (
            <Calendar
              trades={trades}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onMonthChange={setCurrentMonth}
              currentMonth={currentMonth}
            />
          ) : trades.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Start Adding Your Trades
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Add your first trade using the form above to start tracking your performance
              </p>
            </div>
          ) : (
            <>
              <Dashboard dailyStats={dailyStats} selectedDate={selectedDate} />

              {weeklyStats.totalTrades > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Weekly Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Weekly P&L</p>
                      <p className={`text-2xl font-bold ${weeklyStats.totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(weeklyStats.totalPL)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Trades</p>
                      <p className="text-2xl font-bold text-blue-600">{weeklyStats.totalTrades}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
                      <p className={`text-2xl font-bold ${weeklyStats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                        {weeklyStats.winRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Win/Loss</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {weeklyStats.winCount}/{weeklyStats.lossCount}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <TimeAnalysis hourlyStats={hourlyStats} selectedDate={selectedDate} />
                <EquityCurve trades={dailyTrades} selectedDate={selectedDate} />
              </div>

              <TradeTable
                trades={dailyTrades}
                onUpdateTrade={handleUpdateTrade}
                onExportTrades={handleExportTrades}
                onDeleteTrade={handleDeleteTrade}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

export default App;
