import React, { useState, useEffect } from 'react';
import { X, DollarSign, TrendingUp, TrendingDown, Calendar, FileText } from 'lucide-react';
import { Trade } from '../types/trade';

interface EditTradeModalProps {
  isOpen: boolean;
  trade: Trade | null;
  onClose: () => void;
  onSave: (tradeId: string, updates: Partial<Trade>) => Promise<void>;
}

export const EditTradeModal: React.FC<EditTradeModalProps> = ({
  isOpen,
  trade,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    ticker: '',
    entryPrice: '',
    exitPrice: '',
    quantity: '',
    direction: 'long' as 'long' | 'short',
    timestamp: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to convert Date to local datetime-local string
  const dateToLocalISOString = (date: Date): string => {
    // Get timezone offset in minutes and convert to milliseconds
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    // Create new date adjusted for timezone
    const localDate = new Date(date.getTime() - timezoneOffset);
    // Return ISO string without 'Z' and seconds
    return localDate.toISOString().slice(0, 16);
  };

  // Helper function to convert datetime-local string to Date (preserving local time)
  const localISOStringToDate = (isoString: string): Date => {
    // datetime-local input gives us a string like "2024-01-25T14:30"
    // We want to treat this as local time, not UTC
    return new Date(isoString);
  };

  // Update form data when trade changes
  useEffect(() => {
    if (trade) {
      console.log('🔧 EditModal: Loading trade data:', {
        id: trade.id,
        ticker: trade.ticker,
        originalTimestamp: trade.timestamp,
        updateCount: trade.updateCount
      });

      setFormData({
        ticker: trade.ticker,
        entryPrice: trade.entryPrice.toString(),
        exitPrice: trade.exitPrice.toString(),
        quantity: trade.quantity.toString(),
        direction: trade.direction,
        // CRITICAL FIX: Properly handle timezone conversion for datetime-local input
        timestamp: dateToLocalISOString(trade.timestamp instanceof Date ? trade.timestamp : new Date(trade.timestamp)),
        notes: trade.notes || '',
      });
      setError(null);
    }
  }, [trade]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Calculate current P&L based on form data
  const currentPL = React.useMemo(() => {
    const entryPrice = parseFloat(formData.entryPrice);
    const exitPrice = parseFloat(formData.exitPrice);
    const quantity = parseInt(formData.quantity);
    
    if (!isNaN(entryPrice) && !isNaN(exitPrice) && !isNaN(quantity)) {
      return formData.direction === 'long' 
        ? (exitPrice - entryPrice) * quantity
        : (entryPrice - exitPrice) * quantity;
    }
    return 0;
  }, [formData.entryPrice, formData.exitPrice, formData.quantity, formData.direction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trade) {
      console.error('❌ No trade object provided to edit');
      return;
    }
    
    console.log('📝 EditModal: Starting trade update for trade ID:', trade.id);
    console.log('📝 EditModal: Current form data:', formData);
    console.log('📝 EditModal: Original timestamp:', trade.timestamp);
    console.log('📝 EditModal: New timestamp string:', formData.timestamp);
    
    setIsLoading(true);
    setError(null);
    
    try {
      const entryPrice = parseFloat(formData.entryPrice);
      const exitPrice = parseFloat(formData.exitPrice);
      const quantity = parseInt(formData.quantity);
      
      // Validation
      if (!formData.ticker.trim()) {
        throw new Error('Ticker symbol is required');
      }
      
      if (isNaN(entryPrice) || entryPrice <= 0) {
        throw new Error('Entry price must be a valid positive number');
      }
      
      if (isNaN(exitPrice) || exitPrice <= 0) {
        throw new Error('Exit price must be a valid positive number');
      }
      
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error('Quantity must be a valid positive number');
      }

      // CRITICAL FIX: Properly convert datetime-local string to Date object
      const newTimestamp = localISOStringToDate(formData.timestamp);
      
      console.log('📝 EditModal: Timestamp conversion:', {
        input: formData.timestamp,
        output: newTimestamp,
        outputISO: newTimestamp.toISOString(),
        outputLocal: newTimestamp.toLocaleString()
      });

      // Calculate new realized P&L
      const realizedPL = formData.direction === 'long' 
        ? (exitPrice - entryPrice) * quantity
        : (entryPrice - exitPrice) * quantity;

      // Create updates object with explicit field handling
      const updates: Partial<Trade> = {
        ticker: formData.ticker.toUpperCase().trim(),
        entryPrice,
        exitPrice,
        quantity,
        direction: formData.direction,
        timestamp: newTimestamp, // This should preserve the local date/time
        realizedPL,
      };

      // Handle notes separately to be explicit
      const trimmedNotes = formData.notes.trim();
      if (trimmedNotes) {
        updates.notes = trimmedNotes;
      } else {
        updates.notes = null; // Explicitly set to null for clearing
      }

      console.log('📝 EditModal: Final updates object:');
      console.log('  - ticker:', updates.ticker);
      console.log('  - entryPrice:', updates.entryPrice);
      console.log('  - exitPrice:', updates.exitPrice);
      console.log('  - quantity:', updates.quantity);
      console.log('  - direction:', updates.direction);
      console.log('  - realizedPL:', updates.realizedPL);
      console.log('  - notes:', updates.notes);
      console.log('  - timestamp:', updates.timestamp);
      console.log('  - timestamp ISO:', updates.timestamp?.toISOString());
      console.log('📝 EditModal: Calling onSave with trade ID:', trade.id);
      
      await onSave(trade.id, updates);
      console.log('✅ EditModal: Trade update completed successfully');
      onClose();
    } catch (err) {
      console.error('❌ EditModal: Error during trade update:', err);
      setError(err instanceof Error ? err.message : 'Failed to update trade');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setError(null);
    }
  };

  if (!isOpen || !trade) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Edit Trade
              </h3>
              {trade.updateCount !== undefined && trade.updateCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This trade has been edited {trade.updateCount} time{trade.updateCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ticker and Direction Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ticker Symbol *
                </label>
                <input
                  type="text"
                  value={formData.ticker}
                  onChange={(e) => handleInputChange('ticker', e.target.value)}
                  placeholder="e.g., AAPL"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Direction *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleInputChange('direction', 'long')}
                    disabled={isLoading}
                    className={`flex items-center justify-center px-3 py-2 rounded-md border transition-colors text-sm font-medium disabled:opacity-50 ${
                      formData.direction === 'long'
                        ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-400 dark:text-green-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Long
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('direction', 'short')}
                    disabled={isLoading}
                    className={`flex items-center justify-center px-3 py-2 rounded-md border transition-colors text-sm font-medium disabled:opacity-50 ${
                      formData.direction === 'short'
                        ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/20 dark:border-red-400 dark:text-red-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <TrendingDown className="h-4 w-4 mr-1" />
                    Short
                  </button>
                </div>
              </div>
            </div>

            {/* Price and Quantity Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Entry Price *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.entryPrice}
                    onChange={(e) => handleInputChange('entryPrice', e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Exit Price *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.exitPrice}
                    onChange={(e) => handleInputChange('exitPrice', e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  placeholder="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Trade Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Trade Time *
              </label>
              <input
                type="datetime-local"
                value={formData.timestamp}
                onChange={(e) => handleInputChange('timestamp', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                required
              />
              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-gray-500 mt-1">
                  Debug: {formData.timestamp} → {formData.timestamp ? localISOStringToDate(formData.timestamp).toLocaleString() : 'Invalid'}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Add any notes about this trade..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isLoading}
              />
            </div>

            {/* P&L Preview */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Updated P&L
                  </h4>
                  <span className={`text-lg font-bold ${
                    currentPL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(currentPL)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Original P&L</p>
                  <span className={`text-sm font-medium ${
                    trade.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(trade.realizedPL)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};