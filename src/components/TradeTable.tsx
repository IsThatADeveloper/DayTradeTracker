// src/components/TradeTable.tsx - Improved version with better organization and consistency
import React, { useState, useCallback } from 'react';
import { Edit2, Trash2, Download, TrendingUp, TrendingDown } from 'lucide-react';

// Types
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';
import { EditTradeModal } from './EditTradeModal';

interface TradeTableProps {
  trades: Trade[];
  onUpdateTrade: (tradeId: string, updates: Partial<Trade>) => Promise<void>;
  onDeleteTrade: (tradeId: string) => Promise<void>;
  onExportTrades: () => void;
}

// Table column configuration
const TABLE_COLUMNS = [
  { key: 'time', label: 'Time', align: 'left' as const },
  { key: 'ticker', label: 'Ticker', align: 'left' as const },
  { key: 'direction', label: 'Direction', align: 'left' as const },
  { key: 'quantity', label: 'Quantity', align: 'right' as const },
  { key: 'entry', label: 'Entry', align: 'right' as const },
  { key: 'exit', label: 'Exit', align: 'right' as const },
  { key: 'pl', label: 'P&L', align: 'right' as const },
  { key: 'notes', label: 'Notes', align: 'left' as const },
  { key: 'actions', label: 'Actions', align: 'center' as const },
];

/**
 * Comprehensive trade table component with editing and export capabilities
 * Supports both desktop table view and mobile card layout
 */
export const TradeTable: React.FC<TradeTableProps> = ({
  trades,
  onUpdateTrade,
  onDeleteTrade,
  onExportTrades,
}) => {
  // Component state
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [deletingTradeId, setDeletingTradeId] = useState<string | null>(null);

  /**
   * Handle opening trade for editing
   * @param trade - The trade to edit
   */
  const handleEdit = useCallback((trade: Trade): void => {
    setEditingTrade(trade);
  }, []);

  /**
   * Handle deleting a trade with confirmation
   * @param tradeId - The ID of the trade to delete
   */
  const handleDelete = useCallback(async (tradeId: string): Promise<void> => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this trade? This action cannot be undone.'
    );
    
    if (!confirmDelete) return;

    setDeletingTradeId(tradeId);
    try {
      await onDeleteTrade(tradeId);
    } catch (error) {
      console.error('Error deleting trade:', error);
      alert('Failed to delete trade. Please try again.');
    } finally {
      setDeletingTradeId(null);
    }
  }, [onDeleteTrade]);

  /**
   * Handle saving trade edits
   * @param tradeId - The ID of the trade to update
   * @param updates - The updates to apply
   */
  const handleSaveEdit = useCallback(async (tradeId: string, updates: Partial<Trade>): Promise<void> => {
    try {
      await onUpdateTrade(tradeId, updates);
      setEditingTrade(null);
    } catch (error) {
      console.error('Error updating trade:', error);
      // Error handling is done in the modal
    }
  }, [onUpdateTrade]);

  /**
   * Handle closing the edit modal
   */
  const handleCloseEdit = useCallback((): void => {
    setEditingTrade(null);
  }, []);

  /**
   * Format trade timestamp for display
   * @param timestamp - The trade timestamp
   * @returns Formatted time string
   */
  const formatTradeTime = (timestamp: Date | string): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Render direction badge with appropriate styling
   * @param direction - Trade direction
   * @returns JSX element for direction display
   */
  const renderDirectionBadge = (direction: 'long' | 'short') => {
    const isLong = direction === 'long';
    const Icon = isLong ? TrendingUp : TrendingDown;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isLong
          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      }`}>
        <Icon className="h-3 w-3 mr-1" />
        {direction.toUpperCase()}
      </span>
    );
  };

  /**
   * Render ticker badge
   * @param ticker - Stock ticker symbol
   * @returns JSX element for ticker display
   */
  const renderTickerBadge = (ticker: string) => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
      {ticker}
    </span>
  );

  /**
   * Render action buttons for a trade
   * @param trade - The trade object
   * @returns JSX element with edit and delete buttons
   */
  const renderActionButtons = (trade: Trade) => (
    <div className="flex items-center justify-center space-x-2">
      <button
        onClick={() => handleEdit(trade)}
        disabled={deletingTradeId === trade.id}
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
        title="Edit trade"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleDelete(trade.id)}
        disabled={deletingTradeId === trade.id}
        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
        title="Delete trade"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  /**
   * Render empty state when no trades exist
   */
  const renderEmptyState = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
      <div className="text-center">
        <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No trades for this day
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Add a trade using the form above to see it here.
        </p>
      </div>
    </div>
  );

  /**
   * Render mobile card view for a single trade
   * @param trade - The trade to render
   * @returns JSX element for mobile card
   */
  const renderMobileCard = (trade: Trade) => (
    <div key={trade.id} className="p-4 space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {renderTickerBadge(trade.ticker)}
          {renderDirectionBadge(trade.direction)}
        </div>
        {renderActionButtons(trade)}
      </div>

      {/* Trade Details Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Time:</span>
          <span className="ml-2 text-gray-900 dark:text-white">
            {formatTradeTime(trade.timestamp)}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Qty:</span>
          <span className="ml-2 text-gray-900 dark:text-white">
            {trade.quantity.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Entry:</span>
          <span className="ml-2 text-gray-900 dark:text-white">
            {formatCurrency(trade.entryPrice)}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Exit:</span>
          <span className="ml-2 text-gray-900 dark:text-white">
            {formatCurrency(trade.exitPrice)}
          </span>
        </div>
      </div>

      {/* P&L Display */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">Realized P&L:</span>
        <span className={`text-lg font-semibold ${
          trade.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {formatCurrency(trade.realizedPL)}
        </span>
      </div>

      {/* Notes (if present) */}
      {trade.notes && (
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Notes:</span>
          <p className="text-sm text-gray-900 dark:text-white mt-1 break-words">
            {trade.notes}
          </p>
        </div>
      )}
    </div>
  );

  /**
   * Render desktop table row for a single trade
   * @param trade - The trade to render
   * @returns JSX element for table row
   */
  const renderDesktopRow = (trade: Trade) => (
    <tr key={trade.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        {formatTradeTime(trade.timestamp)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {renderTickerBadge(trade.ticker)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {renderDirectionBadge(trade.direction)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
        {trade.quantity.toLocaleString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
        {formatCurrency(trade.entryPrice)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
        {formatCurrency(trade.exitPrice)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
        <span className={trade.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'}>
          {formatCurrency(trade.realizedPL)}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
        {trade.notes || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        {renderActionButtons(trade)}
      </td>
    </tr>
  );

  /**
   * Render table header
   */
  const renderTableHeader = () => (
    <thead className="bg-gray-50 dark:bg-gray-700">
      <tr>
        {TABLE_COLUMNS.map((column) => (
          <th
            key={column.key}
            className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
              column.align === 'left' ? 'text-left' :
              column.align === 'right' ? 'text-right' : 'text-center'
            }`}
          >
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
  );

  // Early return for empty state
  if (trades.length === 0) {
    return renderEmptyState();
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {/* Table Header with Export */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Daily Trades ({trades.length})
            </h3>
            <button
              onClick={onExportTrades}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              title="Export trades as CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            {renderTableHeader()}
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {trades.map(renderDesktopRow)}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {trades.map(renderMobileCard)}
        </div>
      </div>

      {/* Edit Trade Modal */}
      <EditTradeModal
        isOpen={editingTrade !== null}
        trade={editingTrade}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
      />
    </>
  );
};