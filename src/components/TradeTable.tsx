// src/components/TradeTable.tsx - UPDATED: Added Delete All Trades button with custom modal
import React, { useState, useCallback } from 'react';
import { Edit2, Trash2, Download, TrendingUp, TrendingDown, AlertTriangle, X } from 'lucide-react';

// Types
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';
import { EditTradeModal } from './EditTradeModal';

/**
 * Delete All Trades Confirmation Modal Component
 */
interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  tradeCount: number;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  tradeCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-red-600 p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-white mr-2" />
              <h3 className="text-lg font-bold text-white">Delete All Trades</h3>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete all {tradeCount} trade{tradeCount !== 1 ? 's' : ''}?
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              This will permanently delete all trades for this day.
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium text-center">
              ⚠️ This action cannot be undone
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              💡 <span className="font-medium">Tip:</span> Consider exporting to CSV before deleting if you need a backup.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              Delete All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Single Trade Delete Modal Component
 */
interface SingleTradeDeleteModalProps {
  isOpen: boolean;
  trade: Trade | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const SingleTradeDeleteModal: React.FC<SingleTradeDeleteModalProps> = ({
  isOpen,
  trade,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-red-600 p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Trash2 className="h-5 w-5 text-white mr-2" />
              <h3 className="text-lg font-bold text-white">Delete Trade</h3>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-900 dark:text-white mb-4">
            Are you sure you want to delete this trade?
          </p>
          
          {/* Trade Details */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Ticker:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{trade.ticker}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Direction:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white capitalize">{trade.direction}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Quantity:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{trade.quantity}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">P&L:</span>
                <span className={`ml-2 font-semibold ${trade.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(trade.realizedPL)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ This action cannot be undone.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              Delete Trade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
 * UPDATED: Shows OPEN badge for positions without exits + Delete All Trades
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
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);

  /**
   * Handle opening trade for editing
   * @param trade - The trade to edit
   */
  const handleEdit = useCallback((trade: Trade): void => {
    setEditingTrade(trade);
  }, []);

  /**
   * Handle deleting a trade - show confirmation modal
   * @param trade - The trade to delete
   */
  const handleDelete = useCallback((trade: Trade): void => {
    setTradeToDelete(trade);
  }, []);

  /**
   * Handle confirming single trade deletion
   */
  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!tradeToDelete) return;

    setDeletingTradeId(tradeToDelete.id);
    setTradeToDelete(null);
    
    try {
      await onDeleteTrade(tradeToDelete.id);
    } catch (error) {
      console.error('Error deleting trade:', error);
      alert('Failed to delete trade. Please try again.');
    } finally {
      setDeletingTradeId(null);
    }
  }, [tradeToDelete, onDeleteTrade]);

  /**
   * Handle canceling single trade deletion
   */
  const handleCancelDelete = useCallback((): void => {
    setTradeToDelete(null);
  }, []);

  /**
   * Handle initiating the delete all process
   */
  const handleDeleteAll = useCallback((): void => {
    if (trades.length === 0) return;
    setShowDeleteAllModal(true);
  }, [trades.length]);

  /**
   * Handle confirming delete all - actually delete all trades
   */
  const handleConfirmDeleteAll = useCallback(async (): Promise<void> => {
    setShowDeleteAllModal(false);
    setIsDeletingAll(true);

    try {
      console.log(`🗑️ Starting bulk delete of ${trades.length} trades...`);
      
      // Delete all trades sequentially
      for (const trade of trades) {
        try {
          await onDeleteTrade(trade.id);
          console.log(`✅ Deleted trade: ${trade.ticker}`);
        } catch (error) {
          console.error(`❌ Failed to delete trade ${trade.id}:`, error);
        }
      }

      console.log(`🎯 Bulk delete complete`);
    } catch (error) {
      console.error('❌ Error during bulk delete:', error);
    } finally {
      setIsDeletingAll(false);
    }
  }, [trades, onDeleteTrade]);

  /**
   * Handle canceling the delete all process
   */
  const handleCancelDeleteAll = useCallback((): void => {
    setShowDeleteAllModal(false);
  }, []);

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
   * UPDATED: Render P&L or OPEN badge
   * @param trade - The trade object
   * @returns JSX element for P&L display
   */
  const renderPLDisplay = (trade: Trade) => {
    // Check if position is open
    if (trade.status === 'open') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          OPEN
        </span>
      );
    }

    // Closed position - show P&L
    return (
      <span className={trade.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'}>
        {formatCurrency(trade.realizedPL)}
      </span>
    );
  };

  /**
   * Render action buttons for a trade
   * @param trade - The trade object
   * @returns JSX element with edit and delete buttons
   */
  const renderActionButtons = (trade: Trade) => (
    <div className="flex items-center justify-center space-x-2">
      <button
        onClick={() => handleEdit(trade)}
        disabled={deletingTradeId === trade.id || isDeletingAll}
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
        title="Edit trade"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleDelete(trade)}
        disabled={deletingTradeId === trade.id || isDeletingAll}
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
   * UPDATED: Render mobile card view for a single trade
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

      {/* UPDATED: P&L Display with OPEN badge support */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {trade.status === 'open' ? 'Status:' : 'Realized P&L:'}
        </span>
        {trade.status === 'open' ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            OPEN
          </span>
        ) : (
          <span className={`text-lg font-semibold ${
            trade.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(trade.realizedPL)}
          </span>
        )}
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
   * UPDATED: Render desktop table row for a single trade
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
        {renderPLDisplay(trade)}
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
        {/* Table Header with Export and Delete All */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Daily Trades ({trades.length})
            </h3>
            <div className="flex items-center space-x-2">
              {/* Export CSV Button */}
              <button
                onClick={onExportTrades}
                disabled={isDeletingAll}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                title="Export trades as CSV"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </button>

              {/* Delete All Trades Button */}
              <button
                onClick={handleDeleteAll}
                disabled={isDeletingAll || trades.length === 0}
                className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete all trades for this day"
              >
                {isDeletingAll ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-red-600 border-t-transparent rounded-full" />
                    <span className="hidden sm:inline">Deleting...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Delete All</span>
                    <span className="sm:hidden">Delete</span>
                  </>
                )}
              </button>
            </div>
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

      {/* Single Trade Delete Confirmation Modal */}
      <SingleTradeDeleteModal
        isOpen={tradeToDelete !== null}
        trade={tradeToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* Delete All Trades Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteAllModal}
        onConfirm={handleConfirmDeleteAll}
        onCancel={handleCancelDeleteAll}
        tradeCount={trades.length}
      />
    </>
  );
};