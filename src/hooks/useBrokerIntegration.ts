// src/hooks/useBrokerIntegration.ts
import { useState, useEffect, useCallback } from 'react';
import { BrokerConnection, BrokerStatus, ImportedTrade } from '../types/broker';
import { brokerService } from '../services/brokerService';
import { useAuth } from '../contexts/AuthContext';
import { Trade } from '../types/trade';
import { generateTradeId } from '../utils/tradeUtils';

export const useBrokerIntegration = () => {
  const { currentUser } = useAuth();
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [brokerStatuses, setBrokerStatuses] = useState<Map<string, BrokerStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load broker connections
  const loadConnections = useCallback(async () => {
    if (!currentUser) {
      setConnections([]);
      setBrokerStatuses(new Map());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userConnections = await brokerService.getBrokerConnections(currentUser.uid);
      setConnections(userConnections);

      // Initialize broker statuses
      const statusMap = new Map<string, BrokerStatus>();
      userConnections.forEach(connection => {
        statusMap.set(connection.id, {
          connectionId: connection.id,
          brokerType: connection.brokerType,
          isConnected: connection.isActive,
          lastSync: connection.lastSync,
          totalTrades: 0,
          isLoading: false
        });
      });
      setBrokerStatuses(statusMap);

      // Load trade counts for each connection
      await loadTradeCounts(userConnections);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to load broker connections:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Load trade counts for connections
  const loadTradeCounts = async (connections: BrokerConnection[]) => {
    if (!currentUser) return;

    try {
      const allTrades = await brokerService.getBrokerTrades(currentUser.uid);
      const tradeCountsByConnection = new Map<string, number>();

      // Count trades by connection
      allTrades.forEach(trade => {
        const connectionId = trade.brokerTradeId.split('_')[0]; // Extract connection ID
        tradeCountsByConnection.set(
          connectionId,
          (tradeCountsByConnection.get(connectionId) || 0) + 1
        );
      });

      // Update statuses with trade counts
      setBrokerStatuses(prev => {
        const updated = new Map(prev);
        connections.forEach(connection => {
          const status = updated.get(connection.id);
          if (status) {
            status.totalTrades = tradeCountsByConnection.get(connection.id) || 0;
            updated.set(connection.id, status);
          }
        });
        return updated;
      });
    } catch (err) {
      console.error('Failed to load trade counts:', err);
    }
  };

  // Add new broker connection
  const addConnection = useCallback(async (
    connection: Omit<BrokerConnection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!currentUser) throw new Error('User not authenticated');

    setIsLoading(true);
    try {
      await brokerService.addBrokerConnection(currentUser.uid, connection);
      await loadConnections();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, loadConnections]);

  // Delete broker connection
  const deleteConnection = useCallback(async (connectionId: string) => {
    if (!currentUser) throw new Error('User not authenticated');

    setIsLoading(true);
    try {
      await brokerService.deleteBrokerConnection(connectionId);
      await loadConnections();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, loadConnections]);

  // Sync trades from a specific broker
  const syncTrades = useCallback(async (connectionId: string) => {
    if (!currentUser) throw new Error('User not authenticated');

    const connection = connections.find(c => c.id === connectionId);
    if (!connection) throw new Error('Connection not found');

    // Update status to loading
    setBrokerStatuses(prev => {
      const updated = new Map(prev);
      const status = updated.get(connectionId);
      if (status) {
        status.isLoading = true;
        status.lastError = undefined;
        updated.set(connectionId, status);
      }
      return updated;
    });

    try {
      const result = await brokerService.syncTrades(currentUser.uid, connection);
      
      // Update connection's last sync time
      await brokerService.updateBrokerConnection(connectionId, {
        lastSync: result.lastSyncTime
      });

      // Reload connections to get updated data
      await loadConnections();

      return result;
    } catch (err: any) {
      // Update status with error
      setBrokerStatuses(prev => {
        const updated = new Map(prev);
        const status = updated.get(connectionId);
        if (status) {
          status.isLoading = false;
          status.lastError = err.message;
          updated.set(connectionId, status);
        }
        return updated;
      });
      throw err;
    }
  }, [currentUser, connections, loadConnections]);

  // Sync all active connections
  const syncAllTrades = useCallback(async () => {
    if (!currentUser) throw new Error('User not authenticated');

    const activeConnections = connections.filter(c => c.isActive);
    const results = [];

    for (const connection of activeConnections) {
      try {
        const result = await syncTrades(connection.id);
        results.push({ connectionId: connection.id, result, error: null });
      } catch (err: any) {
        results.push({ connectionId: connection.id, result: null, error: err.message });
      }
    }

    return results;
  }, [currentUser, connections, syncTrades]);

  // Convert imported broker trades to standard trade format
  const convertBrokerTradesToStandard = useCallback((importedTrades: ImportedTrade[]): Trade[] => {
    return importedTrades.map(trade => ({
      id: generateTradeId(),
      ticker: trade.ticker,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      quantity: trade.quantity,
      direction: trade.direction,
      timestamp: trade.timestamp,
      realizedPL: trade.realizedPL,
      notes: `${trade.notes || ''} [${trade.brokerType.toUpperCase()}]`.trim()
    }));
  }, []);

  // Get status for a specific connection
  const getConnectionStatus = useCallback((connectionId: string): BrokerStatus | null => {
    return brokerStatuses.get(connectionId) || null;
  }, [brokerStatuses]);

  // Check if any connections are currently syncing
  const isAnySyncing = useCallback(() => {
    return Array.from(brokerStatuses.values()).some(status => status.isLoading);
  }, [brokerStatuses]);

  // Get total trades across all brokers
  const getTotalBrokerTrades = useCallback(() => {
    return Array.from(brokerStatuses.values()).reduce((total, status) => total + status.totalTrades, 0);
  }, [brokerStatuses]);

  // Auto-sync functionality
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState<NodeJS.Timeout | null>(null);

  const enableAutoSync = useCallback((intervalMinutes: number = 30) => {
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
    }

    const interval = setInterval(async () => {
      try {
        console.log('Auto-syncing broker trades...');
        await syncAllTrades();
      } catch (err) {
        console.error('Auto-sync failed:', err);
      }
    }, intervalMinutes * 60 * 1000);

    setAutoSyncInterval(interval);
    setAutoSyncEnabled(true);
  }, [autoSyncInterval, syncAllTrades]);

  const disableAutoSync = useCallback(() => {
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
      setAutoSyncInterval(null);
    }
    setAutoSyncEnabled(false);
  }, [autoSyncInterval]);

  // Load connections on mount and user change
  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Cleanup auto-sync on unmount
  useEffect(() => {
    return () => {
      if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
      }
    };
  }, [autoSyncInterval]);

  return {
    // Data
    connections,
    brokerStatuses,
    isLoading,
    error,

    // Actions
    loadConnections,
    addConnection,
    deleteConnection,
    syncTrades,
    syncAllTrades,
    convertBrokerTradesToStandard,

    // Utilities
    getConnectionStatus,
    isAnySyncing,
    getTotalBrokerTrades,

    // Auto-sync
    autoSyncEnabled,
    enableAutoSync,
    disableAutoSync,

    // Error handling
    clearError: () => setError(null)
  };
};