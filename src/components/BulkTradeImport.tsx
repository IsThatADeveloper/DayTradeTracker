// src/components/BulkTradeImportV2.tsx - Enhanced with Broker Support
import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Copy, 
  Plus, 
  X, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Trash2, 
  Clock,
  Building2,
  ChevronDown,
  Info
} from 'lucide-react';

// Types
import { Trade } from '../types/trade';
import { generateTradeId, formatCurrency } from '../utils/tradeUtils';
import { BrokerCSVParser, BrokerType } from '../services/brokerCSVParser';

interface BulkTradeImportProps {
  onTradesAdded: (trades: Trade[]) => void;
  lastTrade?: Trade;
  selectedDate?: Date;
}

type ImportMethod = 'csv' | 'duplicate' | 'bulk-manual';

// Constants
const DEFAULT_DUPLICATE_COUNT = 5;
const MAX_DUPLICATE_COUNT = 50;
const DEFAULT_BULK_TRADE_COUNT = 3;

// Broker options for dropdown
const BROKER_OPTIONS = [
  { value: 'auto' as BrokerType, label: 'Auto-Detect', icon: '🤖', description: 'Automatically detect broker format' },
  { value: 'tdameritrade' as BrokerType, label: 'TD Ameritrade', icon: '🏦', description: 'TD Ameritrade CSV format' },
  { value: 'interactivebrokers' as BrokerType, label: 'Interactive Brokers', icon: '📊', description: 'IB Flex Query or trade report' },
  { value: 'robinhood' as BrokerType, label: 'Robinhood', icon: '🎯', description: 'Robinhood account statement' },
  { value: 'webull' as BrokerType, label: 'WeBull', icon: '📱', description: 'WeBull trade history' },
  { value: 'generic' as BrokerType, label: 'Generic/Custom', icon: '📄', description: 'Standard format with flexible columns' },
];

/**
 * Helper function to create timestamp based on selected date or current time
 */
const createTimestamp = (selectedDate?: Date, offsetSeconds: number = 0): Date => {
  const baseDate = selectedDate || new Date();
  const now = new Date();
  
  const targetDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds() + offsetSeconds
  );
  
  return targetDate;
};

/**
 * Enhanced bulk trade import component with broker support
 */
export const BulkTradeImport: React.FC<BulkTradeImportProps> = ({ 
  onTradesAdded, 
  lastTrade,
  selectedDate 
}) => {
  // Component state
  const [isOpen, setIsOpen] = useState(false);
  const [importMethod, setImportMethod] = useState<ImportMethod>('csv');
  const [csvText, setCsvText] = useState('');
  const [selectedBroker, setSelectedBroker] = useState<BrokerType>('auto');
  const [showBrokerDropdown, setShowBrokerDropdown] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(DEFAULT_DUPLICATE_COUNT);
  const [bulkTrades, setBulkTrades] = useState<Partial<Trade>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedBroker, setDetectedBroker] = useState<BrokerType | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const brokerDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brokerDropdownRef.current && !brokerDropdownRef.current.contains(event.target as Node)) {
        setShowBrokerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handle CSV import using new broker parser
   */
  const handleCSVImport = async (): Promise<void> => {
    setIsProcessing(true);
    setErrors([]);
    setWarnings([]);
    setDetectedBroker(null);
    
    try {
      const result = await BrokerCSVParser.parseCSV(csvText, selectedBroker, selectedDate);
      
      setErrors(result.errors);
      setWarnings(result.warnings);
      
      if (result.detectedBroker) {
        setDetectedBroker(result.detectedBroker);
      }
      
      if (result.success && result.trades.length > 0) {
        onTradesAdded(result.trades);
        setImportedCount(result.tradesImported);
        setShowSuccessMessage(true);
        setCsvText('');
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
          setIsOpen(false);
        }, 3000);
      }
    } catch (error) {
      setErrors(['Failed to process CSV data: ' + (error instanceof Error ? error.message : 'Unknown error')]);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle file upload
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  /**
   * Initialize bulk trades with empty entries
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
        timestamp: createTimestamp(selectedDate, i),
        notes: '',
      });
    }
    setBulkTrades(trades);
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
        timestamp: createTimestamp(selectedDate, i),
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
   * Validate bulk trade
   */
  const validateBulkTrade = (trade: Partial<Trade>, index: number): { trade?: Trade; error?: string } => {
    if (!trade.ticker || !trade.entryPrice || !trade.exitPrice || !trade.quantity) {
      return { error: `Trade ${index}: Missing required fields` };
    }

    if (trade.entryPrice <= 0) {
      return { error: `Trade ${index}: Entry price must be positive` };
    }

    if (trade.exitPrice <= 0) {
      return { error: `Trade ${index}: Exit price must be positive` };
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
      timestamp: createTimestamp(selectedDate, prev.length),
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
   * Calculate P&L
   */
  const calculatePL = (trade: Partial<Trade>): number => {
    if (!trade.entryPrice || !trade.exitPrice || !trade.quantity) return 0;
    return trade.direction === 'long'
      ? ((trade.exitPrice as number) - (trade.entryPrice as number)) * (trade.quantity as number)
      : ((trade.entryPrice as number) - (trade.exitPrice as number)) * (trade.quantity as number);
  };

  /**
   * Render broker selector dropdown
   */
  const renderBrokerSelector = () => {
    const selectedOption = BROKER_OPTIONS.find(opt => opt.value === selectedBroker);

    return (
      <div className="mb-4" ref={brokerDropdownRef}>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
          <Building2 className="h-4 w-4 mr-2" />
          Select Broker Format:
        </label>
        
        <div className="relative">
          <button
            onClick={() => setShowBrokerDropdown(!showBrokerDropdown)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-left flex items-center justify-between hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">{selectedOption?.icon}</span>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {selectedOption?.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedOption?.description}
                </div>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showBrokerDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showBrokerDropdown && (
            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-96 overflow-y-auto">
              {BROKER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedBroker(option.value);
                    setShowBrokerDropdown(false);
                    setDetectedBroker(null);
                  }}
                  className={`w-full px-4 py-3 text-left flex items-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border-b border-gray-100 dark:border-gray-600 last:border-b-0 ${
                    selectedBroker === option.value ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <span className="text-2xl mr-3">{option.icon}</span>
                  <div className="flex-1">
                    <div className={`font-semibold ${
                      selectedBroker === option.value 
                        ? 'text-blue-700 dark:text-blue-300' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.description}
                    </div>
                  </div>
                  {selectedBroker === option.value && (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {detectedBroker && detectedBroker !== selectedBroker && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start">
              <Info className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Auto-detected:</strong> {BROKER_OPTIONS.find(opt => opt.value === detectedBroker)?.label}
              </div>
            </div>
          </div>
        )}
      </div>
    );
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
          setErrors([]);
          setWarnings([]);
          setDetectedBroker(null);
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
   * Render messages (errors/warnings)
   */
  const renderMessages = () => {
    if (errors.length === 0 && warnings.length === 0 && !showSuccessMessage) return null;
    
    return (
      <div className="mb-6 space-y-3">
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm font-semibold text-green-800 dark:text-green-200">
                Successfully imported {importedCount} trade{importedCount !== 1 ? 's' : ''}!
              </span>
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-sm font-semibold text-red-800 dark:text-red-200">
                Errors found ({errors.length}):
              </span>
            </div>
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 max-h-40 overflow-y-auto">
              {errors.map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
              <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                Warnings ({warnings.length}):
              </span>
            </div>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 max-h-40 overflow-y-auto">
              {warnings.slice(0, 10).map((warning, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-yellow-500 mr-2">•</span>
                  {warning}
                </li>
              ))}
              {warnings.length > 10 && (
                <li className="text-yellow-600 dark:text-yellow-400 italic">
                  ... and {warnings.length - 10} more warnings
                </li>
              )}
            </ul>
          </div>
        )}
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
        {selectedDate && (
          <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">
            Trades will be dated: {selectedDate.toLocaleDateString()}
          </div>
        )}
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
        <div className="flex items-center justify-between mb-4">
          <h5 className="font-semibold text-gray-900 dark:text-white">Trade #{index + 1}</h5>
          <button
            onClick={() => removeBulkTradeRow(index)}
            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
          
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              ENTRY PRICE
            </label>
            <input
              type="number"
              step="0.000001"
              value={trade.entryPrice || ''}
              onChange={(e) => updateBulkTrade(index, 'entryPrice', parseFloat(e.target.value) || undefined)}
              className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
              placeholder="150.000000"
            />
          </div>
          
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              EXIT PRICE
            </label>
            <input
              type="number"
              step="0.000001"
              value={trade.exitPrice || ''}
              onChange={(e) => updateBulkTrade(index, 'exitPrice', parseFloat(e.target.value) || undefined)}
              className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
              placeholder="155.000000"
            />
          </div>
          
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
            {calculatePL(trade) === 0 && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Break-even trade
              </div>
            )}
          </div>
        )}
        
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
          {selectedDate && (
            <span className="ml-2 text-xs bg-green-500 px-2 py-1 rounded">
              {selectedDate.toLocaleDateString()}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Expanded state
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Bulk Import Trades
          </h3>
          {selectedDate && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Date: {selectedDate.toLocaleDateString()}
            </p>
          )}
        </div>
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
          {renderMethodButton('csv', FileText, 'CSV Import')}
          {renderMethodButton('duplicate', Copy, 'Duplicate Last', 'min-w-[130px]')}
          {renderMethodButton('bulk-manual', Plus, 'Quick Entry')}
        </div>
      </div>

      {/* Messages Display */}
      {renderMessages()}

      {/* Content based on import method */}
      {importMethod === 'csv' && (
        <div className="space-y-6">
          {/* Broker Selector */}
          {renderBrokerSelector()}

          {/* File Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex items-center justify-center font-medium text-gray-700 dark:text-gray-300"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload CSV File
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                or paste CSV data
              </span>
            </div>
          </div>

          {/* CSV Text Area */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              CSV Data:
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste your CSV data here..."
              rows={8}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <strong>Auto-Detect Mode:</strong> The system will automatically detect your broker's format.
              <br />
              Supports: TD Ameritrade, Interactive Brokers, Robinhood, WeBull, and generic CSV formats.
            </p>
          </div>
          
          <button
            onClick={handleCSVImport}
            disabled={isProcessing || !csvText.trim()}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all transform hover:scale-[1.02] font-semibold text-lg shadow-md hover:shadow-lg disabled:transform-none"
          >
            {isProcessing ? 'Processing...' : 'Import CSV Data'}
          </button>
        </div>
      )}

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
          
          <div className="relative">
            <div className="h-[500px] overflow-y-auto overscroll-contain border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50">
              <div className="p-4 space-y-4">
                {bulkTrades.map((trade, index) => renderBulkTradeEntry(trade, index))}
              </div>
            </div>
          </div>
          
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
                    {bulkTrades.reduce((sum, t) => sum + calculatePL(t), 0) === 0 && (
                      <span className="text-xs ml-2 text-gray-600 dark:text-gray-400">(Break Even)</span>
                    )}
                  </div>
                )}
                {selectedDate && (
                  <div className="mt-1 text-xs">
                    All trades will be dated: {selectedDate.toLocaleDateString()}
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