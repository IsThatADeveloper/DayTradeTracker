// Updated src/App.tsx with broker integration
import React, { useState, useMemo, useEffect } from 'react';
import { Moon, Sun, TrendingUp, CalendarDays, RefreshCw, Menu, X, Search, Link, Settings } from 'lucide-react';
import { Trade } from './types/trade';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useBrokerIntegration } from './hooks/useBrokerIntegration';
import { calculateDailyStats, getWeeklyStats } from './utils/tradeUtils';
import { ManualTradeEntry } from './components/ManualTradeEntry';
import { BulkTradeImport } from './components/BulkTradeImport';
import { BrokerSetup } from './components/BrokerSetup';
import { Calendar } from './components/Calendar';
import { Dashboard } from './components/Dashboard';
import { TimeAnalysis } from './components/TimeAnalysis';
import { TradeTable } from './components/TradeTable';
import { EquityCurve } from './components/EquityCurve';
import { AuthComponent } from './components/AuthComponent';
import { SyncModal } from './components/SyncModal';
import { Profile } from './components/Profile';
import { AIInsights } from './components/AIInsights';
import { StockSearch } from './components/StockSearch';
import { HomePage } from './components/HomePage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { tradeService } from './services/tradeService';

function AppContent() {
  const { currentUser } = useAuth();
  const {
    connections: brokerConnections,
    syncAllTrades,
    isAnySyncing,
    getTotalBrokerTrades,
    autoSyncEnabled,
    enableAutoSync,
    disableAutoSync
  } = useBrokerIntegration();
  
  // Show homepage by default for new visitors, but remember if they've entered the app
  const [showHomePage, setShowHomePage] = useLocalStorage('show-homepage', true);
  
  const [localTrades, setLocalTrades] = useLocalStorage<Trade[]>('day-trader-trades', []);
  const [cloudTrades, setCloudTrades] = useState<Trade[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useState<'calendar' | 'daily' | 'search' | 'brokers'>('daily');
  const [darkMode, setDarkMode] = useLocalStorage('day-trader-dark-mode', false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isLoadingCloudData, setIsLoadingCloudData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useLocalStorage<string | null>('last-sync-time', null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeTrades = currentUser ? cloudTrades : localTrades;
  const totalBrokerTrades = getTotalBrokerTrades();

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

  // Auto-enable broker sync if user has connections
  useEffect(() => {
    if (currentUser && brokerConnections.length > 0 && !autoSyncEnabled) {
      enableAutoSync(30); // Auto-sync every 30 minutes
    }
  }, [currentUser, brokerConnections.length, autoSyncEnabled, enableAutoSync]);

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

  const handleTradeAdded = async (newTrade: Trade) => {
    if (currentUser) {
      try {
        const tradeId = await tradeService.addTrade(currentUser.uid, newTrade);
        const tradeWithId = { ...newTrade, id: tradeId };
        setCloudTrades(prev => [tradeWithId, ...prev]);
      } catch (error: any) {
        alert(`Failed to save trade: ${error.message}`);
      }
    } else {
      setLocalTrades(prev => [newTrade, ...prev]);
    }
  };

  const handleTradesAdded = async (newTrades: Trade[]) => {
    if (currentUser) {
      try {
        const tradesWithIds = await Promise.all(
          newTrades.map(async (trade) => {
            const tradeId = await tradeService.addTrade(currentUser.uid, trade);
            return { ...trade, id: tradeId };
          })
        );
        setCloudTrades(prev => [...tradesWithIds, ...prev]);
      } catch (error: any) {
        alert(`Failed to save trades: ${error.message}`);
      }
    } else {
      setLocalTrades(prev => [...newTrades, ...prev]);
    }
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

  const handleGetStarted = () => {
    setShowHomePage(false);
  };

  const handleBrokerTradesImported = async (count: number) => {
    // Refresh trades after broker import
    await loadCloudTrades();
  };

  const handleSyncAllBrokers = async () => {
    try {
      const results = await syncAllTrades();
      const totalImported = results.reduce((sum, result) => 
        sum + (result.result?.tradesImported || 0), 0);
      
      if (totalImported > 0) {
        await loadCloudTrades();
        alert(`Successfully synced ${totalImported} new trades from all brokers!`);
      } else {
        alert('All brokers are up to date - no new trades found.');
      }
    } catch (error: any) {
      alert(`Broker sync failed: ${error.message}`);
    }
  };

  // Show homepage by default - user must explicitly choose to enter the app
  if (showHomePage) {
    return <HomePage onGetStarted={handleGetStarted} />;
  }

  // Get the last trade for bulk import
  const lastTrade = activeTrades.length > 0 ? activeTrades[0] : undefined;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Clickable */}
            <button 
              onClick={() => setShowHomePage(true)}
              className="flex items-center flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
                DayTradeTracker
              </h1>
            </button>

            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden md:flex items-center space-x-4">
              {/* View Toggle */}
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveView('calendar')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
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
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    activeView === 'daily'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setActiveView('search')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    activeView === 'search'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Search className="h-4 w-4 mr-1 inline" />
                  Search
                </button>
                <button
                  onClick={() => setActiveView('brokers')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors whitespace-nowrap relative ${
                    activeView === 'brokers'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Link className="h-4 w-4 mr-1 inline" />
                  Brokers
                  {brokerConnections.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full text-xs flex items-center justify-center text-white">
                      {brokerConnections.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Date Picker - Only show on daily view */}
              {activeView === 'daily' && (
                <input
                  type="date"
                  value={getDateInputValue(selectedDate)}
                  onChange={handleDateChange}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              )}

              {/* Broker Sync Button */}
              {currentUser && brokerConnections.length > 0 && (
                <button
                  onClick={handleSyncAllBrokers}
                  disabled={isAnySyncing()}
                  className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md disabled:opacity-50 relative"
                  title="Sync all brokers"
                >
                  <RefreshCw className={`h-5 w-5 ${isAnySyncing() ? 'animate-spin' : ''}`} />
                  {totalBrokerTrades > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full text-xs flex items-center justify-center text-white">
                      {totalBrokerTrades > 99 ? '99+' : totalBrokerTrades}
                    </span>
                  )}
                </button>
              )}

              {/* Refresh Button */}
              {currentUser && (
                <button
                  onClick={loadCloudTrades}
                  disabled={isLoadingCloudData}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md disabled:opacity-50"
                  title="Refresh data"
                >
                  <RefreshCw className={`h-5 w-5 ${isLoadingCloudData ? 'animate-spin' : ''}`} />
                </button>
              )}

              {/* Desktop Auth Component */}
              <AuthComponent onOpenProfile={() => setShowProfile(true)} />
            </div>

            {/* Right side controls */}
            <div className="flex items-center space-x-2">
              {/* Theme Toggle - Always visible */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                title="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                title="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu - Only shown when menu is open */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4 space-y-4">
              {/* View Toggle for Mobile */}
              <div className="px-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                  View
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setActiveView('calendar');
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeView === 'calendar'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <CalendarDays className="h-4 w-4 mr-1" />
                    Calendar
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('daily');
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeView === 'daily'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('search');
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeView === 'search'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Search
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('brokers');
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                      activeView === 'brokers'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Link className="h-4 w-4 mr-1" />
                    Brokers
                    {brokerConnections.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full text-xs flex items-center justify-center text-white">
                        {brokerConnections.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Date Picker for Daily View on Mobile */}
              {activeView === 'daily' && (
                <div className="px-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Date
                  </label>
                  <input
                    type="date"
                    value={getDateInputValue(selectedDate)}
                    onChange={handleDateChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Broker Sync Button for Mobile */}
              {currentUser && brokerConnections.length > 0 && (
                <div className="px-2">
                  <button
                    onClick={() => {
                      handleSyncAllBrokers();
                      setMobileMenuOpen(false);
                    }}
                    disabled={isAnySyncing()}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isAnySyncing() ? 'animate-spin' : ''}`} />
                    Sync All Brokers {totalBrokerTrades > 0 && `(${totalBrokerTrades})`}
                  </button>
                </div>
              )}

              {/* Refresh Button for Mobile */}
              {currentUser && (
                <div className="px-2">
                  <button
                    onClick={() => {
                      loadCloudTrades();
                      setMobileMenuOpen(false);
                    }}
                    disabled={isLoadingCloudData}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCloudData ? 'animate-spin' : ''}`} />
                    Refresh Data
                  </button>
                </div>
              )}

              {/* Mobile Auth Component */}
              <div className="px-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                <AuthComponent onOpenProfile={() => {
                  setShowProfile(true);
                  setMobileMenuOpen(false);
                }} />
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Show broker setup and add manual/bulk trade forms only on non-broker views */}
          {activeView !== 'brokers' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ManualTradeEntry onTradeAdded={handleTradeAdded} />
              <BulkTradeImport onTradesAdded={handleTradesAdded} lastTrade={lastTrade} />
            </div>
          )}
          
          {/* Broker Setup - Show notification on other views if user has no connections */}
          {activeView !== 'brokers' && currentUser && brokerConnections.length === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Link className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Connect Your Broker
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Automatically import trades from Alpaca, Interactive Brokers, Binance, and more
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveView('brokers')}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  Connect Now
                </button>
              </div>
            </div>
          )}

          {activeView === 'calendar' ? (
            <Calendar 
              trades={activeTrades} 
              selectedDate={selectedDate} 
              onDateSelect={setSelectedDate} 
              onMonthChange={setCurrentMonth} 
              currentMonth={currentMonth}
              onDateDoubleClick={(date) => {
                setSelectedDate(date);
                setActiveView('daily');
              }}
            />
          ) : activeView === 'search' ? (
            <StockSearch
              trades={activeTrades}
              onDateSelect={(date) => setSelectedDate(date)}
              onViewChange={setActiveView}
            />
          ) : activeView === 'brokers' ? (
            <BrokerSetup onTradesImported={handleBrokerTradesImported} />
          ) : (
            <>
              <Dashboard dailyStats={dailyStats} selectedDate={selectedDate} />
              <AIInsights trades={activeTrades} selectedDate={selectedDate} />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                <TimeAnalysis trades={activeTrades} selectedDate={selectedDate} />
                <EquityCurve trades={activeTrades} selectedDate={selectedDate} />
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;