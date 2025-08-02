import React, { useState } from 'react';
import { Plus, X, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Trade } from '../types/trade';
import { generateTradeId } from '../utils/tradeUtils';

interface ManualTradeEntryProps {
  onTradeAdded: (trade: Trade) => void;
}

export const ManualTradeEntry: React.FC<ManualTradeEntryProps> = ({ onTradeAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    ticker: '',
    entryPrice: '',
    exitPrice: '',
    quantity: '',
    direction: 'long' as 'long' | 'short',
    timestamp: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM format
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const entryPrice = parseFloat(formData.entryPrice);
    const exitPrice = parseFloat(formData.exitPrice);
    const quantity = parseInt(formData.quantity);
    
    if (!formData.ticker || isNaN(entryPrice) || isNaN(exitPrice) || isNaN(quantity)) {
      alert('Please fill in all required fields with valid numbers');
      return;
    }

    // Calculate realized P&L
    let realizedPL: number;
    if (formData.direction === 'long') {
      realizedPL = (exitPrice - entryPrice) * quantity;
    } else {
      realizedPL = (entryPrice - exitPrice) * quantity;
    }

    const trade: Trade = {
      id: generateTradeId(),
      ticker: formData.ticker.toUpperCase(),
      entryPrice,
      exitPrice,
      quantity,
      direction: formData.direction,
      timestamp: new Date(formData.timestamp),
      realizedPL,
      notes: formData.notes,
    };

    onTradeAdded(trade);
    
    // Reset form
    setFormData({
      ticker: '',
      entryPrice: '',
      exitPrice: '',
      quantity: '',
      direction: 'long',
      timestamp: new Date().toISOString().slice(0, 16),
      notes: '',
    });
    
    setIsOpen(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add New Trade
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Add New Trade
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Direction *
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => handleInputChange('direction', 'long')}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md border transition-colors ${
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
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md border transition-colors ${
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Trade Time *
          </label>
          <input
            type="datetime-local"
            value={formData.timestamp}
            onChange={(e) => handleInputChange('timestamp', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

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
          />
        </div>

        {/* P&L Preview */}
        {formData.entryPrice && formData.exitPrice && formData.quantity && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trade Preview
            </h4>
            {(() => {
              const entryPrice = parseFloat(formData.entryPrice);
              const exitPrice = parseFloat(formData.exitPrice);
              const quantity = parseInt(formData.quantity);
              
              if (!isNaN(entryPrice) && !isNaN(exitPrice) && !isNaN(quantity)) {
                const realizedPL = formData.direction === 'long' 
                  ? (exitPrice - entryPrice) * quantity
                  : (entryPrice - exitPrice) * quantity;
                
                return (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Realized P&L:
                    </span>
                    <span className={`text-sm font-semibold ${
                      realizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(realizedPL)}
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Add Trade
          </button>
        </div>
      </form>
    </div>
  );
};