// src/components/BulkTradeImport.tsx - Improved version with better organization
import React, { useState } from 'react';
import { 
  Upload, 
  Copy, 
  Plus, 
  X, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Trash2, 
  Clock 
} from 'lucide-react';

// Types
import { Trade } from '../types/trade';
import { generateTradeId, formatCurrency } from '../utils/tradeUtils';

interface BulkTradeImportProps {
  onTradesAdded: (trades: Trade[]) => void;
  lastTrade?: Trade;
}

type ImportMethod = 'csv' | 'duplicate' | 'bulk-manual';

// Constants
const DEFAULT_DUPLICATE_COUNT = 5;
const MAX_DUPLICATE_COUNT = 50;
const DEFAULT_BULK_TRADE_COUNT = 3;

/**
 * Bulk trade import component supporting CSV, duplication, and manual entry methods
 */
export const BulkTradeImport: React.FC<BulkTradeImportProps> = ({ 
  onTradesAdded, 
  lastTrade 
}) => {
  // Component state
  const [isOpen, setIsOpen] = useState(false);
  const [importMethod, setImportMethod] = useState<ImportMethod>('duplicate');
  const [csvText, setCsvText] = useState('');
  const [duplicateCount, setDuplicateCount] = useState(DEFAULT_DUPLICATE_COUNT);
  const [bulkTrades, setBulkTrades] = useState<Partial<Trade>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Initialize bulk trades with empty entries based on last trade
   */
  const initializeBulkTrades = (count: number): void => {
    const trades: Partial<Trade>[] = [];
    for (let i = 0; i < count; i++) {
      trades.push({
        ticker: lastTrade?.ticker || '',
        direction: lastTrade?.direction || 'long',
        entryPrice: undefined,
        exitPrice: undefined,
        quantity: lastTrade?.quantity || undefined,
        timestamp: new Date(),
        notes: '',
      });
    }
    setBulkTrades(trades);
  };

  /**
   * Parse and validate CSV data
   */
  const handleCSVImport = (): void => {
    setIsProcessing(true);
    setErrors([]);
    
    try {
      const lines = csvText.trim().split('\n');
      const trades: Trade[] = [];
      const newErrors: string[] = [];

      // Skip header if it exists
      const startIndex = lines[0]?.toLowerCase().includes('ticker') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Support both comma and tab separation
        const parts = line.includes('\t') ? line.split('\t') : line.split(',');
        
        if (parts.length < 6) {
          newErrors.push(`Line ${i + 1}: Not enough columns (expected at least 6)`);
          continue;
        }

        try {
          const parsedTrade = parseCSVLine(parts, i + 1);
          if (parsedTrade.error) {
            newErrors.push(parsedTrade.error);
            continue;
          }
          
          if (parsedTrade.trade) {
            trades.push(parsedTrade.trade);
          }
        } catch (error) {
          newErrors.push(`Line ${i + 1}: Error processing data`);
        }
      }

      setErrors(newErrors);
      
      if (trades.length > 0) {
        onTradesAdded(trades);
        setCsvText('');
        setIsOpen(false);
      }
    } catch (error) {
      setErrors(['Failed to process CSV data']);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Parse a single CSV line into a Trade object
   */
  const parseCSVLine = (parts: string[], lineNumber: number): { trade?: Trade; error?: string } => {
    try {
      // Expected format: Ticker, Direction, Quantity, Entry Price, Exit Price, Time (optional), Notes (optional)
      const ticker = parts[0]?.trim().toUpperCase();
      const direction = parts[1]?.trim().toLowerCase() as 'long' | 'short';
      const quantity = parseInt(parts[2]?.trim());
      const entryPrice = parseFloat(parts[3]?.trim());
      const exitPrice = parseFloat(parts[4]?.trim());
      const timeStr = parts[5]?.trim();
      const notes = parts[6]?.trim() || '';

      // Validation
      if (!ticker || !['long', 'short'].includes(direction) || 
          isNaN(quantity) || isNaN(entryPrice) || isNaN(exitPrice)) {
        return { error: `Line ${lineNumber}: Invalid data format` };
      }

      // Parse timestamp
      let timestamp = new Date();
      if (timeStr) {
        const parsed = new Date(timeStr);
        if (!isNaN(parsed.getTime())) {
          timestamp = parsed;
        }
      }

      // Calculate P&L
      const realizedPL = direction === 'long' 
        ? (exitPrice - entryPrice) * quantity
        : (entryPrice - exitPrice) * quantity;

      return {
        trade: {
          id: generateTradeId(),
          ticker,
          direction,
          quantity,
          entryPrice,
          exitPrice,
          timestamp,
          realizedPL,
          notes,
        }
      };
    } catch (error) {
      return { error: `Line ${lineNumber}: Error processing data` };
    }
  };

  /**
   * Create duplicates of the last trade
   */
  const handleDuplicateImport = (): void => {
    if (!lastTrade) return;
    
    setIsProcessing(true);
    const trades: Trade[] = [];
    
    for (let i = 0; i < duplicateCount; i++) {
      trades.push({
        ...lastTrade,
        id: generateTradeId(),
        timestamp: new Date(Date.now() + i * 1000), // Spread timestamps by 1 second
        notes: `${lastTrade.notes || ''} (Copy ${i + 1})`.trim(),
      });
    }
    
    onTradesAdded(trades);
    setIsProcessing(false);
    setIsOpen(false);
  };

  /**
   * Process manually entered bulk trades
   */
  const handleBulkManualImport = (): void => {
    setIsProcessing(true);
    setErrors([]);
    
    const trades: Trade[] = [];
    const newErrors: string[] = [];
    
    bulkTrades.forEach((trade, index) => {
      const validationResult = validateBulkTrade(trade, index + 1);
      
      if (validationResult.error) {
        if (hasAnyData(trade)) {
          newErrors.push(validationResult.error);
        }
        return;
      }
      
      if (validationResult.trade) {
        trades.push(validationResult.trade);
      }
    });

    setErrors(newErrors);
    
    if (trades.length > 0) {
      onTradesAdded(trades);
      setBulkTrades([]);
      setIsOpen(false);
    }
    
    setIsProcessing(false);
  };

  /**
   * Validate a bulk trade entry
   */
  const validateBulkTrade = (trade: Partial<Trade>, index: number): { trade?: Trade; error?: string } => {
    if (!trade.ticker || !trade.entryPrice || !trade.exitPrice || !trade.quantity) {
      return { error: `Trade ${index}: Missing required fields` };
    }

    const realizedPL = trade.direction === 'long'
      ? ((trade.exitPrice as number) - (trade.entryPrice as number)) * (trade.quantity as number)
      : ((trade.entryPrice as number) - (trade.exitPrice as number)) * (trade.quantity as number);

    return {
      trade: {
        id: generateTradeId(),
        ticker: trade.ticker.toUpperCase(),
        direction: trade.direction as 'long' | 'short',
        quantity: trade.quantity as number,
        entryPrice: trade.entryPrice as number,
        exitPrice: trade.exitPrice as number,
        timestamp: trade.timestamp as Date,
        realizedPL,
        notes: trade.notes || '',
      }
    };
  };

  /**
   * Check if a trade has any filled data
   */
  const hasAnyData = (trade: Partial<Trade>): boolean => {
    return !!(trade.ticker || trade.entryPrice || trade.exitPrice || trade.quantity);
  };

  /**
   * Update a field in a bulk trade entry
   */
  const updateBulkTrade = (index: number, field: keyof Trade, value: any): void => {
    setBulkTrades(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  /**
   * Add a new row to bulk trade entry
   */
  const addBulkTradeRow = (): void => {
    setBulkTrades(prev => [...prev, {
      ticker: lastTrade?.ticker || '',
      direction: lastTrade?.direction || 'long',
      entryPrice: undefined,
      exitPrice: undefined,
      quantity: lastTrade?.quantity || undefined,
      timestamp: new Date(),
      notes: '',
    }]);
  };

  /**
   * Remove a row from bulk trade entry
   */
  const removeBulkTradeRow = (index: number): void => {
    setBulkTrades(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Calculate P&L for preview
   */
  const calculatePL = (trade: Partial<Trade>): number => {
    if (!trade.entryPrice || !trade.exitPrice || !trade.quantity) return 0;
    return trade.direction === 'long'
      ? ((trade.exitPrice as number) - (trade.entryPrice as number)) * (trade.quantity as number)
      : ((trade.entryPrice as number) - (trade.exitPrice as number)) * (trade.quantity as number);
  };

  /**
   * Render import method button
   */
  const renderMethodButton = (
    method: ImportMethod,
    icon: React.ElementType,
    label: string,
    minWidth: string = 'min-w-[120px]'
  ) => {
    const Icon = icon;
    const isActive = importMethod === method;
    
    return (
      <button
        onClick={() => {
          setImportMethod(method);
          if (method === 'bulk-manual' && bulkTrades.length === 0) {
            initializeBulkTrades(DEFAULT_BULK_TRADE_COUNT);
          }
        }}
        className={`flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all transform hover:scale-105 ${minWidth} ${
          isActive
            ? 'bg-blue-100 text-blue-700 border-2 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600 shadow-md'
            : 'bg-gray-50 text-gray-700 border-2 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
        }`}
      >
        <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
        <span>{label}</span>
      </button>
    );
  };

  /**
   * Render error messages
   */
  const renderErrors = () => {
    if (errors.length === 0) return null;
    
    return (
      <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl">
        <div className="flex items-center mb-2">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-sm font-semibold text-red-800 dark:text-red-200">Errors found:</span>
        </div>
        <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
          {errors.map((error, index) => (
            <li key={index} className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              {error}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  /**
   * Render last trade preview
   */
  const renderLastTradePreview = () => {
    if (!lastTrade) return null;
    
    return (
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-600">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          Last Trade Preview:
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400 block">Symbol</span>
            <span className="font-semibold text-gray-900 dark:text-white">{lastTrade.ticker}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400 block">Direction</span>
            <span className={`font-semibold ${lastTrade.direction === 'long' ? 'text-green-600' : 'text-red-600'}`}>
              {lastTrade.direction.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400 block">Quantity</span>
            <span className="font-semibold text-gray-900 dark:text-white">{lastTrade.quantity}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400 block">P&L</span>
            <span className={`font-semibold ${lastTrade.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(lastTrade.realizedPL)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render bulk trade entry form
   */
  const renderBulkTradeEntry = (trade: Partial<Trade>, index: number) => {
    return (
      <div 
        key={index} 
        className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-600 shadow-sm"
      >
        {/* Trade Header */}
        <div className="flex items-center justify-between mb-4">
          <h5 className="font-semibold text-gray-900 dark:text-white">Trade #{index + 1}</h5>
          <button
            onClick={() => removeBulkTradeRow(index)}
            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        
        {/* Trade Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Ticker */}
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              TICKER
            </label>
            <input
              type="text"
              value={trade.ticker || ''}
              onChange={(e) => updateBulkTrade(index, 'ticker', e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
              placeholder="AAPL"
            />
          </div>
          
          {/* Direction */}
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              DIRECTION
            </label>
            <select
              value={trade.direction || 'long'}
              onChange={(e) => updateBulkTrade(index, 'direction', e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
          
          {/* Quantity */}
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              QUANTITY
            </label>
            <input
              type="number"
              value={trade.quantity || ''}
              onChange={(e) => updateBulkTrade(index, 'quantity', parseInt(e.target.value) || undefined)}
              className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
              placeholder="100"
            />
          </div>
          
          {/* Entry Price */}
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              ENTRY PRICE
            </label>
            <input
              type="number"
              step="0.01"
              value={trade.entryPrice || ''}
              onChange={(e) => updateBulkTrade(index, 'entryPrice', parseFloat(e.target.value) || undefined)}
              className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
              placeholder="150.00"
            />
          </div>
          
          {/* Exit Price */}
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              EXIT PRICE
            </label>
            <input
              type="number"
              step="0.01"
              value={trade.exitPrice || ''}
              onChange={(e) => updateBulkTrade(index, 'exitPrice', parseFloat(e.target.value) || undefined)}
              className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
              placeholder="155.00"
            />
          </div>
          
          {/* Trade Time */}
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              TRADE TIME
            </label>
            <input
              type="datetime-local"
              value={trade.timestamp ? new Date(trade.timestamp.getTime() - trade.timestamp.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
              onChange={(e) => updateBulkTrade(index, 'timestamp', new Date(e.target.value))}
              className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-sm"
            />
          </div>
        </div>
        
        {/* P&L Preview */}
        {trade.entryPrice && trade.exitPrice && trade.quantity && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Estimated P&L:
              </span>
              <span className={`text-lg font-bold ${
                calculatePL(trade) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(calculatePL(trade))}
              </span>
            </div>
          </div>
        )}
        
        {/* Notes */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
            NOTES (Optional)
          </label>
          <input
            type="text"
            value={trade.notes || ''}
            onChange={(e) => updateBulkTrade(index, 'notes', e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add trade notes..."
          />
        </div>
      </div>
    );
  };

  // Collapsed state
  if (!isOpen) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-[1.02] font-medium text-lg shadow-md hover:shadow-lg"
        >
          <Upload className="h-5 w-5 mr-2" />
          Bulk Import Trades
        </button>
      </div>
    );
  }

  // Expanded state
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Bulk Import Trades
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Import Method Selection */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
          {renderMethodButton('duplicate', Copy, 'Duplicate Last', 'min-w-[130px]')}
          {renderMethodButton('bulk-manual', Plus, 'Quick Entry')}
          {renderMethodButton('csv', FileText, 'CSV Import')}
        </div>
      </div>

      {/* Error Display */}
      {renderErrors()}

      {/* Content based on import method */}
      {importMethod === 'duplicate' && (
        <div className="space-y-6">
          {lastTrade ? (
            <>
              {renderLastTradePreview()}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Number of copies:
                </label>
                <input
                  type="number"
                  min="1"
                  max={MAX_DUPLICATE_COUNT}
                  value={duplicateCount}
                  onChange={(e) => setDuplicateCount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
                />
              </div>
              
              <button
                onClick={handleDuplicateImport}
                disabled={isProcessing}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all transform hover:scale-[1.02] font-semibold text-lg shadow-md hover:shadow-lg"
              >
                {isProcessing ? 'Creating...' : `Create ${duplicateCount} Copies`}
              </button>
            </>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">No previous trade found to duplicate.</p>
            </div>
          )}
        </div>
      )}

      {/* CSV Import */}
      {importMethod === 'csv' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              CSV Data (Ticker, Direction, Quantity, Entry Price, Exit Price, Time, Notes):
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`AAPL,long,100,150.00,155.00,2024-01-15 10:30:00,Great trade\nTSLA,short,50,200.00,195.00,2024-01-15 11:00:00,Quick scalp`}
              rows={8}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <strong>Format:</strong> Ticker, Direction (long/short), Quantity, Entry Price, Exit Price, Time (optional), Notes (optional)
            </p>
          </div>
          
          <button
            onClick={handleCSVImport}
            disabled={isProcessing || !csvText.trim()}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all transform hover:scale-[1.02] font-semibold text-lg shadow-md hover:shadow-lg"
          >
            {isProcessing ? 'Processing...' : 'Import CSV Data'}
          </button>
        </div>
      )}

      {/* Bulk Manual Entry */}
      {importMethod === 'bulk-manual' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
              Quick Entry ({bulkTrades.length} trades)
            </h4>
            <button
              onClick={addBulkTradeRow}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 font-medium shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </button>
          </div>
          
          {/* Scrollable trades container */}
          <div className="relative">
            <div className="h-[500px] overflow-y-auto overscroll-contain border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50">
              <div className="p-4 space-y-4">
                {bulkTrades.map((trade, index) => renderBulkTradeEntry(trade, index))}
              </div>
            </div>
          </div>
          
          {/* Summary and Submit */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-semibold">
                  {bulkTrades.filter(t => t.ticker && t.entryPrice && t.exitPrice && t.quantity).length} trades ready to add
                </span>
                {bulkTrades.filter(t => t.ticker && t.entryPrice && t.exitPrice && t.quantity).length > 0 && (
                  <div className="mt-1">
                    Total P&L: <span className={`font-bold ${
                      bulkTrades.reduce((sum, t) => sum + calculatePL(t), 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(bulkTrades.reduce((sum, t) => sum + calculatePL(t), 0))}
                    </span>
                  </div>
                )}
              </div>
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            
            <button
              onClick={handleBulkManualImport}
              disabled={isProcessing || bulkTrades.filter(t => t.ticker && t.entryPrice && t.exitPrice && t.quantity).length === 0}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all transform hover:scale-[1.02] font-semibold text-lg shadow-md hover:shadow-lg"
            >
              {isProcessing ? 'Adding Trades...' : `Add ${bulkTrades.filter(t => t.ticker && t.entryPrice && t.exitPrice && t.quantity).length} Trades`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};