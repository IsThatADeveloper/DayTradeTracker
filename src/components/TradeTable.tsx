import React, { useState, useMemo } from 'react';
import { Search, Filter, StickyNote, Download, Trash2, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';

interface TradeTableProps {
  trades: Trade[];
  onUpdateTrade: (tradeId: string, updates: Partial<Trade>) => void;
  onExportTrades: () => void;
  onDeleteTrade: (tradeId: string) => void;
}

export const TradeTable: React.FC<TradeTableProps> = ({ 
  trades, 
  onUpdateTrade, 
  onExportTrades,
  onDeleteTrade 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'wins' | 'losses'>('all');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      const matchesSearch = trade.ticker.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = 
        filterType === 'all' || 
        (filterType === 'wins' && trade.realizedPL > 0) ||
        (filterType === 'losses' && trade.realizedPL < 0);
      
      return matchesSearch && matchesFilter;
    });
  }, [trades, searchTerm, filterType]);

  const handleSaveNote = (tradeId: string) => {
    onUpdateTrade(tradeId, { notes: noteText });
    setEditingNote(null);
    setNoteText('');
  };

  const startEditingNote = (trade: Trade) => {
    setEditingNote(trade.id);
    setNoteText(trade.notes || '');
  };

  const handleDeleteClick = (tradeId: string, ticker: string) => {
    if (window.confirm(`Are you sure you want to delete the ${ticker} trade? This action cannot be undone.`)) {
      onDeleteTrade(tradeId);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Trade History ({filteredTrades.length})
            </h3>
            
            <button
              onClick={onExportTrades}
              className="sm:hidden flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ticker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            >
              <option value="all">All Trades</option>
              <option value="wins">Wins Only</option>
              <option value="losses">Losses Only</option>
            </select>
            
            <button
              onClick={onExportTrades}
              className="hidden sm:flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block sm:hidden">
        {filteredTrades.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-gray-500 dark:text-gray-400">
              {trades.length === 0 ? 'No trades recorded yet' : 'No trades match your filters'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTrades.map((trade) => (
              <div key={trade.id} className="p-4 space-y-3">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {trade.ticker}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        trade.direction === 'long' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                      }`}>
                        {trade.direction === 'long' ? (
                          <><TrendingUp className="h-3 w-3 inline mr-1" />LONG</>
                        ) : (
                          <><TrendingDown className="h-3 w-3 inline mr-1" />SHORT</>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-lg font-bold ${
                      trade.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(trade.realizedPL)}
                    </span>
                    <button
                      onClick={() => handleDeleteClick(trade.id, trade.ticker)}
                      className="text-red-400 hover:text-red-600 transition-colors p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Time</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {trade.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Quantity</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {trade.quantity.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Entry</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {formatCurrency(trade.entryPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block">Exit</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {formatCurrency(trade.exitPrice)}
                    </span>
                  </div>
                </div>

                {/* Notes Section */}
                <div>
                  {editingNote === trade.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Add a note..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNote(trade.id);
                          if (e.key === 'Escape') setEditingNote(null);
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveNote(trade.id)}
                        className="text-green-600 hover:text-green-700 px-2 py-1"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingNote(null)}
                        className="text-red-600 hover:text-red-700 px-2 py-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditingNote(trade)}
                      className="flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm w-full"
                    >
                      <StickyNote className="h-4 w-4 mr-2" />
                      {trade.notes || 'Add note...'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Ticker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Direction
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Entry
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Exit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                P&L
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTrades.map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {trade.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {trade.ticker}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    trade.direction === 'long' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}>
                    {trade.direction.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {trade.quantity.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatCurrency(trade.entryPrice)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatCurrency(trade.exitPrice)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`font-semibold ${
                    trade.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(trade.realizedPL)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {editingNote === trade.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        placeholder="Add a note..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNote(trade.id);
                          if (e.key === 'Escape') setEditingNote(null);
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveNote(trade.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingNote(null)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditingNote(trade)}
                      className="flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <StickyNote className="h-4 w-4 mr-1" />
                      {trade.notes || 'Add note'}
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <button
                    onClick={() => handleDeleteClick(trade.id, trade.ticker)}
                    className="text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete trade"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredTrades.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {trades.length === 0 ? 'No trades imported yet' : 'No trades match your filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};