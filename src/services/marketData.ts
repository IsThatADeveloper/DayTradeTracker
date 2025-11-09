// src/services/marketData.ts

const POLYGON_API_KEY = import.meta.env.VITE_POLYGON_API_KEY || '';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/**
 * Fetch real intraday stock data from Polygon.io
 * Free tier works for historical data (not real-time)
 * Sign up: https://polygon.io/
 */
export const fetchRealIntradayData = async (
  ticker: string,
  date: Date
): Promise<CandleData[]> => {
  if (!POLYGON_API_KEY) {
    throw new Error('POLYGON_API_KEY not set in environment variables');
  }

  // Format date as YYYY-MM-DD
  const dateStr = date.toISOString().split('T')[0];
  
  try {
    // Polygon.io aggregates endpoint - 1 minute bars
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker.toUpperCase()}/range/1/minute/${dateStr}/${dateStr}?adjusted=true&sort=asc&limit=50000&apiKey=${POLYGON_API_KEY}`;
    
    console.log(`Fetching market data for ${ticker} on ${dateStr}...`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Polygon API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    // Check if we have results
    if (!data.results || data.results.length === 0) {
      throw new Error(`No market data available for ${ticker} on ${dateStr}. Market may have been closed.`);
    }
    
    console.log(`Received ${data.results.length} candles for ${ticker}`);
    
    // Convert Polygon format to our format
    return data.results.map((candle: any) => ({
      time: Math.floor(candle.t / 1000), // Convert milliseconds to seconds
      open: parseFloat(candle.o.toFixed(4)),
      high: parseFloat(candle.h.toFixed(4)),
      low: parseFloat(candle.l.toFixed(4)),
      close: parseFloat(candle.c.toFixed(4)),
      volume: candle.v,
    }));
  } catch (error: any) {
    console.error('Failed to fetch market data from Polygon:', error);
    throw error;
  }
};

/**
 * In-memory cache to avoid hitting API rate limits
 * Cache duration: 1 hour (historical data doesn't change)
 */
const cache = new Map<string, { data: CandleData[], timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export const fetchIntradayDataWithCache = async (
  ticker: string,
  date: Date
): Promise<CandleData[]> => {
  const cacheKey = `${ticker.toUpperCase()}-${date.toISOString().split('T')[0]}`;
  const cached = cache.get(cacheKey);
  
  // Return cached data if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached data for ${cacheKey}`);
    return cached.data;
  }
  
  // Fetch fresh data
  const data = await fetchRealIntradayData(ticker, date);
  
  // Store in cache
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
};

/**
 * Clear the cache (useful for testing)
 */
export const clearCache = () => {
  cache.clear();
};