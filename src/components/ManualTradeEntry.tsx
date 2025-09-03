// src/components/ManualTradeEntry.tsx - Updated with selectedDate support
import React, { useState, useCallback, useMemo } from 'react';
import { Plus, X, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

// Types
import { Trade } from '../types/trade';
import { generateTradeId } from '../utils/tradeUtils';

interface ManualTradeEntryProps {
  onTradeAdded: (trade: Trade) => void;
  selectedDate?: Date; // New prop for the currently selected date in daily view
}

interface TradeFormData {
  ticker: string;
  entryPrice: string;
  exitPrice: string;
  quantity: string;
  direction: 'long' | 'short';
  timestamp: string;
  notes: string;
}

/**
 * Helper function to create initial timestamp based on selected date or current time
 */
const createInitialTimestamp = (selectedDate?: Date): string => {
  const baseDate = selectedDate || new Date();
  // If we have a selected date, use that date but with current time
  // If no selected date, use current date and time
  const now = new Date();
  const targetDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    now.getHours(),
    now.getMinutes()
  );
  return targetDate.toISOString().slice(0, 16);
};

/**
 * Manual trade entry form component for adding individual trades
 * Supports both long and short positions with real-time P&L calculation
 * Automatically uses the selected date from daily view when available
 */
export const ManualTradeEntry: React.FC<ManualTradeEntryProps> = ({ 
  onTradeAdded,
  selectedDate 
}) => {
  // Create initial form data with proper timestamp
  const createInitialFormData = useCallback((): TradeFormData => ({
    ticker: '',
    entryPrice: '',
    exitPrice: '',
    quantity: '',
    direction: 'long',
    timestamp: createInitialTimestamp(selectedDate),
    notes: '',
  }), [selectedDate]);

  // Component state
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<TradeFormData>(createInitialFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Update form field with validation
   * @param field - The field name to update
   * @param value - The new value
   */
  const handleInputChange = useCallback((field: keyof TradeFormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Reset form to initial state with proper timestamp
   */
  const resetForm = useCallback((): void => {
    setFormData(createInitialFormData());
  }, [createInitialFormData]);

  /**
   * Update form when selectedDate changes
   */
  React.useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        timestamp: createInitialTimestamp(selectedDate)
      }));
    }
  }, [selectedDate, isOpen]);

  /**
   * Validate form data before submission
   * @returns Validation result with error message if invalid
   */
  const validateForm = useCallback((): { isValid: boolean; error?: string } => {
    const { ticker, entryPrice, exitPrice, quantity } = formData;
    
    if (!ticker.trim()) {
      return { isValid: false, error: 'Ticker symbol is required' };
    }
    
    const entryPriceNum = parseFloat(entryPrice);
    if (isNaN(entryPriceNum) || entryPriceNum <= 0) {
      return { isValid: false, error: 'Entry price must be a valid positive number' };
    }
    
    const exitPriceNum = parseFloat(exitPrice);
    if (isNaN(exitPriceNum) || exitPriceNum <= 0) {
      return { isValid: false, error: 'Exit price must be a valid positive number' };
    }
    
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return { isValid: false, error: 'Quantity must be a valid positive number' };
    }
    
    if (entryPriceNum === exitPriceNum) {
      return { isValid: false, error: 'Entry and exit prices cannot be the same' };
    }
    
    return { isValid: true };
  }, [formData]);

  /**
   * Calculate real-time P&L preview
   */
  const calculatedPL = useMemo((): number => {
    const entryPriceNum = parseFloat(formData.entryPrice);
    const exitPriceNum = parseFloat(formData.exitPrice);
    const quantityNum = parseInt(formData.quantity);
    
    if (isNaN(entryPriceNum) || isNaN(exitPriceNum) || isNaN(quantityNum)) {
      return 0;
    }

    return formData.direction === 'long'
      ? (exitPriceNum - entryPriceNum) * quantityNum
      : (entryPriceNum - exitPriceNum) * quantityNum;
  }, [formData.entryPrice, formData.exitPrice, formData.quantity, formData.direction]);

  /**
   * Handle form submission with validation
   */
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    const validation = validateForm();
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const trade: Trade = {
        id: generateTradeId(),
        ticker: formData.ticker.toUpperCase().trim(),
        entryPrice: parseFloat(formData.entryPrice),
        exitPrice: parseFloat(formData.exitPrice),
        quantity: parseInt(formData.quantity),
        direction: formData.direction,
        timestamp: new Date(formData.timestamp),
        realizedPL: calculatedPL,
        notes: formData.notes.trim() || undefined,
      };

      await onTradeAdded(trade);
      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error('Error adding trade:', error);
      alert('Failed to add trade. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle opening the form
   */
  const handleOpen = useCallback((): void => {
    setFormData(createInitialFormData());
    setIsOpen(true);
  }, [createInitialFormData]);

  /**
   * Handle closing the form
   */
  const handleClose = useCallback((): void => {
    if (!isSubmitting) {
      setIsOpen(false);
      resetForm();
    }
  }, [isSubmitting, resetForm]);

  /**
   * Render direction selection buttons
   */
  const renderDirectionButtons = () => (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => handleInputChange('direction', 'long')}
        disabled={isSubmitting}
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
        disabled={isSubmitting}
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
  );

  /**
   * Render P&L preview when form has sufficient data
   */
  const renderPLPreview = () => {
    if (!formData.entryPrice || !formData.exitPrice || !formData.quantity) {
      return null;
    }

    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Trade Preview
        </h4>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Realized P&L:
          </span>
          <span className={`text-base sm:text-lg font-semibold ${
            calculatedPL >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(calculatedPL)}
          </span>
        </div>
        {selectedDate && (
          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            Trade date set to: {selectedDate.toLocaleDateString()}
          </div>
        )}
      </div>
    );
  };

  // Collapsed state - show entry button
  if (!isOpen) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4">
        <button
          onClick={handleOpen}
          className="w-full flex items-center justify-center px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-base sm:text-lg"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          Add New Trade
          {selectedDate && (
            <span className="ml-2 text-xs bg-blue-500 px-2 py-1 rounded">
              {selectedDate.toLocaleDateString()}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Expanded state - show entry form
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add New Trade
          </h3>
          {selectedDate && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Date: {selectedDate.toLocaleDateString()}
            </p>
          )}
        </div>
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              disabled={isSubmitting}
              required
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Direction *
            </label>
            {renderDirectionButtons()}
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
                min="0"
                value={formData.entryPrice}
                onChange={(e) => handleInputChange('entryPrice', e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                disabled={isSubmitting}
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
                min="0"
                value={formData.exitPrice}
                onChange={(e) => handleInputChange('exitPrice', e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                disabled={isSubmitting}
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
              min="1"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              placeholder="100"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        {/* Trade Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Trade Time *
          </label>
          <input
            type="datetime-local"
            value={formData.timestamp}
            onChange={(e) => handleInputChange('timestamp', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            disabled={isSubmitting}
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base"
            disabled={isSubmitting}
            maxLength={500}
          />
        </div>

        {/* P&L Preview */}
        {renderPLPreview()}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-full sm:flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-base disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding Trade...' : 'Add Trade'}
          </button>
        </div>
      </form>
    </div>
  );
};