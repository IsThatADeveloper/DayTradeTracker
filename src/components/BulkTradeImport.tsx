import React, { useState } from 'react';
import { Upload, Copy, Plus, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Trade } from '../types/trade';
import { generateTradeId, formatCurrency } from '../utils/tradeUtils';

interface BulkTradeImportProps {
  onTradesAdded: (trades: Trade[]) => void;
  lastTrade?: Trade;
}

type ImportMethod = 'csv' | 'duplicate' | 'bulk-manual';

export const BulkTradeImport: React.FC<BulkTradeImportProps> = ({ onTradesAdded, lastTrade }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [importMethod, setImportMethod] = useState<ImportMethod>('duplicate');
  const [csvText, setCsvText] = useState('');
  const [duplicateCount, setDuplicateCount] = useState(5);
  const [bulkTrades, setBulkTrades] = useState<Partial<Trade>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize bulk trades with empty entries
  const initializeBulkTrades = (count: number) => {
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

  const handleCSVImport = () => {
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
          // Expected format: Ticker, Direction, Quantity, Entry Price, Exit Price, Time (optional), Notes (optional)
          const ticker = parts[0]?.trim().toUpperCase();
          const direction = parts[1]?.trim().toLowerCase() as 'long' | 'short';
          const quantity = parseInt(parts[2]?.trim());
          const entryPrice = parseFloat(parts[3]?.trim());
          const exitPrice = parseFloat(parts[4]?.trim());
          const timeStr = parts[5]?.trim();
          const notes = parts[6]?.trim() || '';

          if (!ticker || !['long', 'short'].includes(direction) || 
              isNaN(quantity) || isNaN(entryPrice) || isNaN(exitPrice)) {
            newErrors.push(`Line ${i + 1}: Invalid data format`);
            continue;
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

          trades.push({
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

  const handleDuplicateImport = () => {
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

  const handleBulkManualImport = () => {
    setIsProcessing(true);
    setErrors([]);
    
    const trades: Trade[] = [];
    const newErrors: string[] = [];
    
    bulkTrades.forEach((trade, index) => {
      if (!trade.ticker || !trade.entryPrice || !trade.exitPrice || !trade.quantity) {
        if (trade.ticker || trade.entryPrice || trade.exitPrice || trade.quantity) {
          newErrors.push(`Trade ${index + 1}: Missing required fields`);
        }
        return;
      }

      const realizedPL = trade.direction === 'long'
        ? ((trade.exitPrice as number) - (trade.entryPrice as number)) * (trade.quantity as number)
        : ((trade.entryPrice as number) - (trade.exitPrice as number)) * (trade.quantity as number);

      trades.push({
        id: generateTradeId(),
        ticker: trade.ticker.toUpperCase(),
        direction: trade.direction as 'long' | 'short',
        quantity: trade.quantity as number,
        entryPrice: trade.entryPrice as number,
        exitPrice: trade.exitPrice as number,
        timestamp: trade.timestamp as Date,
        realizedPL,
        notes: trade.notes || '',
      });
    });

    setErrors(newErrors);
    
    if (trades.length > 0) {
      onTradesAdded(trades);
      setBulkTrades([]);
      setIsOpen(false);
    }
    
    setIsProcessing(false);
  };

  const updateBulkTrade = (index: number, field: keyof Trade, value: any) => {
    setBulkTrades(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addBulkTradeRow = () => {
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

  const removeBulkTradeRow = (index: number) => {
    setBulkTrades(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-lg"
        >
          <Upload className="h-5 w-5 mr-2" />
          Bulk Import Trades
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Bulk Import Trades
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Import Method Selection */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setImportMethod('duplicate')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              importMethod === 'duplicate'
                ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300'
            } border`}
          >
            <Copy className="h-4 w-4 mr-1 inline" />
            Duplicate Last
          </button>
          
          <button
            onClick={() => {
              setImportMethod('bulk-manual');
              if (bulkTrades.length === 0) initializeBulkTrades(5);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              importMethod === 'bulk-manual'
                ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300'
            } border`}
          >
            <Plus className="h-4 w-4 mr-1 inline" />
            Bulk Entry
          </button>
          
          <button
            onClick={() => setImportMethod('csv')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              importMethod === 'csv'
                ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300'
            } border`}
          >
            <FileText className="h-4 w-4 mr-1 inline" />
            CSV Import
          </button>
        </div>
      </div>

      {/* Errors Display */}
      {errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center mb-2">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            <span className="text-sm font-medium text-red-800 dark:text-red-200">Errors found:</span>
          </div>
          <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Duplicate Last Trade */}
      {importMethod === 'duplicate' && (
        <div className="space-y-4">
          {lastTrade ? (
            <>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Last Trade:</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {lastTrade.ticker} - {lastTrade.direction.toUpperCase()} - {lastTrade.quantity} shares - {formatCurrency(lastTrade.realizedPL)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of copies:
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={duplicateCount}
                  onChange={(e) => setDuplicateCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                onClick={handleDuplicateImport}
                disabled={isProcessing}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? 'Creating...' : `Create ${duplicateCount} Copies`}
              </button>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No previous trade found to duplicate.</p>
          )}
        </div>
      )}

      {/* CSV Import */}
      {importMethod === 'csv' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CSV Data (Ticker, Direction, Quantity, Entry Price, Exit Price, Time, Notes):
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="AAPL,long,100,150.00,155.00,2024-01-15 10:30:00,Great trade
TSLA,short,50,200.00,195.00,2024-01-15 11:00:00,Quick scalp"
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Format: Ticker, Direction (long/short), Quantity, Entry Price, Exit Price, Time (optional), Notes (optional)
            </p>
          </div>
          
          <button
            onClick={handleCSVImport}
            disabled={isProcessing || !csvText.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Import CSV Data'}
          </button>
        </div>
      )}

      {/* Bulk Manual Entry */}
      {importMethod === 'bulk-manual' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Quick Entry ({bulkTrades.length} trades)
            </h4>
            <button
              onClick={addBulkTradeRow}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Plus className="h-4 w-4 mr-1 inline" />
              Add Row
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-2">Ticker</th>
                  <th className="text-left p-2">Dir</th>
                  <th className="text-left p-2">Qty</th>
                  <th className="text-left p-2">Entry</th>
                  <th className="text-left p-2">Exit</th>
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2"></th>
                </tr>
              </thead>
              <tbody>
                {bulkTrades.map((trade, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="p-2">
                      <input
                        type="text"
                        value={trade.ticker || ''}
                        onChange={(e) => updateBulkTrade(index, 'ticker', e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded"
                        placeholder="AAPL"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={trade.direction || 'long'}
                        onChange={(e) => updateBulkTrade(index, 'direction', e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded"
                      >
                        <option value="long">Long</option>
                        <option value="short">Short</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={trade.quantity || ''}
                        onChange={(e) => updateBulkTrade(index, 'quantity', parseInt(e.target.value) || undefined)}
                        className="w-full px-2 py-1 text-xs border rounded"
                        placeholder="100"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        value={trade.entryPrice || ''}
                        onChange={(e) => updateBulkTrade(index, 'entryPrice', parseFloat(e.target.value) || undefined)}
                        className="w-full px-2 py-1 text-xs border rounded"
                        placeholder="150.00"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        value={trade.exitPrice || ''}
                        onChange={(e) => updateBulkTrade(index, 'exitPrice', parseFloat(e.target.value) || undefined)}
                        className="w-full px-2 py-1 text-xs border rounded"
                        placeholder="155.00"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="datetime-local"
                        value={trade.timestamp ? new Date(trade.timestamp.getTime() - trade.timestamp.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                        onChange={(e) => updateBulkTrade(index, 'timestamp', new Date(e.target.value))}
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => removeBulkTradeRow(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button
            onClick={handleBulkManualImport}
            disabled={isProcessing || bulkTrades.length === 0}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? 'Adding Trades...' : `Add ${bulkTrades.filter(t => t.ticker && t.entryPrice && t.exitPrice && t.quantity).length} Trades`}
          </button>
        </div>
      )}
    </div>
  );
};