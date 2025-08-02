import React, { useState, useMemo } from 'react';
import { Search, Filter, StickyNote, Download, Trash2 } from 'lucide-react';
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
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Trade History ({filteredTrades.length})
          </h3>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ticker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Trades</option>
              <option value="wins">Wins Only</option>
              <option value="losses">Losses Only</option>
            </select>
            
            <button
              onClick={onExportTrades}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
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