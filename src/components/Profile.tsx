import React, { useState, useEffect } from 'react';
import { User, Calendar, Clock, Mail, Shield, TrendingUp, Target, DollarSign, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Trade } from '../types/trade';
import { formatCurrency } from '../utils/tradeUtils';
import { format, formatDistanceToNow, differenceInDays, differenceInMonths } from 'date-fns';

interface ProfileProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
}

export const Profile: React.FC<ProfileProps> = ({ isOpen, onClose, trades }) => {
  const { currentUser } = useAuth();
  const [accountAge, setAccountAge] = useState<string>('');
  const [accountAgeDays, setAccountAgeDays] = useState<number>(0);

  useEffect(() => {
    if (currentUser?.metadata?.creationTime) {
      const creationDate = new Date(currentUser.metadata.creationTime);
      const age = formatDistanceToNow(creationDate, { addSuffix: false });
      const days = differenceInDays(new Date(), creationDate);
      setAccountAge(age);
      setAccountAgeDays(days);
    }
  }, [currentUser]);

  if (!isOpen || !currentUser) return null;

  // Calculate trading statistics
  const totalTrades = trades.length;
  const totalPL = trades.reduce((sum, trade) => sum + trade.realizedPL, 0);
  const wins = trades.filter(trade => trade.realizedPL > 0);
  const losses = trades.filter(trade => trade.realizedPL < 0);
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((sum, trade) => sum + trade.realizedPL, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((sum, trade) => sum + trade.realizedPL, 0) / losses.length : 0;

  // Find first and last trade dates
  const sortedTrades = [...trades].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const firstTradeDate = sortedTrades.length > 0 ? sortedTrades[0].timestamp : null;
  const lastTradeDate = sortedTrades.length > 0 ? sortedTrades[sortedTrades.length - 1].timestamp : null;
  const tradingDays = firstTradeDate && lastTradeDate ? differenceInDays(lastTradeDate, firstTradeDate) + 1 : 0;

  // Calculate unique trading days
  const uniqueTradingDays = new Set(
    trades.map(trade => format(trade.timestamp, 'yyyy-MM-dd'))
  ).size;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <User className="h-6 w-6 mr-2 text-blue-600" />
              Profile
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-4 mb-4">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Profile"
                  className="w-16 h-16 rounded-full"
                  onError={(e) => {
                    // If image fails to load, hide it and show fallback
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-600 dark:text-gray-300" />
                </div>
              )}
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentUser.displayName || 'Trader'}
                </h3>
                <div className="flex items-center text-gray-600 dark:text-gray-400 mt-1">
                  <Mail className="h-4 w-4 mr-2" />
                  <span className="text-sm">{currentUser.email}</span>
                </div>
              </div>
            </div>

            {/* Account Age */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Account Created</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {currentUser.metadata?.creationTime 
                      ? format(new Date(currentUser.metadata.creationTime), 'MMM d, yyyy')
                      : 'Unknown'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Account Age</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {accountAge || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {accountAgeDays > 0 && `${accountAgeDays} days`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trading Statistics */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Trading Statistics
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">{totalTrades}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Trades</p>
              </div>

              <div className={`rounded-lg p-4 text-center ${
                totalPL >= 0 
                  ? 'bg-green-50 dark:bg-green-900/20' 
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className={`h-5 w-5 ${totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <p className={`text-2xl font-bold ${totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalPL)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total P&L</p>
              </div>

              <div className={`rounded-lg p-4 text-center ${
                winRate >= 50 
                  ? 'bg-green-50 dark:bg-green-900/20' 
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center justify-center mb-2">
                  <Target className={`h-5 w-5 ${winRate >= 50 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <p className={`text-2xl font-bold ${winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                  {winRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Win Rate</p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-600">{uniqueTradingDays}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Trading Days</p>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 dark:text-white mb-3">Performance Metrics</h5>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Wins</span>
                    <span className="text-sm font-medium text-green-600">{wins.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Losses</span>
                    <span className="text-sm font-medium text-red-600">{losses.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Avg Win</span>
                    <span className="text-sm font-medium text-green-600">{formatCurrency(avgWin)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Avg Loss</span>
                    <span className="text-sm font-medium text-red-600">{formatCurrency(Math.abs(avgLoss))}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 dark:text-white mb-3">Trading Timeline</h5>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">First Trade</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {firstTradeDate ? format(firstTradeDate, 'MMM d, yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Last Trade</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {lastTradeDate ? format(lastTradeDate, 'MMM d, yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Trading Span</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {tradingDays > 0 ? `${tradingDays} days` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Avg Trades/Day</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {uniqueTradingDays > 0 ? (totalTrades / uniqueTradingDays).toFixed(1) : '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Security */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <Shield className="h-4 w-4 mr-2 text-blue-600" />
              Account Security
            </h5>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Signed in with Google Authentication
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Email verified: {currentUser.emailVerified ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          {/* Close Button */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Close Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};