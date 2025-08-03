import React, { useState, useMemo, useEffect } from 'react';
import { Moon, Sun, TrendingUp, CalendarDays, RefreshCw, User, LogOut } from 'lucide-react';
import { Trade } from './types/trade';
import { useLocalStorage } from './hooks/useLocalStorage';
import { calculateDailyStats, calculateHourlyStats, getWeeklyStats } from './utils/tradeUtils';
import { ManualTradeEntry } from './components/ManualTradeEntry';
import { Calendar } from './components/Calendar';
import { Dashboard } from './components/Dashboard';
import { TimeAnalysis } from './components/TimeAnalysis';
import { TradeTable } from './components/TradeTable';
import { EquityCurve } from './components/EquityCurve';
import { AuthComponent } from './components/AuthComponent';
import { SyncModal } from './components/SyncModal';
import { DebugPanel } from './components/DebugPanel';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { tradeService } from './services/tradeService';
import { isSameDay } from 'date-fns';

function AppContent() {
  const { currentUser, signOut } = useAuth();
  const [localTrades, setLocalTrades] = useLocalStorage<Trade[]>('day-trader-trades', []);
  const [cloudTrades, setCloudTrades] = useState<Trade[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useState<'calendar' | 'daily'>('daily');
  const [darkMode, setDarkMode] = useLocalStorage('day-trader-dark-mode', false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isLoadingCloudData, setIsLoadingCloudData] = useState(false);
  const [cloudDataError, setCloudDataError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useLocalStorage<string | null>('last-sync-time', null);
  // Circuit breaker state to prevent excessive retries
  const [isCircuitBreakerOpen, setIsCircuitBreakerOpen] = useState(false);
  const [lastFailureTime, setLastFailureTime] = useState<number | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  // Debouncing state to prevent multiple simultaneous requests
  const [isLoadingInProgress, setIsLoadingInProgress] = useState(false);

  // FIXED: Always use the correct data source - if authenticated, use cloud data, otherwise local
  const activeTrades = currentUser ? cloudTrades : localTrades;
  const isUsingCloudData = !!currentUser;

  console.log('🔍 Data Source Debug:', {
    isAuthenticated: !!currentUser,
    userEmail: currentUser?.email,
    localTradesCount: localTrades.length,
    cloudTradesCount: cloudTrades.length,
    activeTradesCount: activeTrades.length,
    dataSource: currentUser ? 'CLOUD' : 'LOCAL',
    isLoadingCloudData
  });

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Circuit breaker constants
  const CIRCUIT_BREAKER_THRESHOLD = 3; // failures
  const CIRCUIT_BREAKER_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  const MAX_CONSECUTIVE_FAILURES = 5; // Stop trying after 5 consecutive failures

  // Check if circuit breaker should be reset
  useEffect(() => {
    if (isCircuitBreakerOpen && lastFailureTime) {
      const timeSinceLastFailure = Date.now() - lastFailureTime;
      if (timeSinceLastFailure > CIRCUIT_BREAKER_TIMEOUT) {
        console.log('🔄 Circuit breaker timeout elapsed, resetting');
        setIsCircuitBreakerOpen(false);
        setConsecutiveFailures(0);
        setLastFailureTime(null);
      }
    }
  }, [isCircuitBreakerOpen, lastFailureTime]);

  // FIXED: Load cloud data when user signs in and handle sign out properly
  useEffect(() => {
    if (currentUser) {
      console.log('👤 User signed in, loading cloud data for:', currentUser.email);
      
      // Check circuit breaker before attempting to load
      if (isCircuitBreakerOpen) {
        const timeRemaining = lastFailureTime ? Math.ceil((CIRCUIT_BREAKER_TIMEOUT - (Date.now() - lastFailureTime)) / 1000 / 60) : 0;
        console.log(`🚫 Circuit breaker is open, waiting ${timeRemaining} more minutes before retry`);
        setCloudDataError(`Too many failed attempts. Please wait ${timeRemaining} minutes before trying again, or sign out and back in.`);
        return;
      }

      // Check if we've exceeded maximum consecutive failures
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.log('🚫 Maximum consecutive failures reached, stopping automatic retries');
        setCloudDataError('Multiple failed attempts detected. Please sign out and sign back in, or contact support if the issue persists.');
        return;
      }

      // Prevent multiple simultaneous requests
      if (isLoadingInProgress) {
        console.log('⏳ Cloud data loading already in progress, skipping duplicate request');
        return;
      }

      // Wait for authentication token to be available before loading data
      const loadDataWhenReady = async () => {
        try {
          setIsLoadingInProgress(true);
          // Ensure the user's token is available and valid
          await currentUser.getIdToken(true);
          console.log('✅ Authentication token confirmed, loading cloud data');
          await loadCloudTrades();
          
          // Reset failure counters on success
          setConsecutiveFailures(0);
          setLastFailureTime(null);
          setIsCircuitBreakerOpen(false);
        } catch (error) {
          console.error('❌ Failed to get authentication token:', error);
          handleCloudDataFailure('Authentication issue. Please sign out and sign in again.');
        } finally {
          setIsLoadingInProgress(false);
        }
      };
      
      loadDataWhenReady();
    } else {
      console.log('👤 User signed out, clearing cloud data and resetting failure states');
      setCloudTrades([]);
      setCloudDataError(null); // Clear any cloud data errors
      setIsLoadingCloudData(false);
      setIsLoadingInProgress(false);
      // Reset circuit breaker state on sign out
      setIsCircuitBreakerOpen(false);
      setConsecutiveFailures(0);
      setLastFailureTime(null);
    }
  }, [currentUser, isCircuitBreakerOpen, consecutiveFailures, isLoadingInProgress]);

  // IMPROVED: Show sync modal logic with better timing checks
  useEffect(() => {
    // Only show sync modal if:
    // 1. User is authenticated
    // 2. Has local trades
    // 3. Cloud data has finished loading (either has trades or is empty)
    // 4. Haven't synced before
    if (currentUser && localTrades.length > 0 && !isLoadingCloudData && !lastSyncTime) {
      console.log('🔄 Showing sync modal - user has local data, cloud loading complete');
      setShowSyncModal(true);
    }
  }, [currentUser, localTrades.length, cloudTrades.length, isLoadingCloudData, lastSyncTime]);

  // Handle cloud data loading failures with circuit breaker logic
  const handleCloudDataFailure = (errorMessage: string) => {
    const newFailureCount = consecutiveFailures + 1;
    setConsecutiveFailures(newFailureCount);
    setLastFailureTime(Date.now());
    
    if (newFailureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      console.log(`🚫 Circuit breaker triggered after ${newFailureCount} failures`);
      setIsCircuitBreakerOpen(true);
    }
    
    setCloudDataError(errorMessage);
  };

  const loadCloudTrades = async (retryCount = 0) => {
    if (!currentUser) {
      console.log('❌ No user, cannot load cloud trades');
      return;
    }
    
    // Check circuit breaker before proceeding
    if (isCircuitBreakerOpen) {
      console.log('🚫 Circuit breaker is open, skipping cloud data load');
      return;
    }
    
    setIsLoadingCloudData(true);
    setCloudDataError(null); // Clear previous errors
    
    try {
      console.log('☁️ Loading trades for user:', currentUser.uid);
      
      const userTrades = await tradeService.getUserTrades(currentUser.uid);
      setCloudTrades(userTrades);
      setCloudDataError(null); // Clear any previous errors on success
      console.log(`✅ Loaded ${userTrades.length} trades from cloud for ${currentUser.email}`);
      
      // Reset failure counters on success
      setConsecutiveFailures(0);
      setLastFailureTime(null);
      setIsCircuitBreakerOpen(false);
      
      // Store successful load time to avoid unnecessary retries
      setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error('❌ Failed to load cloud trades:', error);
      
      // Improved retry logic with better error categorization
      const isPermissionError = error.message.includes('Permission denied') || error.code === 'permission-denied';
      const isNetworkError = error.message.includes('network') || error.code === 'unavailable';
      const isAuthError = error.message.includes('Authentication') || error.code === 'unauthenticated';
      
      // Reduce automatic retries to prevent excessive reloading - only retry once for network errors
      const maxRetries = isNetworkError ? 1 : 0;
      
      if (retryCount < maxRetries && !isPermissionError && !isAuthError) {
        console.log(`🔄 Retrying cloud data load (attempt ${retryCount + 1}) - ${isNetworkError ? 'Network' : 'Unknown'} error`);
        setTimeout(() => loadCloudTrades(retryCount + 1), 2000 * Math.pow(2, retryCount)); // Longer exponential backoff
        return;
      }
      
      // Show user-friendly error message based on error type
      let errorMessage;
      if (isPermissionError) {
        errorMessage = 'Permission denied. Please sign out and sign in again, or check your Firebase security rules.';
      } else if (isAuthError) {
        errorMessage = 'Authentication expired. Please sign out and sign in again.';
      } else if (isNetworkError) {
        errorMessage = 'Network error. Please check your internet connection and try again manually.';
      } else {
        errorMessage = 'Failed to load cloud data. Please try refreshing the page or contact support if the issue persists.';
      }
      
      // Use circuit breaker failure handler instead of direct error setting
      handleCloudDataFailure(errorMessage);
      
      // Don't show alert for retryable errors, only for final failures
      if (isPermissionError || isAuthError || retryCount >= maxRetries) {
        console.log('🚨 Final failure reached, user intervention required');
      }
    } finally {
      setIsLoadingCloudData(false);
    }
  };

  const syncToCloud = async () => {
    if (!currentUser) return;
    
    try {
      console.log('📤 Syncing local trades to cloud...');
      
      // Clear existing cloud data if any
      if (cloudTrades.length > 0) {
        console.log(`🗑️ Clearing ${cloudTrades.length} existing cloud trades`);
        await Promise.allSettled(cloudTrades.map(trade => tradeService.deleteTrade(trade.id)));
      }
      
      // Upload all local trades using the improved sync method
      const syncedTrades = await tradeService.syncLocalTrades(currentUser.uid, localTrades);
      
      // Update cloud trades state with synced trades
      setCloudTrades(syncedTrades);
      setLastSyncTime(new Date().toISOString());
      console.log(`✅ Successfully synced ${syncedTrades.length} trades to cloud`);
    } catch (error) {
      console.error('❌ Failed to sync to cloud:', error);
      const errorMessage = error.message.includes('Permission denied')
        ? 'Permission denied. Please sign out and sign in again.'
        : 'Sync failed. Please try again or check your internet connection.';
      throw new Error(errorMessage);
    }
  };

  const syncFromCloud = async () => {
    if (!currentUser) return;
    
    try {
      console.log('📥 Syncing cloud trades to local...');
      await loadCloudTrades();
      setLastSyncTime(new Date().toISOString());
      console.log('✅ Successfully synced cloud data');
    } catch (error) {
      console.error('❌ Failed to sync from cloud:', error);
      const errorMessage = error.message.includes('Permission denied')
        ? 'Permission denied. Please sign out and sign in again.'
        : 'Failed to sync from cloud. Please try again or check your internet connection.';
      throw new Error(errorMessage);
    }
  };

  const mergeData = async () => {
    if (!currentUser) return;
    
    try {
      console.log('🔀 Merging local and cloud data...');
      // Create a map to avoid duplicates based on timestamp, ticker, and prices
      const tradeMap = new Map<string, Trade>();
      
      // Add cloud trades first
      cloudTrades.forEach(trade => {
        const key = `${trade.timestamp.getTime()}_${trade.ticker}_${trade.entryPrice}_${trade.exitPrice}_${trade.quantity}`;
        tradeMap.set(key, trade);
      });
      
      // Add local trades that don't exist in cloud
      const newTrades: Trade[] = [];
      localTrades.forEach(trade => {
        const key = `${trade.timestamp.getTime()}_${trade.ticker}_${trade.entryPrice}_${trade.exitPrice}_${trade.quantity}`;
        if (!tradeMap.has(key)) {
          newTrades.push(trade);
          tradeMap.set(key, trade);
        }
      });
      
      // Upload new trades to cloud
      if (newTrades.length > 0) {
        console.log(`📤 Uploading ${newTrades.length} new trades to cloud`);
        const results = await Promise.allSettled(
          newTrades.map(trade => tradeService.addTrade(currentUser.uid, trade))
        );
        
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failCount = results.length - successCount;
        
        if (failCount > 0) {
          console.warn(`⚠️ ${failCount} trades failed to upload during merge`);
        }
        console.log(`✅ ${successCount} new trades uploaded successfully`);
      }
      
      // Reload cloud data to get the complete merged dataset
      await loadCloudTrades();
      setLastSyncTime(new Date().toISOString());
      console.log(`✅ Merged data: ${newTrades.length} new trades added to cloud`);
    } catch (error) {
      console.error('❌ Failed to merge data:', error);
      const errorMessage = error.message.includes('Permission denied')
        ? 'Permission denied. Please sign out and sign in again.'
        : 'Failed to merge data. Please try again or check your internet connection.';
      throw new Error(errorMessage);
    }
  };

  const dailyTrades = useMemo(() => {
    return activeTrades
      .map(trade => ({
        ...trade,
        timestamp: new Date(trade.timestamp),
      }))
      .filter(trade => isSameDay(trade.timestamp, selectedDate));
  }, [activeTrades, selectedDate]);

  const dailyStats = useMemo(() => calculateDailyStats(dailyTrades, selectedDate), [dailyTrades, selectedDate]);
  const hourlyStats = useMemo(() => calculateHourlyStats(dailyTrades, selectedDate), [dailyTrades, selectedDate]);
  const weeklyStats = useMemo(() => getWeeklyStats(activeTrades, selectedDate), [activeTrades, selectedDate]);

  // FIXED: Simplified trade addition logic
  const handleTradeAdded = async (newTrade: Trade) => {
    if (currentUser) {
      try {
        console.log('📝 Adding trade to cloud for user:', currentUser.email);
        const tradeId = await tradeService.addTrade(currentUser.uid, newTrade);
        const tradeWithId = { ...newTrade, id: tradeId };
        
        // FIXED: Update cloud trades immediately
        setCloudTrades(prev => {
          const updated = [tradeWithId, ...prev];
          console.log('✅ Cloud trades updated, new count:', updated.length);
          return updated;
        });
        console.log('✅ Trade added to cloud successfully');
      } catch (error) {
        console.error('❌ Failed to add trade to cloud:', error);
        const errorMessage = error.message.includes('Permission denied')
          ? 'Permission denied. Please sign out and sign in again.'
          : 'Failed to save trade to cloud. Please try again.';
        alert(errorMessage);
        
        // Optionally save to local storage as backup if cloud fails
        console.log('💾 Saving trade to local storage as backup');
        setLocalTrades(prevTrades => [newTrade, ...prevTrades]);
      }
    } else {
      console.log('📝 Adding trade to local storage');
      setLocalTrades(prevTrades => [newTrade, ...prevTrades]);
    }
  };

  // FIXED: Update trade logic
  const handleUpdateTrade = async (tradeId: string, updates: Partial<Trade>) => {
    if (currentUser) {
      try {
        console.log('✏️ Updating trade in cloud:', tradeId);
        await tradeService.updateTrade(tradeId, updates);
        setCloudTrades(prev =>
          prev.map(trade =>
            trade.id === tradeId ? { ...trade, ...updates } : trade
          )
        );
        console.log('✅ Trade updated in cloud successfully');
      } catch (error) {
        console.error('❌ Failed to update trade in cloud:', error);
        const errorMessage = error.message.includes('Permission denied')
          ? 'Permission denied. Please sign out and sign in again.'
          : 'Failed to update trade in cloud. Please try again.';
        alert(errorMessage);
      }
    } else {
      console.log('✏️ Updating trade in local storage:', tradeId);
      setLocalTrades(prevTrades =>
        prevTrades.map(trade =>
          trade.id === tradeId ? { ...trade, ...updates } : trade
        )
      );
    }
  };

  // FIXED: Delete trade logic
  const handleDeleteTrade = async (tradeId: string) => {
    if (currentUser) {
      try {
        console.log('🗑️ Deleting trade from cloud:', tradeId);
        await tradeService.deleteTrade(tradeId);
        setCloudTrades(prev => prev.filter(trade => trade.id !== tradeId));
        console.log('✅ Trade deleted from cloud successfully');
      } catch (error) {
        console.error('❌ Failed to delete trade from cloud:', error);
        const errorMessage = error.message.includes('Permission denied')
          ? 'Permission denied. Please sign out and sign in again.'
          : 'Failed to delete trade from cloud. Please try again.';
        alert(errorMessage);
      }
    } else {
      console.log('🗑️ Deleting trade from local storage:', tradeId);
      setLocalTrades(prevTrades => prevTrades.filter(trade => trade.id !== tradeId));
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
                DayTradeTracker
              </h1>
              
              {/* IMPROVED: Data Source Indicator with Error States */}
              <div className="ml-4 flex items-center space-x-2">
                {currentUser ? (
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
                    cloudDataError 
                      ? 'bg-red-100 dark:bg-red-900/20' 
                      : 'bg-green-100 dark:bg-green-900/20'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isLoadingCloudData 
                        ? 'bg-blue-500 animate-pulse' 
                        : cloudDataError 
                        ? 'bg-red-500' 
                        : 'bg-green-500'
                    }`}></div>
                    <span className={`text-xs ${
                      cloudDataError 
                        ? 'text-red-800 dark:text-red-200' 
                        : 'text-green-800 dark:text-green-200'
                    }`}>
                      {isLoadingCloudData 
                        ? 'Loading...' 
                        : cloudDataError 
                        ? 'Error' 
                        : `Cloud (${cloudTrades.length})`
                      }
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-xs text-yellow-800 dark:text-yellow-200">
                      Local ({localTrades.length})
                    </span>
                  </div>
                )}
              </div>
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

              {currentUser && (
                <button
                  onClick={() => {
                    if (isCircuitBreakerOpen) {
                      const timeRemaining = lastFailureTime ? Math.ceil((CIRCUIT_BREAKER_TIMEOUT - (Date.now() - lastFailureTime)) / 1000 / 60) : 0;
                      alert(`Please wait ${timeRemaining} more minutes before trying again, or sign out and back in to reset the connection.`);
                      return;
                    }
                    
                    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                      const shouldReset = confirm('Multiple failures detected. Would you like to reset the error counter and try again? (Consider signing out and back in if this continues)');
                      if (shouldReset) {
                        setConsecutiveFailures(0);
                        setLastFailureTime(null);
                        setCloudDataError(null);
                        loadCloudTrades(0);
                      }
                      return;
                    }
                    
                    loadCloudTrades(0);
                  }}
                  disabled={isLoadingCloudData || isLoadingInProgress}
                  className={`p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md disabled:opacity-50 ${
                    cloudDataError ? 'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200' : ''
                  } ${isCircuitBreakerOpen ? 'cursor-not-allowed' : ''}`}
                  title={
                    isCircuitBreakerOpen 
                      ? `Circuit breaker active - wait ${lastFailureTime ? Math.ceil((CIRCUIT_BREAKER_TIMEOUT - (Date.now() - lastFailureTime)) / 1000 / 60) : 0} minutes`
                      : consecutiveFailures >= MAX_CONSECUTIVE_FAILURES
                      ? 'Multiple failures detected - click to reset and retry'
                      : cloudDataError 
                      ? `Retry loading cloud data - ${cloudDataError}` 
                      : 'Refresh cloud data'
                  }
                >
                  <RefreshCw className={`h-5 w-5 ${isLoadingCloudData || isLoadingInProgress ? 'animate-spin' : ''} ${isCircuitBreakerOpen ? 'text-red-500' : ''}`} />
                </button>
              )}

              <AuthComponent />

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

      {/* Cloud Data Error Banner */}
      {currentUser && cloudDataError && !isLoadingCloudData && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full ${isCircuitBreakerOpen ? 'bg-red-600' : 'bg-red-500'}`}></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Cloud data error:</strong> {cloudDataError}
                    {isCircuitBreakerOpen && (
                      <span className="block mt-1 text-xs">
                        Too many failures detected. Wait {lastFailureTime ? Math.ceil((CIRCUIT_BREAKER_TIMEOUT - (Date.now() - lastFailureTime)) / 1000 / 60) : 0} minutes or sign out/in to reset.
                      </span>
                    )}
                    {consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && !isCircuitBreakerOpen && (
                      <span className="block mt-1 text-xs">
                        Multiple failures detected. Consider signing out and back in.
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!isCircuitBreakerOpen && (
                  <>
                    {consecutiveFailures >= MAX_CONSECUTIVE_FAILURES ? (
                      <button
                        onClick={() => {
                          setConsecutiveFailures(0);
                          setLastFailureTime(null);
                          setCloudDataError(null);
                          loadCloudTrades(0);
                        }}
                        className="text-sm bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors"
                      >
                        Reset & Retry
                      </button>
                    ) : (
                      <button
                        onClick={() => loadCloudTrades(0)}
                        disabled={isLoadingInProgress}
                        className="text-sm bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-1 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        Retry
                      </button>
                    )}
                                         <button
                       onClick={() => {
                         if (confirm('Sign out and back in to reset the connection? This will clear local state.')) {
                           signOut();
                         }
                       }}
                       className="text-sm bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-md hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                     >
                       Sign Out & Reset
                     </button>
                  </>
                )}
                <button
                  onClick={() => setCloudDataError(null)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                  title="Dismiss error"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <ManualTradeEntry onTradeAdded={handleTradeAdded} />

          {activeView === 'calendar' ? (
            <Calendar
              trades={activeTrades}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onMonthChange={setCurrentMonth}
              currentMonth={currentMonth}
            />
          ) : activeTrades.length === 0 && !isLoadingCloudData ? (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Start Adding Your Trades
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Add your first trade using the form above to start tracking your performance
              </p>
              {!currentUser && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    💡 Sign in with Google to sync your trades across devices and never lose your data!
                  </p>
                </div>
              )}
              {currentUser && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-green-800 dark:text-green-200 text-sm">
                    ✅ You're signed in as {currentUser.email}. Your trades will be saved to the cloud!
                  </p>
                </div>
              )}
            </div>
          ) : isLoadingCloudData ? (
            <div className="text-center py-12">
              <RefreshCw className="mx-auto h-12 w-12 text-blue-600 animate-spin mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Loading Your Cloud Data
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Syncing trades for {currentUser?.email}...
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

      <SyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        localTrades={localTrades}
        cloudTrades={cloudTrades}
        onSyncToCloud={syncToCloud}
        onSyncFromCloud={syncFromCloud}
        onMergeData={mergeData}
      />

      <DebugPanel
        cloudTrades={cloudTrades}
        localTrades={localTrades}
        isLoadingCloudData={isLoadingCloudData}
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