// src/App.tsx - Fixed Hook Order to Prevent React Error
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Moon, Sun, TrendingUp, CalendarDays, RefreshCw, Menu, X, Search, Link, Globe, Home, BarChart3, Settings } from 'lucide-react';
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
import { StockNews } from './components/StockNews';
import { HomePage } from './components/HomePage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { tradeService } from './services/tradeService';

// Memoized components to prevent unnecessary re-renders
const MemoizedDashboard = React.memo(Dashboard);
const MemoizedAIInsights = React.memo(AIInsights);
const MemoizedTimeAnalysis = React.memo(TimeAnalysis);
const MemoizedEquityCurve = React.memo(EquityCurve);
const MemoizedTradeTable = React.memo(TradeTable);
const MemoizedCalendar = React.memo(Calendar);
const MemoizedStockSearch = React.memo(StockSearch);
const MemoizedStockNews = React.memo(StockNews);

// Navigation items configuration
const NAVIGATION_ITEMS = [
  {
    id: 'daily',
    label: 'Daily View',
    icon: Home,
    description: 'Today\'s trading overview'
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: CalendarDays,
    description: 'Monthly trading calendar'
  },
  {
    id: 'search',
    label: 'Stock Analysis',
    icon: Search,
    description: 'Search and analyze stocks'
  },
  {
    id: 'brokers',
    label: 'Brokers',
    icon: Link,
    description: 'Connect trading accounts'
  },
  {
    id: 'news',
    label: 'Market News',
    icon: Globe,
    description: 'Market research center'
  }
];

function AppContent() {
  // =====================================================================================
  // CRITICAL: RULES OF HOOKS - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // =====================================================================================
  // 
  // React requires that hooks are called in the EXACT SAME ORDER on every render.
  // If you add an early return statement (like for showing the homepage), it must come
  // AFTER all hooks have been defined. Otherwise you'll get the error:
  // "Rendered fewer hooks than expected. This may be caused by an accidental early return statement."
  //
  // WRONG ❌:
  // const [state] = useState();
  // if (condition) return <Component />;  // Early return!
  // const [otherState] = useState();      // This hook won't be called consistently
  //
  // CORRECT ✅:
  // const [state] = useState();
  // const [otherState] = useState();      // ALL hooks called first
  // if (condition) return <Component />;  // Then conditional returns
  //
  // The order below is:
  // 1. All useAuth, useCustomHooks
  // 2. All useState, useLocalStorage
  // 3. All useCallback
  // 4. All useMemo  
  // 5. All useEffect
  // 6. THEN conditional returns and render logic
  // =====================================================================================

  // 1. CUSTOM HOOKS (useAuth, useBrokerIntegration, etc.)
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
  
  // 2. ALL STATE HOOKS (useState, useLocalStorage)
  // =====================================================================================
  const [showHomePage, setShowHomePage] = useLocalStorage('show-homepage', true);
  const [localTrades, setLocalTrades] = useLocalStorage<Trade[]>('day-trader-trades', []);
  const [cloudTrades, setCloudTrades] = useState<Trade[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useState<'calendar' | 'daily' | 'search' | 'brokers' | 'news'>('daily');
  const [darkMode, setDarkMode] = useLocalStorage('day-trader-dark-mode', false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isLoadingCloudData, setIsLoadingCloudData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useLocalStorage<string | null>('last-sync-time', null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 3. COMPUTED VALUES (basic calculations that don't need memoization)
  // =====================================================================================
  const activeTrades = currentUser ? cloudTrades : localTrades;
  const totalBrokerTrades = getTotalBrokerTrades();

  // 4. ALL CALLBACK HOOKS (useCallback)
  // =====================================================================================
  const handleGetStarted = useCallback(() => {
    console.log('🏠 Getting started - hiding homepage');
    setShowHomePage(false);
  }, [setShowHomePage]);

  const handleLogoClick = useCallback(() => {
    console.log('🏠 Logo clicked, current showHomePage:', showHomePage);
    console.log('🏠 Setting showHomePage to true');
    setShowHomePage(true);
    setMobileMenuOpen(false);
    setActiveView('daily');
  }, [setShowHomePage, showHomePage]);

  const normalizeToLocalDate = useCallback((date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }, []);

  const isSameDayLocal = useCallback((date1: Date, date2: Date): boolean => {
    const d1 = normalizeToLocalDate(date1);
    const d2 = normalizeToLocalDate(date2);
    return d1.getTime() === d2.getTime();
  }, [normalizeToLocalDate]);

  const loadCloudTrades = useCallback(async () => {
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
  }, [currentUser]);

  const handleTradeAdded = useCallback(async (newTrade: Trade) => {
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
  }, [currentUser, setLocalTrades]);

  const handleTradesAdded = useCallback(async (newTrades: Trade[]) => {
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
  }, [currentUser, setLocalTrades]);

  const handleUpdateTrade = useCallback(async (tradeId: string, updates: Partial<Trade>) => {
    if (currentUser) {
      try {
        const currentTrade = cloudTrades.find(trade => trade.id === tradeId);
        if (currentTrade) {
          const updatesWithCount = {
            ...updates,
            updateCount: currentTrade.updateCount || 0
          };
          
          await tradeService.updateTrade(tradeId, updatesWithCount);
          
          setCloudTrades(prev => prev.map(trade => 
            trade.id === tradeId 
              ? { 
                  ...trade, 
                  ...updates, 
                  updateCount: (trade.updateCount || 0) + 1,
                  lastUpdated: new Date()
                } 
              : trade
          ));
        } else {
          throw new Error('Trade not found in local state');
        }
      } catch (error: any) {
        alert(`Update failed: ${error.message}`);
      }
    } else {
      setLocalTrades(prev => prev.map(trade => 
        trade.id === tradeId 
          ? { 
              ...trade, 
              ...updates, 
              updateCount: (trade.updateCount || 0) + 1,
              lastUpdated: new Date()
            } 
          : trade
      ));
    }
  }, [currentUser, cloudTrades, setLocalTrades]);

  const handleDeleteTrade = useCallback(async (tradeId: string) => {
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
  }, [currentUser, setLocalTrades]);

  const handleExportTrades = useCallback(() => {
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
  }, [selectedDate]); // Note: dailyTrades dependency added below in useMemo

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue) {
      const [year, month, day] = inputValue.split('-').map(Number);
      const newDate = new Date(year, month - 1, day);
      setSelectedDate(newDate);
    }
  }, []);

  const handleSyncAllBrokers = useCallback(async () => {
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
  }, [syncAllTrades, loadCloudTrades]);

  // 5. ALL MEMOIZED VALUES (useMemo)
  // =====================================================================================
  const dailyTrades = useMemo(() => {
    const targetDate = normalizeToLocalDate(selectedDate);
    return activeTrades
      .map(trade => ({
        ...trade,
        timestamp: trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp),
      }))
      .filter(trade => isSameDayLocal(trade.timestamp, targetDate));
  }, [activeTrades, selectedDate, normalizeToLocalDate, isSameDayLocal]);

  const dailyStats = useMemo(() => {
    return calculateDailyStats(dailyTrades, selectedDate);
  }, [dailyTrades, selectedDate]);

  const weeklyStats = useMemo(() => {
    return getWeeklyStats(activeTrades, selectedDate);
  }, [activeTrades, selectedDate]);

  const dateInputValue = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  const lastTrade = useMemo(() => 
    activeTrades.length > 0 ? activeTrades[0] : undefined, 
    [activeTrades]
  );

  // 6. ALL EFFECT HOOKS (useEffect)
  // =====================================================================================
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (darkMode) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (currentUser) {
      loadCloudTrades();
    } else {
      setCloudTrades([]);
      setIsLoadingCloudData(false);
    }
  }, [currentUser, loadCloudTrades]);

  // =====================================================================================
  // 🚨 CRITICAL: ALL HOOKS ABOVE - CONDITIONAL RETURNS BELOW
  // =====================================================================================
  // Now that ALL hooks have been called in the same order every render,
  // it's SAFE to do conditional returns. This prevents React hook errors.
  //
  // DO NOT add any new hooks after this point!
  // DO NOT add useState, useEffect, useMemo, useCallback, etc. below this line!
  // =====================================================================================

  // SAFE: Homepage conditional return (after all hooks are called)
  if (showHomePage) {
    console.log('🏠 Rendering HomePage component, showHomePage:', showHomePage);
    return <HomePage onGetStarted={handleGetStarted} />;
  }

  console.log('🏠 Rendering main app, showHomePage:', showHomePage);

  // =====================================================================================
  // RENDER FUNCTIONS AND MAIN COMPONENT LOGIC
  // =====================================================================================

  // Render sidebar navigation item
  const renderSidebarItem = (item: typeof NAVIGATION_ITEMS[0]) => {
    const isActive = activeView === item.id;
    const Icon = item.icon;
    
    const showBadge = item.id === 'brokers' && brokerConnections.length > 0;
    const badgeContent = item.id === 'brokers' ? brokerConnections.length : totalBrokerTrades;
    
    if (sidebarCollapsed) {
      return (
        <button
          key={item.id}
          onClick={() => {
            setActiveView(item.id as any);
            setMobileMenuOpen(false);
          }}
          className={`w-full p-2 flex items-center justify-center rounded-lg transition-colors duration-200 relative ${
            isActive
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title={item.description}
        >
          <Icon className="h-5 w-5" />
          {showBadge && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full text-xs flex items-center justify-center text-white">
              {badgeContent > 9 ? '9+' : badgeContent}
            </span>
          )}
        </button>
      );
    }
    
    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveView(item.id as any);
          setMobileMenuOpen(false);
        }}
        className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors duration-200 group relative ${
          isActive
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <div className="flex items-center flex-shrink-0">
          <Icon className={`h-5 w-5 ${
            isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
          }`} />
        </div>
        
        <div className="ml-3 flex items-center justify-between min-w-0 flex-1 overflow-hidden">
          <span className="font-medium whitespace-nowrap truncate">{item.label}</span>
          {showBadge && (
            <span className="flex-shrink-0 ml-2 flex items-center justify-center px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
              {badgeContent}
            </span>
          )}
        </div>
      </button>
    );
  };

  // Render main content based on active view
  const renderMainContent = () => {
    if (activeView === 'calendar') {
      return (
        <MemoizedCalendar 
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
      );
    }
    
    if (activeView === 'search') {
      return (
        <MemoizedStockSearch
          trades={activeTrades}
          onDateSelect={(date) => setSelectedDate(date)}
          onViewChange={setActiveView}
        />
      );
    }
    
    if (activeView === 'brokers') {
      return <BrokerSetup onTradesImported={() => loadCloudTrades()} />;
    }
    
    if (activeView === 'news') {
      return <MemoizedStockNews trades={activeTrades} />;
    }
    
    // Daily view (default)
    return (
      <div className="space-y-6 sm:space-y-8">
        {/* Trade entry forms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ManualTradeEntry onTradeAdded={handleTradeAdded} />
          <BulkTradeImport onTradesAdded={handleTradesAdded} lastTrade={lastTrade} />
        </div>
        
        {/* Broker notification */}
        {currentUser && brokerConnections.length === 0 && (
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

        <MemoizedDashboard dailyStats={dailyStats} selectedDate={selectedDate} />
        <MemoizedAIInsights trades={activeTrades} selectedDate={selectedDate} />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
          <MemoizedTimeAnalysis trades={activeTrades} selectedDate={selectedDate} />
          <MemoizedEquityCurve trades={activeTrades} selectedDate={selectedDate} />
        </div>
        <MemoizedTradeTable 
          trades={dailyTrades} 
          onUpdateTrade={handleUpdateTrade} 
          onExportTrades={handleExportTrades} 
          onDeleteTrade={handleDeleteTrade} 
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Fixed Desktop Sidebar */}
      <div className={`hidden lg:block fixed top-0 left-0 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 transition-all duration-200 ${
        sidebarCollapsed ? 'w-16' : 'w-72'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 h-16">
          {sidebarCollapsed ? (
            <div className="w-full flex justify-center">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Expand sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center min-w-0 flex-1">
                <button
                  onClick={handleLogoClick}
                  className="flex items-center hover:opacity-80 transition-opacity min-w-0"
                  title="Go to homepage"
                >
                  <TrendingUp className="h-8 w-8 text-blue-600 flex-shrink-0" />
                  <h1 className="ml-3 text-xl font-bold text-gray-900 dark:text-white truncate">
                    DayTradeTracker
                  </h1>
                </button>
              </div>
              
              <div className="flex-shrink-0 ml-3">
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Collapse sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {NAVIGATION_ITEMS.map(renderSidebarItem)}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* Broker Sync Button */}
          {currentUser && brokerConnections.length > 0 && (
            <button
              onClick={handleSyncAllBrokers}
              disabled={isAnySyncing()}
              className={`flex items-center justify-center bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium ${
                sidebarCollapsed ? 'p-2 w-full' : 'w-full px-3 py-2'
              }`}
              title={sidebarCollapsed ? 'Sync all brokers' : ''}
            >
              <RefreshCw className={`h-4 w-4 ${isAnySyncing() ? 'animate-spin' : ''} ${!sidebarCollapsed ? 'mr-2' : ''}`} />
              {!sidebarCollapsed && (
                <span className="whitespace-nowrap">
                  {isAnySyncing() ? 'Syncing...' : 'Sync Brokers'}
                </span>
              )}
            </button>
          )}

          {/* Auth and Theme Toggle */}
          {!sidebarCollapsed ? (
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <AuthComponent onOpenProfile={() => setShowProfile(true)} />
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors flex-shrink-0"
                title="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 w-full flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              title="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`min-h-screen transition-all duration-200 ${
        sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-72'
      }`}>
        {/* Mobile Header - FIXED: Added Dark Mode Toggle */}
        <header className="lg:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
          <div className="px-4 h-16 flex items-center justify-between">
            {/* Mobile Logo */}
            <button 
              onClick={handleLogoClick}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                DayTradeTracker
              </h1>
            </button>

            {/* Mobile Controls - FIXED: Added Dark Mode Toggle */}
            <div className="flex items-center space-x-2">
              {/* Dark Mode Toggle - Always visible on mobile */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="border-t border-gray-200 dark:border-gray-700 py-4 px-4 space-y-2">
              {NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <span className="font-medium">{item.label}</span>
                    {item.id === 'brokers' && brokerConnections.length > 0 && (
                      <span className="ml-auto px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                        {brokerConnections.length}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Mobile Auth */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <AuthComponent onOpenProfile={() => {
                  setShowProfile(true);
                  setMobileMenuOpen(false);
                }} />
              </div>
            </div>
          )}
        </header>

        {/* Desktop Header Bar */}
        <div className="hidden lg:flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {NAVIGATION_ITEMS.find(item => item.id === activeView)?.label || 'Dashboard'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {NAVIGATION_ITEMS.find(item => item.id === activeView)?.description}
            </p>
          </div>

          {/* Centered Date Picker - only show on daily view */}
          {activeView === 'daily' && (
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Selected Date:
              </label>
              <input
                type="date"
                value={dateInputValue}
                onChange={handleDateChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          )}

          <div className="flex items-center space-x-4">
            {/* Refresh Button */}
            {currentUser && (
              <button
                onClick={loadCloudTrades}
                disabled={isLoadingCloudData}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`h-5 w-5 ${isLoadingCloudData ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Auth Component - Desktop (only show when sidebar collapsed) */}
            {sidebarCollapsed && (
              <AuthComponent onOpenProfile={() => setShowProfile(true)} />
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {renderMainContent()}
        </main>
      </div>

      {/* Modals */}
      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        localTrades={localTrades}
        cloudTrades={cloudTrades}
        onSyncToCloud={async () => {}}
        onSyncFromCloud={async () => {}}
        onMergeData={async () => {}}
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