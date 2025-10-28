// src/services/brokerCSVParser.ts - Unified Broker CSV Parser
// Supports: TD Ameritrade, Interactive Brokers, Robinhood, WeBull, and Generic formats

import { Trade } from '../types/trade';
import { generateTradeId } from '../utils/tradeUtils';

export type BrokerType = 'tdameritrade' | 'interactivebrokers' | 'robinhood' | 'webull' | 'generic' | 'auto';

export interface CSVParseResult {
  success: boolean;
  trades: Trade[];
  errors: string[];
  warnings: string[];
  detectedBroker?: BrokerType;
  tradesImported: number;
}

export interface ColumnMapping {
  timestamp?: number;
  ticker?: number;
  direction?: number;
  quantity?: number;
  entryPrice?: number;
  exitPrice?: number;
  realizedPL?: number;
  notes?: number;
}

/**
 * Main CSV Parser Service
 */
export class BrokerCSVParser {
  /**
   * Parse CSV data with automatic broker detection or specified broker type
   */
  static async parseCSV(
    csvText: string,
    brokerType: BrokerType = 'auto',
    selectedDate?: Date
  ): Promise<CSVParseResult> {
    const result: CSVParseResult = {
      success: false,
      trades: [],
      errors: [],
      warnings: [],
      tradesImported: 0,
    };

    try {
      // Clean and split CSV
      const lines = csvText.trim().split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        result.errors.push('CSV file is empty');
        return result;
      }

      // Parse header
      const headerLine = lines[0];
      const headers = this.parseCSVLine(headerLine);

      // Detect broker type if auto
      if (brokerType === 'auto') {
        brokerType = this.detectBrokerType(headers, lines);
        result.detectedBroker = brokerType;
        console.log('🔍 Auto-detected broker type:', brokerType);
      }

      // Parse based on broker type
      switch (brokerType) {
        case 'tdameritrade':
          return this.parseTDAmeritrade(lines, headers, selectedDate);
        case 'interactivebrokers':
          return this.parseInteractiveBrokers(lines, headers, selectedDate);
        case 'robinhood':
          return this.parseRobinhood(lines, headers, selectedDate);
        case 'webull':
          return this.parseWeBull(lines, headers, selectedDate);
        case 'generic':
        default:
          return this.parseGeneric(lines, headers, selectedDate);
      }
    } catch (error) {
      result.errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Detect broker type from CSV structure
   */
  private static detectBrokerType(headers: string[], lines: string[]): BrokerType {
    const headerStr = headers.join('|').toLowerCase();

    // TD Ameritrade detection (both formats)
    if (
      // Account statement format (has DESCRIPTION field)
      (headerStr.includes('date') && headerStr.includes('description') && headerStr.includes('amount')) ||
      // thinkorswim format (has EXEC TIME, SYMBOL columns)
      headerStr.includes('exec time') ||
      headerStr.includes('spread') ||
      (headerStr.includes('order') && headerStr.includes('price') && headerStr.includes('qty'))
    ) {
      return 'tdameritrade';
    }

    // Interactive Brokers detection
    if (
      headerStr.includes('datadisc') ||
      headerStr.includes('clientaccountid') ||
      (headerStr.includes('symbol') && headerStr.includes('proceeds'))
    ) {
      return 'interactivebrokers';
    }

    // Robinhood detection
    if (
      headerStr.includes('activity date') ||
      (headerStr.includes('trans code') && headerStr.includes('quantity')) ||
      headerStr.includes('robinhood')
    ) {
      return 'robinhood';
    }

    // WeBull detection
    if (
      headerStr.includes('order number') ||
      headerStr.includes('filled qty') ||
      (headerStr.includes('direction') && headerStr.includes('avg price'))
    ) {
      return 'webull';
    }

    // Default to generic
    return 'generic';
  }

  /**
   * Parse CSV line handling quotes and commas properly
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Parse TD Ameritrade CSV format
   * Format 1 (Account Statement): DATE, TIME, TYPE, REF #, DESCRIPTION, MISC FEES, COMMISSIONS, AMOUNT, BALANCE
   *   - DESCRIPTION contains: "BOT 100 AAPL @150.25" or "SLD 100 AAPL @152.75"
   * Format 2 (thinkorswim): EXEC TIME, SPREAD, SIDE, QTY, POS EFFECT, SYMBOL, EXP, STRIKE, TYPE, PRICE, NET PRICE, ORDER TYPE
   */
  private static parseTDAmeritrade(
    lines: string[],
    headers: string[],
    selectedDate?: Date
  ): CSVParseResult {
    const result: CSVParseResult = {
      success: false,
      trades: [],
      errors: [],
      warnings: [],
      detectedBroker: 'tdameritrade',
      tradesImported: 0,
    };

    try {
      // Determine which TD Ameritrade format
      const hasDescription = headers.some(h => h.toLowerCase().includes('description'));
      const hasSymbol = headers.some(h => h.toLowerCase().includes('symbol'));

      if (hasDescription) {
        // Format 1: Account Statement with DESCRIPTION field
        return this.parseTDAmeritradeAccountStatement(lines, headers, selectedDate);
      } else if (hasSymbol) {
        // Format 2: thinkorswim export with separate columns
        return this.parseTDAmeritradethinkorswim(lines, headers, selectedDate);
      } else {
        result.errors.push('Could not identify TD Ameritrade format - missing DESCRIPTION or SYMBOL column');
        return result;
      }
    } catch (error) {
      result.errors.push(`TD Ameritrade parsing error: ${error}`);
      return result;
    }
  }

  /**
   * Parse TD Ameritrade Account Statement format
   * DESCRIPTION field contains: "BOT 100 AAPL @150.25"
   */
  private static parseTDAmeritradeAccountStatement(
    lines: string[],
    headers: string[],
    selectedDate?: Date
  ): CSVParseResult {
    const result: CSVParseResult = {
      success: false,
      trades: [],
      errors: [],
      warnings: [],
      detectedBroker: 'tdameritrade',
      tradesImported: 0,
    };

    try {
      // Find column indices
      let dateCol = -1;
      let timeCol = -1;
      let descriptionCol = -1;

      headers.forEach((header, index) => {
        const h = header.toLowerCase().trim();
        if (h === 'date') dateCol = index;
        if (h === 'time') timeCol = index;
        if (h === 'description') descriptionCol = index;
      });

      if (dateCol === -1 || descriptionCol === -1) {
        result.errors.push('Missing required columns: DATE and DESCRIPTION');
        return result;
      }

      // Group trades by matching pairs (buy/sell)
      const tradeMap = new Map<string, any[]>();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = this.parseCSVLine(line);

        try {
          // Parse description field: "BOT 100 AAPL @150.25" or "SLD 100 AAPL @152.75"
          const description = cols[descriptionCol]?.trim();
          if (!description) {
            result.warnings.push(`Line ${i + 1}: Empty description, skipping`);
            continue;
          }

          // Extract: action (BOT/SLD), quantity, ticker, price
          // Pattern: ACTION QUANTITY TICKER @PRICE
          const match = description.match(/^(BOT|SLD|BUY|SELL)\s+(\d+)\s+([A-Z]+)\s+@?(\d+\.?\d*)/i);
          
          if (!match) {
            // Skip lines that don't match trade pattern (could be dividends, fees, etc.)
            continue;
          }

          const [, action, quantityStr, ticker, priceStr] = match;
          const quantity = parseInt(quantityStr);
          const price = parseFloat(priceStr);
          const direction = (action.toUpperCase() === 'BOT' || action.toUpperCase() === 'BUY') ? 'long' : 'short';

          // Parse timestamp
          const dateStr = cols[dateCol]?.trim();
          const timeStr = timeCol !== -1 ? cols[timeCol]?.trim() : '';
          const timestamp = this.parseDate(
            timeStr ? `${dateStr} ${timeStr}` : dateStr,
            selectedDate
          );

          if (!ticker || isNaN(quantity) || isNaN(price)) {
            result.warnings.push(`Line ${i + 1}: Invalid data in description, skipping`);
            continue;
          }

          // Create unique key for matching trades
          const key = `${ticker}_${quantity}`;
          if (!tradeMap.has(key)) {
            tradeMap.set(key, []);
          }

          tradeMap.get(key)!.push({
            ticker: ticker.toUpperCase(),
            direction,
            timestamp,
            quantity,
            price,
            lineNumber: i + 1,
          });
        } catch (error) {
          result.warnings.push(`Line ${i + 1}: Error parsing - ${error}`);
        }
      }

      // Match buy/sell pairs to create complete trades
      for (const [key, transactions] of tradeMap.entries()) {
        if (transactions.length < 2) {
          result.warnings.push(`Incomplete trade for ${key}: only one side found`);
          continue;
        }

        // Sort by timestamp
        transactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        // Match sequential buy/sell pairs
        for (let i = 0; i < transactions.length - 1; i += 2) {
          const first = transactions[i];
          const second = transactions[i + 1];

          // Determine entry and exit based on direction
          const isBuyFirst = first.direction === 'long';
          const entryPrice = isBuyFirst ? first.price : second.price;
          const exitPrice = isBuyFirst ? second.price : first.price;
          const tradeDirection = isBuyFirst ? 'long' : 'short';

          const realizedPL = tradeDirection === 'long'
            ? (exitPrice - entryPrice) * first.quantity
            : (entryPrice - exitPrice) * first.quantity;

          result.trades.push({
            id: generateTradeId(),
            ticker: first.ticker,
            direction: tradeDirection,
            quantity: first.quantity,
            entryPrice,
            exitPrice,
            timestamp: first.timestamp,
            realizedPL,
            notes: `Imported from TD Ameritrade`,
          });
        }
      }

      result.success = result.trades.length > 0;
      result.tradesImported = result.trades.length;

      if (result.trades.length === 0 && result.warnings.length === 0) {
        result.errors.push('No valid trades found in file');
      }

      return result;
    } catch (error) {
      result.errors.push(`TD Ameritrade Account Statement parsing error: ${error}`);
      return result;
    }
  }

  /**
   * Parse TD Ameritrade thinkorswim format
   * Has separate columns: SYMBOL, QTY, PRICE, SIDE, etc.
   */
  private static parseTDAmeritradethinkorswim(
    lines: string[],
    headers: string[],
    selectedDate?: Date
  ): CSVParseResult {
    const result: CSVParseResult = {
      success: false,
      trades: [],
      errors: [],
      warnings: [],
      detectedBroker: 'tdameritrade',
      tradesImported: 0,
    };

    try {
      // Find column indices
      const mapping = this.findTDAmeritradeColumns(headers);

      if (!mapping.timestamp || !mapping.ticker || !mapping.quantity || !mapping.entryPrice) {
        result.errors.push('Could not find required columns in thinkorswim format');
        return result;
      }

      // Group trades by matching pairs (buy/sell)
      const tradeMap = new Map<string, any[]>();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = this.parseCSVLine(line);

        try {
          const ticker = cols[mapping.ticker]?.trim().toUpperCase();
          const direction = this.parseTDDirection(cols[mapping.direction || 0]);
          const timestamp = this.parseDate(cols[mapping.timestamp], selectedDate);
          const quantity = Math.abs(parseFloat(cols[mapping.quantity]));
          const price = parseFloat(cols[mapping.entryPrice]);

          if (!ticker || !timestamp || isNaN(quantity) || isNaN(price)) {
            result.warnings.push(`Line ${i + 1}: Missing required data, skipping`);
            continue;
          }

          // Create unique key for matching trades
          const key = `${ticker}_${quantity}`;
          if (!tradeMap.has(key)) {
            tradeMap.set(key, []);
          }

          tradeMap.get(key)!.push({
            ticker,
            direction,
            timestamp,
            quantity,
            price,
            lineNumber: i + 1,
          });
        } catch (error) {
          result.warnings.push(`Line ${i + 1}: Error parsing - ${error}`);
        }
      }

      // Match buy/sell pairs to create complete trades
      for (const [key, transactions] of tradeMap.entries()) {
        if (transactions.length < 2) {
          result.warnings.push(`Incomplete trade for ${key}: only one side found`);
          continue;
        }

        // Sort by timestamp
        transactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        // Match pairs
        for (let i = 0; i < transactions.length - 1; i += 2) {
          const first = transactions[i];
          const second = transactions[i + 1];

          const isBuyFirst = first.direction === 'long';
          const entryPrice = isBuyFirst ? first.price : second.price;
          const exitPrice = isBuyFirst ? second.price : first.price;
          const tradeDirection = isBuyFirst ? 'long' : 'short';

          const realizedPL = tradeDirection === 'long'
            ? (exitPrice - entryPrice) * first.quantity
            : (entryPrice - exitPrice) * first.quantity;

          result.trades.push({
            id: generateTradeId(),
            ticker: first.ticker,
            direction: tradeDirection,
            quantity: first.quantity,
            entryPrice,
            exitPrice,
            timestamp: first.timestamp,
            realizedPL,
            notes: `Imported from TD Ameritrade`,
          });
        }
      }

      result.success = result.trades.length > 0;
      result.tradesImported = result.trades.length;

      if (result.trades.length === 0) {
        result.errors.push('No valid trades found in thinkorswim format');
      }

      return result;
    } catch (error) {
      result.errors.push(`TD Ameritrade thinkorswim parsing error: ${error}`);
      return result;
    }
  }

  /**
   * Find TD Ameritrade column mappings (for thinkorswim format)
   */
  private static findTDAmeritradeColumns(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};

    headers.forEach((header, index) => {
      const h = header.toLowerCase().trim();

      if (h.includes('exec time') || h.includes('date') || h.includes('time')) {
        mapping.timestamp = index;
      }
      if (h.includes('symbol') || h.includes('ticker')) {
        mapping.ticker = index;
      }
      if (h.includes('side') || h.includes('type')) {
        mapping.direction = index;
      }
      if (h.includes('qty') || h.includes('quantity')) {
        mapping.quantity = index;
      }
      if (h.includes('price') || h.includes('net price')) {
        mapping.entryPrice = index;
      }
    });

    return mapping;
  }

  /**
   * Parse TD Ameritrade direction
   */
  private static parseTDDirection(value: string): 'long' | 'short' {
    const v = value.toLowerCase();
    if (v.includes('buy') || v.includes('bot')) return 'long';
    if (v.includes('sell') || v.includes('sld')) return 'short';
    return 'long';
  }

  /**
   * Parse Interactive Brokers CSV format
   * Format: Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,C. Price,Proceeds,Comm/Fee,Basis,Realized P/L,MTM P/L,Code
   */
  private static parseInteractiveBrokers(
    lines: string[],
    headers: string[],
    selectedDate?: Date
  ): CSVParseResult {
    const result: CSVParseResult = {
      success: false,
      trades: [],
      errors: [],
      warnings: [],
      detectedBroker: 'interactivebrokers',
      tradesImported: 0,
    };

    try {
      const mapping = this.findIBColumns(headers);

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('Trades,Data,Order')) continue;

        const cols = this.parseCSVLine(line);

        // Skip header/summary rows
        if (cols[0]?.toLowerCase().includes('header') || cols[0]?.toLowerCase().includes('total')) {
          continue;
        }

        try {
          const ticker = cols[mapping.ticker || 0]?.trim().toUpperCase();
          const timestamp = this.parseDate(cols[mapping.timestamp || 0], selectedDate);
          const quantity = Math.abs(parseFloat(cols[mapping.quantity || 0]));
          const price = parseFloat(cols[mapping.entryPrice || 0]);
          const realizedPL = parseFloat(cols[mapping.realizedPL || 0]);

          if (!ticker || !timestamp || isNaN(quantity) || isNaN(price)) {
            result.warnings.push(`Line ${i + 1}: Missing required data, skipping`);
            continue;
          }

          // IB typically shows closed trades with realized P&L
          // Infer direction from P&L and price
          const direction: 'long' | 'short' = realizedPL >= 0 ? 'long' : 'short';
          
          // Calculate exit price from realized P&L
          const exitPrice = direction === 'long'
            ? price + (realizedPL / quantity)
            : price - (realizedPL / quantity);

          result.trades.push({
            id: generateTradeId(),
            ticker,
            direction,
            quantity,
            entryPrice: price,
            exitPrice,
            timestamp,
            realizedPL,
            notes: `Imported from Interactive Brokers`,
          });
        } catch (error) {
          result.warnings.push(`Line ${i + 1}: Error parsing - ${error}`);
        }
      }

      result.success = result.trades.length > 0;
      result.tradesImported = result.trades.length;

      if (result.trades.length === 0) {
        result.errors.push('No valid trades found in Interactive Brokers format');
      }

      return result;
    } catch (error) {
      result.errors.push(`Interactive Brokers parsing error: ${error}`);
      return result;
    }
  }

  /**
   * Find Interactive Brokers column mappings
   */
  private static findIBColumns(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};

    headers.forEach((header, index) => {
      const h = header.toLowerCase().trim();

      if (h.includes('date') || h.includes('time')) {
        mapping.timestamp = index;
      }
      if (h.includes('symbol')) {
        mapping.ticker = index;
      }
      if (h.includes('quantity') || h === 'qty') {
        mapping.quantity = index;
      }
      if (h.includes('t. price') || h.includes('price')) {
        mapping.entryPrice = index;
      }
      if (h.includes('realized p/l') || h.includes('realized p&l')) {
        mapping.realizedPL = index;
      }
    });

    return mapping;
  }

  /**
   * Parse Robinhood CSV format
   * Format: Activity Date,Process Date,Settle Date,Instrument,Description,Trans Code,Quantity,Price,Amount
   */
  private static parseRobinhood(
    lines: string[],
    headers: string[],
    selectedDate?: Date
  ): CSVParseResult {
    const result: CSVParseResult = {
      success: false,
      trades: [],
      errors: [],
      warnings: [],
      detectedBroker: 'robinhood',
      tradesImported: 0,
    };

    try {
      const mapping = this.findRobinhoodColumns(headers);

      // Group trades by ticker and quantity
      const tradeMap = new Map<string, any[]>();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = this.parseCSVLine(line);

        try {
          const ticker = cols[mapping.ticker || 0]?.trim().toUpperCase();
          const transCode = cols[mapping.direction || 0]?.trim().toUpperCase();
          const timestamp = this.parseDate(cols[mapping.timestamp || 0], selectedDate);
          const quantity = Math.abs(parseFloat(cols[mapping.quantity || 0]));
          const price = Math.abs(parseFloat(cols[mapping.entryPrice || 0]));

          // Skip non-trade transactions
          if (!transCode.includes('BUY') && !transCode.includes('SELL')) {
            continue;
          }

          if (!ticker || !timestamp || isNaN(quantity) || isNaN(price)) {
            result.warnings.push(`Line ${i + 1}: Missing required data, skipping`);
            continue;
          }

          const key = `${ticker}_${quantity}`;
          if (!tradeMap.has(key)) {
            tradeMap.set(key, []);
          }

          tradeMap.get(key)!.push({
            ticker,
            transCode,
            timestamp,
            quantity,
            price,
            lineNumber: i + 1,
          });
        } catch (error) {
          result.warnings.push(`Line ${i + 1}: Error parsing - ${error}`);
        }
      }

      // Match buy/sell pairs
      for (const [key, transactions] of tradeMap.entries()) {
        if (transactions.length < 2) {
          result.warnings.push(`Incomplete trade for ${key}: only one side found`);
          continue;
        }

        transactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        for (let i = 0; i < transactions.length - 1; i++) {
          const first = transactions[i];
          const second = transactions[i + 1];

          const isBuyFirst = first.transCode.includes('BUY');
          const entryPrice = isBuyFirst ? first.price : second.price;
          const exitPrice = isBuyFirst ? second.price : first.price;
          const direction = isBuyFirst ? 'long' : 'short';

          const realizedPL = direction === 'long'
            ? (exitPrice - entryPrice) * first.quantity
            : (entryPrice - exitPrice) * first.quantity;

          result.trades.push({
            id: generateTradeId(),
            ticker: first.ticker,
            direction,
            quantity: first.quantity,
            entryPrice,
            exitPrice,
            timestamp: first.timestamp,
            realizedPL,
            notes: `Imported from Robinhood`,
          });
        }
      }

      result.success = result.trades.length > 0;
      result.tradesImported = result.trades.length;

      if (result.trades.length === 0) {
        result.errors.push('No valid trades found in Robinhood format');
      }

      return result;
    } catch (error) {
      result.errors.push(`Robinhood parsing error: ${error}`);
      return result;
    }
  }

  /**
   * Find Robinhood column mappings
   */
  private static findRobinhoodColumns(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};

    headers.forEach((header, index) => {
      const h = header.toLowerCase().trim();

      if (h.includes('activity date') || h.includes('date')) {
        mapping.timestamp = index;
      }
      if (h.includes('instrument') || h.includes('symbol') || h.includes('ticker')) {
        mapping.ticker = index;
      }
      if (h.includes('trans code') || h.includes('type')) {
        mapping.direction = index;
      }
      if (h.includes('quantity') || h === 'qty') {
        mapping.quantity = index;
      }
      if (h.includes('price')) {
        mapping.entryPrice = index;
      }
      if (h.includes('amount')) {
        mapping.realizedPL = index;
      }
    });

    return mapping;
  }

  /**
   * Parse WeBull CSV format
   * Format: Order Number,Symbol,Direction,Filled Qty,Avg Price,Order Status,Order Time,Filled Time
   */
  private static parseWeBull(
    lines: string[],
    headers: string[],
    selectedDate?: Date
  ): CSVParseResult {
    const result: CSVParseResult = {
      success: false,
      trades: [],
      errors: [],
      warnings: [],
      detectedBroker: 'webull',
      tradesImported: 0,
    };

    try {
      const mapping = this.findWeBullColumns(headers);

      const tradeMap = new Map<string, any[]>();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = this.parseCSVLine(line);

        try {
          const ticker = cols[mapping.ticker || 0]?.trim().toUpperCase();
          const direction = cols[mapping.direction || 0]?.trim().toLowerCase();
          const timestamp = this.parseDate(cols[mapping.timestamp || 0], selectedDate);
          const quantity = Math.abs(parseFloat(cols[mapping.quantity || 0]));
          const price = parseFloat(cols[mapping.entryPrice || 0]);

          if (!ticker || !timestamp || isNaN(quantity) || isNaN(price)) {
            result.warnings.push(`Line ${i + 1}: Missing required data, skipping`);
            continue;
          }

          const key = `${ticker}_${quantity}`;
          if (!tradeMap.has(key)) {
            tradeMap.set(key, []);
          }

          tradeMap.get(key)!.push({
            ticker,
            direction,
            timestamp,
            quantity,
            price,
            lineNumber: i + 1,
          });
        } catch (error) {
          result.warnings.push(`Line ${i + 1}: Error parsing - ${error}`);
        }
      }

      // Match buy/sell pairs
      for (const [key, transactions] of tradeMap.entries()) {
        if (transactions.length < 2) {
          result.warnings.push(`Incomplete trade for ${key}: only one side found`);
          continue;
        }

        transactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        for (let i = 0; i < transactions.length - 1; i++) {
          const first = transactions[i];
          const second = transactions[i + 1];

          const isBuyFirst = first.direction.includes('buy');
          const entryPrice = isBuyFirst ? first.price : second.price;
          const exitPrice = isBuyFirst ? second.price : first.price;
          const tradeDirection = isBuyFirst ? 'long' : 'short';

          const realizedPL = tradeDirection === 'long'
            ? (exitPrice - entryPrice) * first.quantity
            : (entryPrice - exitPrice) * first.quantity;

          result.trades.push({
            id: generateTradeId(),
            ticker: first.ticker,
            direction: tradeDirection,
            quantity: first.quantity,
            entryPrice,
            exitPrice,
            timestamp: first.timestamp,
            realizedPL,
            notes: `Imported from WeBull`,
          });
        }
      }

      result.success = result.trades.length > 0;
      result.tradesImported = result.trades.length;

      if (result.trades.length === 0) {
        result.errors.push('No valid trades found in WeBull format');
      }

      return result;
    } catch (error) {
      result.errors.push(`WeBull parsing error: ${error}`);
      return result;
    }
  }

  /**
   * Find WeBull column mappings
   */
  private static findWeBullColumns(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};

    headers.forEach((header, index) => {
      const h = header.toLowerCase().trim();

      if (h.includes('filled time') || h.includes('order time') || h.includes('time')) {
        mapping.timestamp = index;
      }
      if (h.includes('symbol') || h.includes('ticker')) {
        mapping.ticker = index;
      }
      if (h.includes('direction') || h.includes('side')) {
        mapping.direction = index;
      }
      if (h.includes('filled qty') || h.includes('quantity')) {
        mapping.quantity = index;
      }
      if (h.includes('avg price') || h.includes('price')) {
        mapping.entryPrice = index;
      }
    });

    return mapping;
  }

  /**
   * Parse Generic CSV format (original logic from Calendar.tsx)
   * Smart column detection for flexible formats
   */
  private static parseGeneric(
    lines: string[],
    headers: string[],
    selectedDate?: Date
  ): CSVParseResult {
    const result: CSVParseResult = {
      success: false,
      trades: [],
      errors: [],
      warnings: [],
      detectedBroker: 'generic',
      tradesImported: 0,
    };

    try {
      const mapping = this.findGenericColumns(headers);

      if (!mapping.ticker || !mapping.quantity) {
        result.errors.push('Could not find required columns: Ticker and Quantity are required');
        return result;
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = this.parseCSVLine(line);

        try {
          const ticker = cols[mapping.ticker]?.trim().toUpperCase();
          const quantity = parseInt(cols[mapping.quantity || 0]);
          const timestamp = mapping.timestamp
            ? this.parseDate(cols[mapping.timestamp], selectedDate)
            : selectedDate || new Date();

          // Handle entry/exit prices
          let entryPrice: number;
          let exitPrice: number;

          if (mapping.entryPrice !== undefined && mapping.exitPrice !== undefined) {
            entryPrice = parseFloat(cols[mapping.entryPrice]);
            exitPrice = parseFloat(cols[mapping.exitPrice]);
          } else if (mapping.entryPrice !== undefined) {
            // If only one price column, we need both buy and sell rows
            entryPrice = parseFloat(cols[mapping.entryPrice]);
            exitPrice = entryPrice; // This would need matching logic
          } else {
            result.warnings.push(`Line ${i + 1}: Missing price data, skipping`);
            continue;
          }

          // Parse direction
          let direction: 'long' | 'short' = 'long';
          if (mapping.direction !== undefined) {
            direction = this.parseDirection(cols[mapping.direction]);
          }

          // Calculate or use provided P&L
          let realizedPL: number;
          if (mapping.realizedPL !== undefined) {
            realizedPL = parseFloat(cols[mapping.realizedPL]);
          } else {
            realizedPL = direction === 'long'
              ? (exitPrice - entryPrice) * quantity
              : (entryPrice - exitPrice) * quantity;
          }

          // Get notes if available
          const notes = mapping.notes !== undefined
            ? cols[mapping.notes]?.trim()
            : undefined;

          if (!ticker || isNaN(quantity) || isNaN(entryPrice) || isNaN(exitPrice)) {
            result.warnings.push(`Line ${i + 1}: Invalid data, skipping`);
            continue;
          }

          result.trades.push({
            id: generateTradeId(),
            ticker,
            direction,
            quantity,
            entryPrice,
            exitPrice,
            timestamp,
            realizedPL,
            notes,
          });
        } catch (error) {
          result.warnings.push(`Line ${i + 1}: Error parsing - ${error}`);
        }
      }

      result.success = result.trades.length > 0;
      result.tradesImported = result.trades.length;

      if (result.trades.length === 0) {
        result.errors.push('No valid trades found in file');
      }

      return result;
    } catch (error) {
      result.errors.push(`Generic parsing error: ${error}`);
      return result;
    }
  }

  /**
   * Find generic column mappings with smart detection
   */
  private static findGenericColumns(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};

    headers.forEach((header, index) => {
      const h = header.toLowerCase().trim();

      // Timestamp variations
      if (
        h.includes('time') ||
        h.includes('date') ||
        h === 'timestamp' ||
        h.includes('exec')
      ) {
        mapping.timestamp = index;
      }

      // Ticker variations
      if (
        h.includes('ticker') ||
        h.includes('symbol') ||
        h.includes('instrument') ||
        h === 'stock'
      ) {
        mapping.ticker = index;
      }

      // Direction variations
      if (
        h.includes('direction') ||
        h.includes('side') ||
        h.includes('type') ||
        h.includes('action') ||
        h === 'buy/sell'
      ) {
        mapping.direction = index;
      }

      // Quantity variations
      if (
        h.includes('quantity') ||
        h.includes('qty') ||
        h.includes('shares') ||
        h.includes('size')
      ) {
        mapping.quantity = index;
      }

      // Entry price variations
      if (
        h.includes('entry') ||
        h.includes('buy price') ||
        h.includes('open price') ||
        (h.includes('price') && !h.includes('exit'))
      ) {
        mapping.entryPrice = index;
      }

      // Exit price variations
      if (
        h.includes('exit') ||
        h.includes('sell price') ||
        h.includes('close price')
      ) {
        mapping.exitPrice = index;
      }

      // P&L variations
      if (
        h.includes('p&l') ||
        h.includes('p/l') ||
        h.includes('profit') ||
        h.includes('realized')
      ) {
        mapping.realizedPL = index;
      }

      // Notes variations
      if (
        h.includes('notes') ||
        h.includes('comment') ||
        h.includes('description')
      ) {
        mapping.notes = index;
      }
    });

    return mapping;
  }

  /**
   * Parse direction from various text formats
   */
  private static parseDirection(value: string): 'long' | 'short' {
    const v = value.toLowerCase().trim();

    if (v.includes('long') || v.includes('buy') || v === 'l' || v === 'b') {
      return 'long';
    }
    if (v.includes('short') || v.includes('sell') || v === 's') {
      return 'short';
    }

    return 'long'; // Default
  }

  /**
   * Parse date from various formats
   */
  private static parseDate(dateStr: string, fallbackDate?: Date): Date {
    if (!dateStr || dateStr.trim() === '') {
      return fallbackDate || new Date();
    }

    try {
      // Try ISO format first
      let parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }

      // Try common formats
      const formats = [
        /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
        /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{2})-(\d{2})-(\d{4})/,  // MM-DD-YYYY
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        }
      }

      // Fallback
      return fallbackDate || new Date();
    } catch {
      return fallbackDate || new Date();
    }
  }
}

export default BrokerCSVParser;