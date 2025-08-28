import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Search, TrendingUp, Globe, BarChart3, PieChart, AlertCircle, RefreshCw } from 'lucide-react';

interface StockNewsProps {
  trades?: any[];
}

export const StockNews: React.FC<StockNewsProps> = ({ trades = [] }) => {
  const [ticker, setTicker] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'quote' | 'financials' | 'news'>('quote');
  const [error, setError] = useState<string | null>(null);
  
  // Remove the aggressive bounce prevention refs - this is causing the issue
  // const containerRef = useRef<HTMLDivElement>(null);
  // const contentRef = useRef<HTMLDivElement>(null);

  // REMOVE this entire useEffect - it's what's breaking scrolling
  /*
  useEffect(() => {
    const preventBounce = (element: HTMLElement) => {
      if (!element) return;
      
      let touchStartY = 0;
      
      const handleTouchStart = (e: TouchEvent) => {
        touchStartY = e.touches[0].clientY;
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        const touchY = e.touches[0].clientY;
        const deltaY = touchY - touchStartY;
        
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;
        
        // If at top and trying to scroll up, prevent
        if (deltaY > 0 && scrollTop <= 1) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        
        // If at bottom and trying to scroll down, prevent
        if (deltaY < 0 && scrollTop + clientHeight >= scrollHeight - 1) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
      
      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      
      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
      };
    };
    
    const cleanupFunctions: (() => void)[] = [];
    
    if (containerRef.current) {
      const cleanup = preventBounce(containerRef.current);
      if (cleanup) cleanupFunctions.push(cleanup);
    }
    
    if (contentRef.current) {
      const cleanup = preventBounce(contentRef.current);
      if (cleanup) cleanupFunctions.push(cleanup);
    }
    
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [searchResults]); 
  */

  const handleSearch = async () => {
    if (!ticker.trim()) {
      setError('Please enter a stock ticker symbol');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchResults(null);

    try {
      // Simulate search - in reality, you'd integrate with your existing web_search functionality
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const upperTicker = ticker.toUpperCase();
      setSearchResults({
        symbol: upperTicker,
        searchPerformed: true
      });
      
      setActiveTab('quote');
    } catch (err) {
      setError('Failed to search for stock data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Get popular tickers from trades
  const getPopularTickers = () => {
    if (!trades || trades.length === 0) {
      return ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
    }
    
    const tickerCounts = trades.reduce((acc: any, trade: any) => {
      acc[trade.ticker] = (acc[trade.ticker] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(tickerCounts)
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 6)
      .map(([ticker]: any) => ticker);
  };

  const popularTickers = getPopularTickers();

  const getYahooFinanceLinks = (symbol: string) => ({
    quote: `https://finance.yahoo.com/quote/${symbol}`,
    news: `https://finance.yahoo.com/quote/${symbol}/news`,
    financials: `https://finance.yahoo.com/quote/${symbol}/financials`,
    statistics: `https://finance.yahoo.com/quote/${symbol}/key-statistics`
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-t-lg">
        <div className="flex items-center mb-4">
          <TrendingUp className="h-8 w-8 mr-3" />
          <h1 className="text-2xl font-bold">Stock Research Center</h1>
        </div>
        <p className="text-blue-100">
          Access comprehensive Yahoo Finance data for any stock
        </p>
      </div>

      {/* FIXED: Remove all the problematic styling and just use normal scrolling */}
      <div className="max-h-screen overflow-y-auto">
        {/* Search Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Enter stock ticker (e.g., AAPL, TSLA, MSFT)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                maxLength={10}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
            >
              {isLoading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Search
                </>
              )}
            </button>
          </div>

          {/* Popular Tickers */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {trades && trades.length > 0 ? 'Your Most Traded' : 'Popular Stocks'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {popularTickers.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => {
                    setTicker(symbol);
                    setError(null);
                    setIsLoading(true);
                    setSearchResults(null);
                    
                    setTimeout(() => {
                      setSearchResults({
                        symbol: symbol,
                        searchPerformed: true
                      });
                      setActiveTab('quote');
                      setIsLoading(false);
                    }, 800);
                  }}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-sm font-medium"
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Loading {ticker} data from Yahoo Finance...
            </p>
          </div>
        )}

        {/* Results */}
        {searchResults && !isLoading && (
          <div>
            {/* Stock Header */}
            <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {searchResults.symbol}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Yahoo Finance Data Access
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Live Data Available</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'quote', label: 'Live Quote & Chart', icon: BarChart3 },
                  { id: 'financials', label: 'Financial Data', icon: PieChart },
                  { id: 'news', label: 'News & Analysis', icon: Globe }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <tab.icon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'quote' && (
                <div>
                  <a
                    href={getYahooFinanceLinks(searchResults.symbol).quote}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
                          <BarChart3 className="h-6 w-6 mr-2" />
                          Live Quote & Chart
                        </h3>
                        <p className="text-green-800 dark:text-green-200">
                          Real-time price, charts, and market data for {searchResults.symbol}
                        </p>
                      </div>
                      <ExternalLink className="h-8 w-8 text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300" />
                    </div>
                  </a>
                </div>
              )}

              {activeTab === 'financials' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                    href={getYahooFinanceLinks(searchResults.symbol).statistics}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Key Statistics</h3>
                      <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300" />
                    </div>
                    <p className="text-blue-800 dark:text-blue-200 text-sm">
                      P/E ratio, market cap, float, beta, and all key metrics
                    </p>
                  </a>

                  <a
                    href={getYahooFinanceLinks(searchResults.symbol).financials}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Financial Statements</h3>
                      <ExternalLink className="h-5 w-5 text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300" />
                    </div>
                    <p className="text-green-800 dark:text-green-200 text-sm">
                      Income statement, balance sheet, cash flow
                    </p>
                  </a>
                </div>
              )}

              {activeTab === 'news' && (
                <div>
                  <a
                    href={getYahooFinanceLinks(searchResults.symbol).news}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center">
                          <Globe className="h-6 w-6 mr-2" />
                          Latest News & Analysis
                        </h3>
                        <p className="text-purple-800 dark:text-purple-200">
                          Breaking news, earnings reports, and analyst coverage for {searchResults.symbol}
                        </p>
                      </div>
                      <ExternalLink className="h-8 w-8 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300" />
                    </div>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Default State */}
        {!searchResults && !isLoading && !error && (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
              <BarChart3 className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Search any stock ticker
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Enter a stock symbol to access Yahoo Finance data including live quotes, financial metrics, and news.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};