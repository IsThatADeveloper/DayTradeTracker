// src/components/SyncModal.tsx
import React, { useState } from 'react';
import { Cloud, Upload, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { Trade } from '../types/trade';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  localTrades: Trade[];
  cloudTrades: Trade[];
  onSyncToCloud: () => Promise<void>;
  onSyncFromCloud: () => Promise<void>;
  onMergeData: () => Promise<void>;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  localTrades,
  cloudTrades,
  onSyncToCloud,
  onSyncFromCloud,
  onMergeData,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleSync = async (syncFunction: () => Promise<void>, action: string) => {
    setIsLoading(true);
    setSyncStatus('idle');
    
    try {
      await syncFunction();
      setSyncStatus('success');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error(`Error ${action}:`, error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const hasLocalData = localTrades.length > 0;
  const hasCloudData = cloudTrades.length > 0;
  const hasBothData = hasLocalData && hasCloudData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Cloud className="h-5 w-5 mr-2 text-blue-600" />
              Sync Your Data
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={isLoading}
            >
              ✕
            </button>
          </div>

          {syncStatus === 'success' && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 dark:text-green-200">Sync completed successfully!</span>
            </div>
          )}

          {syncStatus === 'error' && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800 dark:text-red-200">Sync failed. Please try again.</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Local Trades</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{localTrades.length}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Cloud Trades</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{cloudTrades.length}</p>
              </div>
            </div>

            {hasBothData && (
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Data found in both locations
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Choose how to handle your data carefully to avoid losing trades.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {hasLocalData && (
                <button
                  onClick={() => handleSync(onSyncToCloud, 'uploading to cloud')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {hasBothData ? 'Replace Cloud Data' : 'Upload to Cloud'}
                </button>
              )}

              {hasCloudData && (
                <button
                  onClick={() => handleSync(onSyncFromCloud, 'downloading from cloud')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {hasBothData ? 'Replace Local Data' : 'Download from Cloud'}
                </button>
              )}

              {hasBothData && (
                <button
                  onClick={() => handleSync(onMergeData, 'merging data')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  Merge Both (Recommended)
                </button>
              )}
            </div>

            {!hasLocalData && !hasCloudData && (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400">
                  No trades found. Start trading to see sync options!
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};