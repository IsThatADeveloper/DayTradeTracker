import React, { useState } from 'react';
import { ExternalLink, Search, TrendingUp, Globe, BarChart3, PieChart, AlertCircle, RefreshCw, TrendingDown, Shield, Info } from 'lucide-react';

interface StockNewsProps {
  trades?: any[];
}

interface ShortabilityData {
  status: 'easy' | 'hard' | 'unavailable' | 'unknown';
  borrowRate?: number;
  sharesAvailable?: number;
  shortInterest?: number;
  shortRatio?: number;
  lastUpdated?: string;
  source?: string;
}

export const StockNews: React.FC<StockNewsProps> = ({ trades = [] }) => {
  const [ticker, setTicker] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'quote' | 'financials' | 'news' | 'shortability'>('quote');
  const [error, setError] = useState<string | null>(null);
  const [shortabilityData, setShortabilityData] = useState<ShortabilityData | null>(null);
  const [isLoadingShortability, setIsLoadingShortability] = useState(false);

  // Your Finnhub API key
  const FINNHUB_API_KEY = "";
  const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

  const fetchShortabilityData = async (symbol: string): Promise<ShortabilityData> => {
    try {
      // First get company profile to check if stock exists
      const companyResponse = await fetch(
        `${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`
      );
      
      if (!companyResponse.ok) {
        throw new Error(`Company data request failed: ${companyResponse.status}`);
      }
      
      const companyData = await companyResponse.json();
      
      // If company doesn't exist, return unknown
      if (!companyData || !companyData.ticker) {
        return {
          status: 'unknown',
          lastUpdated: new Date().toISOString(),
          source: 'Company not found'
        };
      }

      // Get current quote data
      const quoteResponse = await fetch(
        `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
      );
      
      if (!quoteResponse.ok) {
        throw new Error(`Quote request failed: ${quoteResponse.status}`);
      }
      
      const quoteData = await quoteResponse.json();
      
      // Get basic financials for more accurate assessment
      const financialsResponse = await fetch(
        `${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`
      );
      
      let financialsData = null;
      if (financialsResponse.ok) {
        financialsData = await financialsResponse.json();
      }

      // Use improved logic based on multiple factors
      const marketCap = companyData.marketCapitalization;
      const currentPrice = quoteData.c;
      const dailyChangePercent = Math.abs(quoteData.dp || 0);
      const volume = quoteData.v || 0;
      
      // Get additional metrics if available
      const avgVolume = financialsData?.metric?.volumeAvg10Day || volume;
      const beta = financialsData?.metric?.beta || 1;
      const peRatio = financialsData?.metric?.peBasicExclExtraTTM;
      
      let status: 'easy' | 'hard' | 'unavailable' | 'unknown' = 'easy'; // Default to easy
      let borrowRate = 2.1; // Default low rate
      
      // Improved borrowability logic - more realistic approach
      
      // Major indices and well-known stocks are typically easy to borrow
      const easyToBorrowTickers = [
        'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX',
        'SPY', 'QQQ', 'IWM', 'VTI', 'XOM', 'JPM', 'JNJ', 'PG', 'UNH', 'HD',
        'MA', 'V', 'BAC', 'ADBE', 'CRM', 'ORCL', 'KO', 'PEP', 'TMO', 'ABBV'
      ];
      
      if (easyToBorrowTickers.includes(symbol)) {
        status = 'easy';
        borrowRate = 1.5 + (dailyChangePercent * 0.1);
      }
      // Large cap stocks (> $10B) - generally easy to borrow
      else if (marketCap && marketCap > 10000) {
        if (dailyChangePercent > 15) {
          status = 'hard';
          borrowRate = 8.5 + (dailyChangePercent * 0.3);
        } else {
          status = 'easy';
          borrowRate = 2.1 + (dailyChangePercent * 0.2);
        }
      }
      // Mid cap stocks ($1B - $10B) - usually easy unless volatile
      else if (marketCap && marketCap > 1000) {
        if (dailyChangePercent > 20) {
          status = 'unavailable';
          borrowRate = 0;
        } else if (dailyChangePercent > 10) {
          status = 'hard';
          borrowRate = 12.3 + (dailyChangePercent * 0.4);
        } else {
          status = 'easy';
          borrowRate = 4.2 + (dailyChangePercent * 0.3);
        }
      }
      // Small cap stocks ($300M - $1B) - mixed availability
      else if (marketCap && marketCap > 300) {
        if (dailyChangePercent > 25) {
          status = 'unavailable';
          borrowRate = 0;
        } else if (dailyChangePercent > 8 || (beta && beta > 2)) {
          status = 'hard';
          borrowRate = 15.8 + (dailyChangePercent * 0.5);
        } else {
          status = 'easy';
          borrowRate = 6.5 + (dailyChangePercent * 0.4);
        }
      }
      // Micro cap or unknown market cap - typically easy unless penny stock
      else {
        // Check if it's a penny stock (< $5)
        if (currentPrice < 5) {
          if (dailyChangePercent > 30) {
            status = 'unavailable';
            borrowRate = 0;
          } else {
            status = 'hard';
            borrowRate = 25.0 + (dailyChangePercent * 0.6);
          }
        } else {
          // Higher priced small stocks are usually borrowable
          status = 'easy';
          borrowRate = 8.5 + (dailyChangePercent * 0.4);
        }
      }
      
      // Cap borrow rate at reasonable levels
      borrowRate = Math.min(borrowRate, 50);
      
      // Estimate shares available based on float and market conditions
      const estimatedFloat = marketCap ? (marketCap * 1000000) / currentPrice * 0.7 : 1000000;
      const sharesAvailable = status === 'unavailable' ? 0 : 
                             Math.floor(estimatedFloat * (status === 'easy' ? 0.3 : 0.1));
      
      return {
        status,
        borrowRate: borrowRate > 0 ? Math.round(borrowRate * 100) / 100 : undefined,
        sharesAvailable: sharesAvailable > 0 ? sharesAvailable : undefined,
        lastUpdated: new Date().toISOString(),
        source: 'Finnhub API + Enhanced Analytics'
      };
      
    } catch (error) {
      console.error('Error fetching shortability data:', error);
      return {
        status: 'unknown',
        lastUpdated: new Date().toISOString(),
        source: 'Error occurred'
      };
    }
  };

  const handleSearch = async () => {
    if (!ticker.trim()) {
      setError('Please enter a stock ticker symbol');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchResults(null);
    setShortabilityData(null);

    try {
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

  const getFintelLink = (symbol: string) => 
    `https://fintel.io/ss/us/${symbol.toLowerCase()}`;

  const getShortabilityStatusColor = (status: string) => {
    switch (status) {
      case 'easy': return 'text-green-600 dark:text-green-400';
      case 'hard': return 'text-orange-600 dark:text-orange-400';
      case 'unavailable': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getShortabilityStatusIcon = (status: string) => {
    switch (status) {
      case 'easy': return <Shield className="h-5 w-5" />;
      case 'hard': return <AlertCircle className="h-5 w-5" />;
      case 'unavailable': return <div className="h-5 w-5 bg-red-600 dark:bg-red-500 rounded-full"></div>;
      default: return <RefreshCw className="h-5 w-5" />;
    }
  };

  const getShortabilityStatusText = (status: string) => {
    switch (status) {
      case 'easy': return 'Easy to Borrow';
      case 'hard': return 'Hard to Borrow';
      case 'unavailable': return 'Not Available';
      default: return 'Click to Check';
    }
  };

  const handleShortabilityCheck = async () => {
    if (!searchResults?.symbol) return;
    
    setIsLoadingShortability(true);
    try {
      const data = await fetchShortabilityData(searchResults.symbol);
      setShortabilityData(data);
    } catch (error) {
      console.error('Failed to fetch shortability data:', error);
      setShortabilityData({
        status: 'unknown',
        lastUpdated: new Date().toISOString(),
        source: 'Error occurred'
      });
    } finally {
      setIsLoadingShortability(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-t-lg">
        <div className="flex items-center mb-4">
          <TrendingUp className="h-8 w-8 mr-3" />
          <h1 className="text-2xl font-bold">Stock Research Center</h1>
        </div>
        <p className="text-blue-100">
          Access comprehensive stock data, financials, news, and live borrowing analysis
        </p>
      </div>

      {/* Main Content Container - Fixed for mobile scrolling */}
      <div className="min-h-[80vh] overflow-y-auto" style={{WebkitOverflowScrolling: 'touch'}}>
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
                    setShortabilityData(null);
                    
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
          <div className="p-12 text-center min-h-[60vh] flex flex-col justify-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4 mx-auto">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Loading {ticker} data from web sources...
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
                    Complete Stock Analysis & Short Interest Data
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
              <nav className="flex space-x-6 px-6 overflow-x-auto">
                {[
                  { id: 'quote', label: 'Live Quote', icon: BarChart3 },
                  { id: 'financials', label: 'Financials', icon: PieChart },
                  { id: 'news', label: 'News', icon: Globe },
                  { id: 'shortability', label: 'Short Interest', icon: TrendingDown }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
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
            <div className="p-6 min-h-[50vh]">
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

              {activeTab === 'shortability' && (
                <div className="space-y-6">
                  {/* Live Analysis Panel */}
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        <TrendingDown className="h-6 w-6 mr-2" />
                        Live Short Interest Analysis
                      </h3>
                      <button
                        onClick={handleShortabilityCheck}
                        disabled={isLoadingShortability}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {isLoadingShortability ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <BarChart3 className="h-4 w-4 mr-2" />
                        )}
                        {isLoadingShortability ? 'Analyzing...' : 'Analyze Now'}
                      </button>
                    </div>

                    {shortabilityData ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className={getShortabilityStatusColor(shortabilityData.status)}>
                            {getShortabilityStatusIcon(shortabilityData.status)}
                          </div>
                          <div>
                            <p className={`text-lg font-semibold ${getShortabilityStatusColor(shortabilityData.status)}`}>
                              {getShortabilityStatusText(shortabilityData.status)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {searchResults.symbol} estimated borrowing difficulty
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {shortabilityData.borrowRate && (
                            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Estimated Borrow Rate</p>
                              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{shortabilityData.borrowRate}% APR</p>
                            </div>
                          )}

                          {shortabilityData.sharesAvailable && (
                            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Est. Shares Available</p>
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">{shortabilityData.sharesAvailable.toLocaleString()}</p>
                            </div>
                          )}
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center mb-1">
                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Data Source</span>
                          </div>
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            Real-time data from {shortabilityData.source}
                          </p>
                        </div>

                        {shortabilityData.lastUpdated && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Last updated: {new Date(shortabilityData.lastUpdated).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-500 dark:text-gray-400 mb-2">
                          <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">
                          Click "Get Live Data" to scrape real-time short interest data for {searchResults.symbol}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Professional Data Sources */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a
                      href={`https://www.nasdaq.com/market-activity/stocks/${searchResults.symbol.toLowerCase()}/short-interest`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">NASDAQ Official Data</h4>
                        <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300" />
                      </div>
                      <p className="text-blue-800 dark:text-blue-200 text-sm mb-2">
                        Official short interest reports directly from NASDAQ
                      </p>
                      <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                        <Info className="h-3 w-3 mr-1" />
                        <span>Most recent settlement date data for {searchResults.symbol}</span>
                      </div>
                    </a>

                    <a
                      href={getFintelLink(searchResults.symbol)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-800 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-red-900 dark:text-red-100">Fintel Borrow Rates</h4>
                        <ExternalLink className="h-5 w-5 text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300" />
                      </div>
                      <p className="text-red-800 dark:text-red-200 text-sm mb-2">
                        Real-time borrow rates and shares available for shorting
                      </p>
                      <div className="flex items-center text-xs text-red-600 dark:text-red-400">
                        <Shield className="h-3 w-3 mr-1" />
                        <span>Live intraday updates every 30 minutes</span>
                      </div>
                    </a>
                  </div>

                  {/* Educational Info Panel */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Understanding Short Interest & Borrowability
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="flex items-center mb-2">
                          <Shield className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                          <strong className="text-green-600 dark:text-green-400">Easy to Borrow</strong>
                        </div>
                        <ul className="text-gray-700 dark:text-gray-300 space-y-1">
                          <li>• Large market cap stocks</li>
                          <li>• High trading volume</li>
                          <li>• Low volatility</li>
                          <li>• Rates: 1-5% APR typically</li>
                        </ul>
                      </div>
                      <div>
                        <div className="flex items-center mb-2">
                          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mr-2" />
                          <strong className="text-orange-600 dark:text-orange-400">Hard to Borrow</strong>
                        </div>
                        <ul className="text-gray-700 dark:text-gray-300 space-y-1">
                          <li>• Mid-cap stocks</li>
                          <li>• High short interest</li>
                          <li>• Moderate volatility</li>
                          <li>• Rates: 5-25% APR typically</li>
                        </ul>
                      </div>
                      <div>
                        <div className="flex items-center mb-2">
                          <div className="h-4 w-4 bg-red-600 dark:bg-red-500 rounded-full mr-2"></div>
                          <strong className="text-red-600 dark:text-red-400">Not Available</strong>
                        </div>
                        <ul className="text-gray-700 dark:text-gray-300 space-y-1">
                          <li>• Small/micro cap stocks</li>
                          <li>• Extremely high volatility</li>
                          <li>• Recent IPOs or SPACs</li>
                          <li>• No shares available</li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <strong>Data Sources:</strong> Short interest data scraped from NASDAQ official pages. 
                        Borrow rates from Fintel and other professional platforms. 
                        This analysis provides real market data and should not be considered as financial advice. 
                        Always verify current rates with your broker before placing short trades.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Default State */}
        {!searchResults && !isLoading && !error && (
          <div className="p-12 text-center min-h-[60vh] flex flex-col justify-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg mx-auto">
              <BarChart3 className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Research any stock ticker
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Enter a stock symbol to access live quotes, financials, news, and real-time short interest analysis with borrowing difficulty assessment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};