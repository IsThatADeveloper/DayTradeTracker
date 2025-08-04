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

  // Update form data when trade changes
  useEffect(() => {
    if (trade) {
      setFormData({
        ticker: trade.ticker,
        entryPrice: trade.entryPrice.toString(),
        exitPrice: trade.exitPrice.toString(),
        quantity: trade.quantity.toString(),
        direction: trade.direction,
        timestamp: trade.timestamp instanceof Date 
          ? trade.timestamp.toISOString().slice(0, 16)
          : new Date(trade.timestamp).toISOString().slice(0, 16),
        notes: trade.notes || '',
      });
      setError(null);
    }
  }, [trade]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trade) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const entryPrice = parseFloat(formData.entryPrice);
      const exitPrice = parseFloat(formData.exitPrice);
      const quantity = parseInt(formData.quantity);
      
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

      // Calculate new realized P&L
      let realizedPL: number;
      if (formData.direction === 'long') {
        realizedPL = (exitPrice - entryPrice) * quantity;
      } else {
        realizedPL = (entryPrice - exitPrice) * quantity;
      }

      const updates: Partial<Trade> = {
        ticker: formData.ticker.toUpperCase().trim(),
        entryPrice,
        exitPrice,
        quantity,
        direction: formData.direction,
        timestamp: new Date(formData.timestamp),
        realizedPL,
        notes: formData.notes.trim() || undefined,
      };

      await onSave(trade.id, updates);
      onClose();
    } catch (err) {
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

  // Calculate current P&L for preview
  const currentPL = (() => {
    const entryPrice = parseFloat(formData.entryPrice);
    const exitPrice = parseFloat(formData.exitPrice);
    const quantity = parseInt(formData.quantity);
    
    if (!isNaN(entryPrice) && !isNaN(exitPrice) && !isNaN(quantity)) {
      return formData.direction === 'long' 
        ? (exitPrice - entryPrice) * quantity
        : (entryPrice - exitPrice) * quantity;
    }
    return 0;
  })();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Edit Trade
            </h3>
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