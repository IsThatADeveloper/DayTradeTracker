import React, { useState, useMemo, useEffect } from 'react';
import { Moon, Sun, TrendingUp, CalendarDays, RefreshCw } from 'lucide-react';
import { Trade } from './types/trade';
import { useLocalStorage } from './hooks/useLocalStorage';
import { calculateDailyStats, getWeeklyStats } from './utils/tradeUtils';
import { ManualTradeEntry } from './components/ManualTradeEntry';
import { BulkTradeImport } from './components/BulkTradeImport';
import { Calendar } from './components/Calendar';
import { Dashboard } from './components/Dashboard';
import { TimeAnalysis } from './components/TimeAnalysis';
import { TradeTable } from './components/TradeTable';
import { EquityCurve } from './components/EquityCurve';
import { AuthComponent } from './components/AuthComponent';
import { SyncModal } from './components/SyncModal';
import { Profile } from './components/Profile';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { tradeService } from './services/tradeService';

function AppContent() {
  const { currentUser } = useAuth();
  const [localTrades, setLocalTrades] = useLocalStorage<Trade[]>('day-trader-trades', []);
  const [cloudTrades, setCloudTrades] = useState<Trade[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useState<'calendar' | 'daily'>('daily');
  const [darkMode, setDarkMode] = useLocalStorage('day-trader-dark-mode', false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isLoadingCloudData, setIsLoadingCloudData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useLocalStorage<string | null>('last-sync-time', null);

  const activeTrades = currentUser ? cloudTrades : localTrades;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (currentUser) {
      loadCloudTrades();
    } else {
      setCloudTrades([]);
      setIsLoadingCloudData(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && localTrades.length > 0 && cloudTrades.length === 0 && !isLoadingCloudData && !lastSyncTime) {
      setShowSyncModal(true);
    }
  }, [currentUser, localTrades.length, cloudTrades.length, isLoadingCloudData, lastSyncTime]);

  const loadCloudTrades = async () => {
    if (!currentUser) return;
    setIsLoadingCloudData(true);
    try {
      const userTrades = await tradeService.getUserTrades(currentUser.uid);
      setCloudTrades(userTrades);
    } catch (error: any) {
      alert(`Failed to load cloud data: ${error.message}`);
    } finally {
      setIsLoadingCloudData(false);
    }
  };

  const syncToCloud = async () => {
    if (!currentUser) return;
    try {
      await Promise.all(cloudTrades.map(trade => tradeService.deleteTrade(trade.id)));
      await Promise.all(localTrades.map(trade => tradeService.addTrade(currentUser.uid, trade)));
      await loadCloudTrades();
      setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error(error);
    }
  };

  const syncFromCloud = async () => {
    if (!currentUser) return;
    try {
      await loadCloudTrades();
      setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error(error);
    }
  };

  const mergeData = async () => {
    if (!currentUser) return;
    try {
      const tradeMap = new Map<string, Trade>();
      cloudTrades.forEach(trade => {
        const key = `${trade.timestamp.getTime()}_${trade.ticker}_${trade.entryPrice}_${trade.exitPrice}_${trade.quantity}`;
        tradeMap.set(key, trade);
      });
      const newTrades: Trade[] = [];
      localTrades.forEach(trade => {
        const key = `${trade.timestamp.getTime()}_${trade.ticker}_${trade.entryPrice}_${trade.exitPrice}_${trade.quantity}`;
        if (!tradeMap.has(key)) {
          newTrades.push(trade);
          tradeMap.set(key, trade);
        }
      });
      if (newTrades.length > 0) {
        await Promise.all(newTrades.map(trade => tradeService.addTrade(currentUser.uid, trade)));
      }
      await loadCloudTrades();
      setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error(error);
    }
  };

  const normalizeToLocalDate = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const isSameDayLocal = (date1: Date, date2: Date): boolean => {
    const d1 = normalizeToLocalDate(date1);
    const d2 = normalizeToLocalDate(date2);
    return d1.getTime() === d2.getTime();
  };

  const dailyTrades = useMemo(() => {
    const targetDate = normalizeToLocalDate(selectedDate);
    return activeTrades
      .map(trade => ({
        ...trade,
        timestamp: trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp),
      }))
      .filter(trade => isSameDayLocal(trade.timestamp, targetDate));
  }, [activeTrades, selectedDate]);

  const dailyStats = useMemo(() => calculateDailyStats(dailyTrades, selectedDate), [dailyTrades, selectedDate]);
  const weeklyStats = useMemo(() => getWeeklyStats(activeTrades, selectedDate), [activeTrades, selectedDate]);

  const handleTradesAdded = async (newTrades: Trade[]) => {
    if (currentUser) {
      try {
        const tradePromises = newTrades.map(trade => tradeService.addTrade(currentUser.uid, trade));
        const tradeIds = await Promise.all(tradePromises);
        const tradesWithIds = newTrades.map((trade, index) => ({ ...trade, id: tradeIds[index] }));
        setCloudTrades(prev => [...tradesWithIds, ...prev]);
      } catch (error: any) {
        alert(`Failed to save trades: ${error.message}`);
      }
    } else {
      setLocalTrades(prev => [...newTrades, ...prev]);
    }
  };

  const handleTradeAdded = async (newTrade: Trade) => {
    await handleTradesAdded([newTrade]);
  };

  const handleUpdateTrade = async (tradeId: string, updates: Partial<Trade>) => {
    if (currentUser) {
      try {
        await tradeService.updateTrade(tradeId, updates);
        setCloudTrades(prev => prev.map(trade => trade.id === tradeId ? { ...trade, ...updates } : trade));
      } catch (error: any) {
        alert(`Update failed: ${error.message}`);
      }
    } else {
      setLocalTrades(prev => prev.map(trade => trade.id === tradeId ? { ...trade, ...updates } : trade));
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (currentUser) {
      try {
        await tradeService.deleteTrade(tradeId);
        setCloudTrades(prev => prev.filter(trade => trade.id !== tradeId));
      } catch (error: any) {
        alert(`Delete failed: ${error.message}`);
      }
    } else {
      setLocalTrades(prev => prev.filter(trade => trade.id !== tradeId));
    }
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_${selectedDate.toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue) {
      const [year, month, day] = inputValue.split('-').map(Number);
      const newDate = new Date(year, month - 1, day);
      setSelectedDate(newDate);
    }
  };

  const getDateInputValue = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">DayTradeTracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveView('calendar')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeView === 'calendar'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <CalendarDays className="h-4 w-4 mr-1 inline" />
                  Calendar
                </button>
                <button
                  onClick={() => setActiveView('daily')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeView === 'daily'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  Daily
                </button>
              </div>
              {activeView === 'daily' && (
                <input
                  type="date"
                  value={getDateInputValue(selectedDate)}
                  onChange={handleDateChange}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
              {currentUser && (
                <button
                  onClick={loadCloudTrades}
                  disabled={isLoadingCloudData}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md disabled:opacity-50"
                >
                  <RefreshCw className={`h-5 w-5 ${isLoadingCloudData ? 'animate-spin' : ''}`} />
                </button>
              )}
              <AuthComponent onOpenProfile={() => setShowProfile(true)} />
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
          <BulkTradeImport 
            onTradesAdded={handleTradesAdded} 
            lastTrade={activeTrades[0]} 
          />
          {activeView === 'calendar' ? (
            <Calendar trades={activeTrades} selectedDate={selectedDate} onDateSelect={setSelectedDate} onMonthChange={setCurrentMonth} currentMonth={currentMonth} />
          ) : (
            <>
              <Dashboard dailyStats={dailyStats} selectedDate={selectedDate} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <TimeAnalysis trades={activeTrades} selectedDate={selectedDate} />
                <EquityCurve trades={activeTrades} selectedDate={selectedDate} />
              </div>
              <TradeTable trades={dailyTrades} onUpdateTrade={handleUpdateTrade} onExportTrades={handleExportTrades} onDeleteTrade={handleDeleteTrade} />
            </>
          )}
        </div>
      </main>

      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        localTrades={localTrades}
        cloudTrades={cloudTrades}
        onSyncToCloud={syncToCloud}
        onSyncFromCloud={syncFromCloud}
        onMergeData={mergeData}
      />

      <Profile
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        trades={activeTrades}
      />
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;