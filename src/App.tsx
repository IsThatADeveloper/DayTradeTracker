// src/App.tsx - Fixed CSV Import Issue
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Moon, Sun, TrendingUp, CalendarDays, RefreshCw, Menu, X, Search, Link, Globe, Home, BarChart3, Settings, Calculator, BookOpen, AlertCircle } from 'lucide-react';
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
import { DailyReview } from './components/DailyReview';
import { HomePage } from './components/HomePage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { tradeService } from './services/tradeService';
import { Tutorial, TutorialButton, useTutorial, WelcomeMessage } from './components/Tutorial';
import { SecurityUtils } from './utils/securityUtils';

// Memoized components to prevent unnecessary re-renders
const MemoizedDashboard = React.memo(Dashboard);
const MemoizedAIInsights = React.memo(AIInsights);
const MemoizedTimeAnalysis = React.memo(TimeAnalysis);
const MemoizedEquityCurve = React.memo(EquityCurve);
const MemoizedTradeTable = React.memo(TradeTable);
const MemoizedCalendar = React.memo(Calendar);
const MemoizedStockSearch = React.memo(StockSearch);
const MemoizedStockNews = React.memo(StockNews);
const MemoizedDailyReview = React.memo(DailyReview);

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
    id: 'review',
    label: 'Daily Review',
    icon: BookOpen,
    description: 'Daily report card and performance rating'
  },
  {
    id: 'search',
    label: 'Stock Analysis',
    icon: Search,
    description: 'Search and analyze stocks'
  },
  {
    id: 'news',
    label: 'Market News',
    icon: Globe,
    description: 'Market research center'
  },
  {
    id: 'projections',
    label: 'Projections',
    icon: Calculator,
    description: 'Earnings and dividend calculator'
  },
  {
    id: 'brokers',
    label: 'Brokers',
    icon: Link,
    description: 'Connect trading accounts'
  }
];

type ActiveViewType = 'calendar' | 'daily' | 'review' | 'search' | 'brokers' | 'news' | 'projections';

// ENHANCED Error Boundary Component with Detailed Logging
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error; errorInfo?: React.ErrorInfo; copied: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, copied: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // ENHANCED: Detailed logging to help debug
    console.group('🔴 Application Error Caught');
    console.error('Error:', error);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Component Stack:', errorInfo?.componentStack);
    console.error('Environment:', {
      url: window.location.href,
      protocol: window.location.protocol,
      host: window.location.host,
      isHTTPS: window.location.protocol === 'https:',
      hasLocalStorage: typeof localStorage !== 'undefined',
      hasCookies: navigator.cookieEnabled,
      isOnline: navigator.onLine,
      userAgent: navigator.userAgent,
      nodeEnv: process.env.NODE_ENV
    });
    console.groupEnd();

    this.setState({ error, errorInfo });

    // Try to send to analytics if available
    try {
      if ((window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: error.toString(),
          fatal: true
        });
      }
    } catch (e) {
      console.error('Failed to log to analytics:', e);
    }
  }

  copyErrorToClipboard = () => {
    const { error, errorInfo } = this.state;
    const errorText = `
=== Application Error Report ===
Time: ${new Date().toISOString()}
URL: ${window.location.href}
Protocol: ${window.location.protocol}
Host: ${window.location.host}
User Agent: ${navigator.userAgent}

Error Message:
${error?.message || 'Unknown error'}

Error Stack:
${error?.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}

Environment:
- Is HTTPS: ${window.location.protocol === 'https:'}
- LocalStorage Available: ${typeof localStorage !== 'undefined'}
- Cookies Enabled: ${navigator.cookieEnabled}
- Online: ${navigator.onLine}
- Node ENV: ${process.env.NODE_ENV}
`;

    navigator.clipboard.writeText(errorText).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy. Please manually copy the error from console.');
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, copied } = this.state;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-red-600 p-6">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-white mr-3" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Application Error</h2>
                  <p className="text-red-100 mt-1">Something went wrong</p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            <div className="p-6 space-y-4">
              {/* Error Message */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                  Error Message:
                </h3>
                <p className="text-red-800 dark:text-red-200 font-mono text-sm break-words">
                  {error?.message || 'Unknown error occurred'}
                </p>
              </div>

              {/* Environment Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                    Environment
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">URL:</span>
                      <span className="text-gray-900 dark:text-white font-mono truncate ml-2 text-right">
                        {window.location.host}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Protocol:</span>
                      <span className="text-gray-900 dark:text-white font-mono">
                        {window.location.protocol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">HTTPS:</span>
                      <span className={`font-mono ${window.location.protocol === 'https:' ? 'text-green-600' : 'text-red-600'}`}>
                        {window.location.protocol === 'https:' ? '✓ Yes' : '✗ No (REQUIRED!)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">NODE_ENV:</span>
                      <span className="text-gray-900 dark:text-white font-mono">
                        {process.env.NODE_ENV}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                    Browser
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">LocalStorage:</span>
                      <span className={`font-mono ${typeof localStorage !== 'undefined' ? 'text-green-600' : 'text-red-600'}`}>
                        {typeof localStorage !== 'undefined' ? '✓ Available' : '✗ Blocked'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Cookies:</span>
                      <span className={`font-mono ${navigator.cookieEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        {navigator.cookieEnabled ? '✓ Enabled' : '✗ Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Online:</span>
                      <span className={`font-mono ${navigator.onLine ? 'text-green-600' : 'text-red-600'}`}>
                        {navigator.onLine ? '✓ Connected' : '✗ Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stack Trace */}
              <details className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                <summary className="p-3 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-sm">
                  📋 View Full Error Stack (Click to expand)
                </summary>
                <div className="p-3 border-t border-gray-200 dark:border-gray-600">
                  <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap">
                    {error?.stack || 'No stack trace available'}
                  </pre>
                </div>
              </details>

              {/* Component Stack */}
              {errorInfo?.componentStack && (
                <details className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <summary className="p-3 cursor-pointer font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-sm">
                    🧩 View Component Stack (Click to expand)
                  </summary>
                  <div className="p-3 border-t border-gray-200 dark:border-gray-600">
                    <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Troubleshooting */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm">
                  💡 Troubleshooting Steps
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-xs text-blue-800 dark:text-blue-200">
                  <li><strong>Open Browser Console (F12)</strong> - Look for red error messages</li>
                  <li><strong>Check HTTPS</strong> - URL must start with https:// (not http://)</li>
                  <li><strong>Clear Cache</strong> - Clear browser cache and cookies</li>
                  <li><strong>Try Incognito</strong> - Test in private/incognito mode</li>
                  <li><strong>Disable Extensions</strong> - Temporarily disable browser extensions</li>
                  <li><strong>Check Firebase Console</strong> - Ensure your domain is authorized</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </button>
                
                <button
                  onClick={this.copyErrorToClipboard}
                  className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium text-sm"
                >
                  {copied ? '✓ Copied!' : 'Copy Error Details'}
                </button>
              </div>

              <div className="text-center text-xs text-gray-600 dark:text-gray-400 pt-2">
                <p>Press F12 to open browser console for more details</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  // CRITICAL: Console logging BEFORE any other code
  console.log('🚀 AppContent: Starting initialization...', {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    protocol: window.location.protocol,
    host: window.location.host,
    isHTTPS: window.location.protocol === 'https:',
    hasLocalStorage: typeof localStorage !== 'undefined',
    hasCookies: navigator.cookieEnabled,
    nodeEnv: process.env.NODE_ENV,
  });

  // Security initialization with detailed error logging
  useEffect(() => {
    console.log('🔒 Security: Initializing...');
    try {
      SecurityUtils.initializeSecurity();
      console.log('✅ Security: Initialized successfully');
    } catch (error) {
      console.error('❌ Security: Initialization failed:', error);
      console.error('Security Error Details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        protocol: window.location.protocol,
        isProduction: process.env.NODE_ENV === 'production'
      });
      
      // In production, prevent app from loading on security failure
      if (process.env.NODE_ENV === 'production') {
        alert(`Security check failed: ${(error as Error).message}\n\nPlease ensure you're using HTTPS.`);
        throw error; // Re-throw to trigger error boundary
      }
    }
  }, []);

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

  // Tutorial hook
  const {
    showTutorial,
    showWelcome,
    hasSeenTutorial,
    hasSeenWelcome,
    startTutorial,
    completeTutorial,
    closeTutorial,
    closeWelcome,
    startTutorialFromWelcome
  } = useTutorial();

  // All useState and useLocalStorage hooks
  const [showHomePage, setShowHomePage] = useLocalStorage('show-homepage', true);
  const [localTrades, setLocalTrades] = useLocalStorage<Trade[]>('day-trader-trades', []);
  const [cloudTrades, setCloudTrades] = useState<Trade[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useLocalStorage<ActiveViewType>('active-view', 'daily');
  const [darkMode, setDarkMode] = useLocalStorage('day-trader-dark-mode', false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isLoadingCloudData, setIsLoadingCloudData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useLocalStorage<string | null>('last-sync-time', null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const activeTrades = currentUser ? cloudTrades : localTrades;
  const totalBrokerTrades = getTotalBrokerTrades();

  useEffect(() => {
    setIsMounted(true);
    console.log('✅ AppContent: Component mounted');
  }, []);

  const handleGetStarted = useCallback(() => {
    console.log('🏠 Getting started - hiding homepage');
    setShowHomePage(false);
  }, [setShowHomePage]);

  const handleLogoClick = useCallback(() => {
    console.log('🏠 Logo clicked, showing homepage');
    setShowHomePage(true);
    setMobileMenuOpen(false);
    setActiveView('daily');
  }, [setShowHomePage, setActiveView]);

  const normalizeToLocalDate = useCallback((date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }, []);

  const isSameDayLocal = useCallback((date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate();
  }, []);

  const loadCloudTrades = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingCloudData(true);
    try {
      const userTrades = await tradeService.getUserTrades(currentUser.uid);
      setCloudTrades(userTrades);
    } catch (error: any) {
      console.error('Failed to load cloud data:', error);
      alert(`Failed to load cloud data: ${error.message}`);
    } finally {
      setIsLoadingCloudData(false);
    }
  }, [currentUser]);

  const handleTradeAdded = useCallback(async (newTrade: Trade) => {
    console.log('📈 App: Trade added:', {
      id: newTrade.id,
      ticker: newTrade.ticker,
      timestamp: newTrade.timestamp,
      dateString: newTrade.timestamp.toDateString()
    });

    if (currentUser) {
      try {
        const tradeId = await tradeService.addTrade(currentUser.uid, newTrade);
        const tradeWithId = { ...newTrade, id: tradeId };
        setCloudTrades(prev => [tradeWithId, ...prev]);
      } catch (error: any) {
        console.error('Failed to save trade:', error);
        alert(`Failed to save trade: ${error.message}`);
      }
    } else {
      setLocalTrades(prev => [newTrade, ...prev]);
    }
  }, [currentUser, setLocalTrades]);

  // FIX: Enhanced handleTradesAdded with better logging and error handling
  const handleTradesAdded = useCallback(async (newTrades: Trade[]) => {
    console.log('📈 App: handleTradesAdded called with trades:', {
      count: newTrades.length,
      isAuthenticated: !!currentUser,
      trades: newTrades.map(t => ({ ticker: t.ticker, timestamp: t.timestamp }))
    });

    if (!newTrades || newTrades.length === 0) {
      console.warn('⚠️ No trades provided to handleTradesAdded');
      return;
    }

    try {
      if (currentUser) {
        console.log('☁️ Saving trades to cloud...');
        const tradesWithIds = await Promise.all(
          newTrades.map(async (trade) => {
            const tradeId = await tradeService.addTrade(currentUser.uid, trade);
            return { ...trade, id: tradeId };
          })
        );
        setCloudTrades(prev => [...tradesWithIds, ...prev]);
        console.log('✅ Successfully saved trades to cloud');
      } else {
        console.log('💾 Saving trades locally...');
        setLocalTrades(prev => [...newTrades, ...prev]);
        console.log('✅ Successfully saved trades locally');
      }
    } catch (error: any) {
      console.error('❌ Failed to save trades:', error);
      alert(`Failed to save trades: ${error.message}`);
      throw error; // Re-throw to let BulkTradeImport handle it
    }
  }, [currentUser, setLocalTrades]);

  const handleUpdateTrade = useCallback(async (tradeId: string, updates: Partial<Trade>) => {
    console.log('🔄 App: Updating trade:', tradeId);

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
        console.error('Update failed:', error);
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
        console.error('Delete failed:', error);
        alert(`Delete failed: ${error.message}`);
      }
    } else {
      setLocalTrades(prev => prev.filter(trade => trade.id !== tradeId));
    }
  }, [currentUser, setLocalTrades]);

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
      console.error('Broker sync failed:', error);
      alert(`Broker sync failed: ${error.message}`);
    }
  }, [syncAllTrades, loadCloudTrades]);

  const handleNavigation = useCallback((viewId: string) => {
    if (['daily', 'review', 'calendar', 'search', 'brokers', 'news', 'projections'].includes(viewId)) {
      setActiveView(viewId as ActiveViewType);
      setMobileMenuOpen(false);
    }
  }, [setActiveView]);

  const dailyTrades = useMemo(() => {
    return activeTrades
      .map(trade => ({
        ...trade,
        timestamp: trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp),
      }))
      .filter(trade => isSameDayLocal(trade.timestamp, selectedDate));
  }, [activeTrades, selectedDate, isSameDayLocal]);

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

  const handleExportTradesWithData = useCallback(() => {
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
  }, [dailyTrades, selectedDate]);

  // FIX: Log callback availability on mount
  useEffect(() => {
    console.log('🔍 Callback check:', {
      handleTradesAdded: typeof handleTradesAdded,
      handleTradeAdded: typeof handleTradeAdded,
      isFunction: typeof handleTradesAdded === 'function'
    });
  }, [handleTradesAdded, handleTradeAdded]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (showHomePage) {
    return <HomePage onGetStarted={handleGetStarted} />;
  }

  const renderSidebarItem = (item: typeof NAVIGATION_ITEMS[0]) => {
    const isActive = activeView === item.id;
    const Icon = item.icon;
    const showBadge = item.id === 'brokers' && brokerConnections.length > 0;
    const badgeContent = item.id === 'brokers' ? brokerConnections.length : totalBrokerTrades;

    if (sidebarCollapsed) {
      return (
        <button
          key={item.id}
          onClick={() => handleNavigation(item.id)}
          data-tutorial={`${item.id}-nav`}
          className={`w-full p-2 flex items-center justify-center rounded-lg transition-colors duration-200 relative ${isActive
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
        onClick={() => handleNavigation(item.id)}
        data-tutorial={`${item.id}-nav`}
        className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors duration-200 group relative ${isActive
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
          }`}
      >
        <div className="flex items-center flex-shrink-0">
          <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
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

  const renderMainContent = () => {
    try {
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

      if (activeView === 'review') {
        return (
          <MemoizedDailyReview
            trades={activeTrades}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
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

      if (activeView === 'projections') {
        return null;
      }

      return (
        <div className="space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div data-tutorial="manual-trade-entry">
              <ManualTradeEntry
                onTradeAdded={handleTradeAdded}
                selectedDate={selectedDate}
              />
            </div>
            {/* FIX: Ensure BulkTradeImport receives valid callback */}
            <BulkTradeImport
              onTradesAdded={handleTradesAdded}
              lastTrade={lastTrade}
              selectedDate={selectedDate}
            />
          </div>

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

          <div data-tutorial="dashboard">
            <MemoizedDashboard dailyStats={dailyStats} selectedDate={selectedDate} />
          </div>
          <MemoizedAIInsights trades={activeTrades} selectedDate={selectedDate} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
            <MemoizedTimeAnalysis trades={activeTrades} selectedDate={selectedDate} />
            <MemoizedEquityCurve trades={activeTrades} selectedDate={selectedDate} />
          </div>
          <MemoizedTradeTable
            trades={dailyTrades}
            onUpdateTrade={handleUpdateTrade}
            onExportTrades={handleExportTradesWithData}
            onDeleteTrade={handleDeleteTrade}
          />
        </div>
      );
    } catch (error) {
      console.error('Error rendering main content:', error);
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Content Error</h3>
          <p className="text-gray-600 dark:text-gray-400">
            There was an error loading this section. Please try refreshing the page.
          </p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className={`hidden lg:flex fixed top-0 left-0 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 transition-all duration-200 flex-col ${sidebarCollapsed ? 'w-16' : 'w-72'
        }`}>
        <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 h-16 flex-shrink-0">
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

        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {NAVIGATION_ITEMS.map(renderSidebarItem)}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3 flex-shrink-0">
          {currentUser && brokerConnections.length > 0 && (
            <button
              onClick={handleSyncAllBrokers}
              disabled={isAnySyncing()}
              className={`flex items-center justify-center bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium ${sidebarCollapsed ? 'p-2 w-full' : 'w-full px-3 py-2'
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

      <div className={`min-h-screen transition-all duration-200 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-72'
        }`}>
        <header className="lg:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 main-header">
          <div className="px-3 sm:px-4 h-16 flex items-center justify-between">
            <button
              onClick={handleLogoClick}
              className="flex items-center hover:opacity-80 transition-opacity min-w-0 flex-shrink-0"
            >
              <TrendingUp className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                <span className="hidden min-[480px]:inline">DayTradeTracker</span>
                <span className="min-[480px]:hidden">DTT</span>
              </h1>
            </button>

            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <div className="hidden sm:block">
                <TutorialButton onClick={startTutorial} />
              </div>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="border-t border-gray-200 dark:border-gray-700 py-4 px-4 space-y-2">
              {NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    data-tutorial={`${item.id}-nav`}
                    className={`w-full flex items-center px-3 py-3 text-left rounded-lg transition-colors ${isActive
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

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <AuthComponent onOpenProfile={() => {
                  setShowProfile(true);
                  setMobileMenuOpen(false);
                }} />
              </div>
            </div>
          )}
        </header>

        <div className="hidden lg:flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 main-header">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {NAVIGATION_ITEMS.find(item => item.id === activeView)?.label || 'Dashboard'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {NAVIGATION_ITEMS.find(item => item.id === activeView)?.description}
            </p>
          </div>

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
            <TutorialButton onClick={startTutorial} />

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

            {sidebarCollapsed && (
              <AuthComponent onOpenProfile={() => setShowProfile(true)} />
            )}
          </div>
        </div>

        <main className="p-4 sm:p-6 lg:p-8">
          {renderMainContent()}
        </main>
      </div>

      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        localTrades={localTrades}
        cloudTrades={cloudTrades}
        onSyncToCloud={async () => { }}
        onSyncFromCloud={async () => { }}
        onMergeData={async () => { }}
      />

      <Profile
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        trades={activeTrades}
      />

      <WelcomeMessage
        isOpen={showWelcome}
        onClose={closeWelcome}
        onStartTutorial={startTutorialFromWelcome}
        userName={currentUser?.displayName || undefined}
      />

      <Tutorial
        isOpen={showTutorial}
        onClose={closeTutorial}
        onComplete={completeTutorial}
        currentView={activeView}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;