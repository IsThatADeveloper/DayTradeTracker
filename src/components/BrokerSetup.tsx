// src/components/BrokerSetup.tsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Settings, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { BrokerConnection, BrokerType, BrokerCredentials, SyncResult } from '../types/broker';
import { BROKER_CONFIGS, getBrokerConfig, POPULAR_BROKERS } from '../config/brokerConfigs';
import { brokerService } from '../services/brokerService';
import { useAuth } from '../contexts/AuthContext';

interface BrokerSetupProps {
  onTradesImported?: (count: number) => void;
}

export const BrokerSetup: React.FC<BrokerSetupProps> = ({ onTradesImported }) => {
  const { currentUser } = useAuth();
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<BrokerType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncingConnections, setSyncingConnections] = useState<Set<string>>(new Set());
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentUser) {
      loadConnections();
    }
  }, [currentUser]);

  const loadConnections = async () => {
    if (!currentUser) return;
    
    try {
      const userConnections = await brokerService.getBrokerConnections(currentUser.uid);
      setConnections(userConnections);
    } catch (error: any) {
      console.error('Failed to load broker connections:', error);
    }
  };

  const handleAddConnection = () => {
    setShowAddForm(true);
    setSelectedBroker(null);
  };

  const handleBrokerSelect = (brokerType: BrokerType) => {
    setSelectedBroker(brokerType);
  };

  const handleSaveConnection = async (connection: Omit<BrokerConnection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      await brokerService.addBrokerConnection(currentUser.uid, connection);
      await loadConnections();
      setShowAddForm(false);
      setSelectedBroker(null);
    } catch (error: any) {
      alert(`Failed to add broker connection: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this broker connection? This will also delete all imported trades.')) {
      return;
    }

    try {
      await brokerService.deleteBrokerConnection(connectionId);
      await loadConnections();
    } catch (error: any) {
      alert(`Failed to delete connection: ${error.message}`);
    }
  };

  const handleSyncTrades = async (connection: BrokerConnection) => {
    if (!currentUser) return;

    setSyncingConnections(prev => new Set(prev).add(connection.id));
    
    try {
      const result = await brokerService.syncTrades(currentUser.uid, connection);
      
      if (result.success) {
        alert(`Sync completed! Imported ${result.tradesImported} new trades, skipped ${result.tradesSkipped} existing trades.`);
        onTradesImported?.(result.tradesImported);
      } else {
        alert(`Sync failed: ${result.errors.join(', ')}`);
      }
      
      await loadConnections();
    } catch (error: any) {
      alert(`Sync failed: ${error.message}`);
    } finally {
      setSyncingConnections(prev => {
        const next = new Set(prev);
        next.delete(connection.id);
        return next;
      });
    }
  };

  const togglePasswordVisibility = (fieldKey: string) => {
    setShowPasswords(prev => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getConnectionStatusIcon = (connection: BrokerConnection) => {
    if (connection.isActive) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  if (showAddForm) {
    return <BrokerConnectionForm 
      selectedBroker={selectedBroker}
      onBrokerSelect={handleBrokerSelect}
      onSave={handleSaveConnection}
      onCancel={() => {
        setShowAddForm(false);
        setSelectedBroker(null);
      }}
      isLoading={isLoading}
      showPasswords={showPasswords}
      onTogglePassword={togglePasswordVisibility}
    />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Broker Connections
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Connect your trading accounts to automatically import trades
          </p>
        </div>
        <button
          onClick={handleAddConnection}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Broker
        </button>
      </div>

      {connections.length === 0 ? (
        <div className="text-center py-8">
          <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Broker Connections
          </h4>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Connect your first broker to start automatically importing trades
          </p>
          <button
            onClick={handleAddConnection}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Connect Your First Broker
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => {
            const config = getBrokerConfig(connection.brokerType);
            const isSyncing = syncingConnections.has(connection.id);
            
            return (
              <div
                key={connection.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{config.icon}</div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {connection.displayName || config.name}
                        </h4>
                        {getConnectionStatusIcon(connection)}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Last sync: {formatLastSync(connection.lastSync)}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {config.supportedMarkets.join(', ')}
                        </span>
                        {config.paperTradingSupport && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                            Paper Trading
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSyncTrades(connection)}
                      disabled={isSyncing || !connection.isActive}
                      className="inline-flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync'}
                    </button>
                    
                    <a
                      href={config.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      title="Visit broker website"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    
                    <button
                      onClick={() => handleDeleteConnection(connection.id)}
                      className="inline-flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface BrokerConnectionFormProps {
  selectedBroker: BrokerType | null;
  onBrokerSelect: (broker: BrokerType) => void;
  onSave: (connection: Omit<BrokerConnection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isLoading: boolean;
  showPasswords: Set<string>;
  onTogglePassword: (fieldKey: string) => void;
}

const BrokerConnectionForm: React.FC<BrokerConnectionFormProps> = ({
  selectedBroker,
  onBrokerSelect,
  onSave,
  onCancel,
  isLoading,
  showPasswords,
  onTogglePassword
}) => {
  const [credentials, setCredentials] = useState<BrokerCredentials>({});
  const [displayName, setDisplayName] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fix: Add proper type assertion for keyof BrokerCredentials
  const handleCredentialChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }));
  };

  const handleTestConnection = async () => {
    if (!selectedBroker) return;
    
    setIsTestingConnection(true);
    setTestResult(null);
    
    try {
      const result = await brokerService.testConnection(selectedBroker, credentials);
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBroker) {
      alert('Please select a broker');
      return;
    }

    const config = getBrokerConfig(selectedBroker);
    const requiredFields = config.fields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !credentials[field.key as keyof BrokerCredentials]);
    
    if (missingFields.length > 0) {
      alert(`Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    onSave({
      brokerType: selectedBroker,
      displayName: displayName || config.name,
      credentials,
      isActive: true,
      lastSync: null
    });
  };

  if (!selectedBroker) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Select Broker
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Popular Brokers
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {POPULAR_BROKERS.map(brokerType => {
              const config = getBrokerConfig(brokerType);
              return (
                <button
                  key={brokerType}
                  onClick={() => onBrokerSelect(brokerType)}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{config.icon}</div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">
                        {config.name}
                      </h5>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {config.supportedMarkets.join(', ')}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            All Brokers
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.values(BROKER_CONFIGS).filter(config => !POPULAR_BROKERS.includes(config.type)).map(config => (
              <button
                key={config.type}
                onClick={() => onBrokerSelect(config.type)}
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-xl">{config.icon}</div>
                  <div>
                    <h6 className="font-medium text-gray-900 dark:text-white text-sm">
                      {config.name}
                    </h6>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {config.supportedMarkets.join(', ')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const config = getBrokerConfig(selectedBroker);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onBrokerSelect(null as any)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ← Back
          </button>
          <div className="text-2xl">{config.icon}</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Connect {config.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {config.description}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Connection Name (Optional)
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={`My ${config.name} Account`}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {config.fields.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            
            {field.type === 'select' ? (
              <select
                value={(credentials[field.key as keyof BrokerCredentials] as string) || ''}
                onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                required={field.required}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                {field.options?.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="relative">
                <input
                  type={field.type === 'password' && !showPasswords.has(field.key) ? 'password' : 'text'}
                  value={(credentials[field.key as keyof BrokerCredentials] as string) || ''}
                  onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => onTogglePassword(field.key)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPasswords.has(field.key) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            )}
            
            {field.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {field.description}
              </p>
            )}
          </div>
        ))}

        {testResult && (
          <div className={`p-3 rounded-lg flex items-center space-x-2 ${
            testResult.success 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}>
            {testResult.success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}

        <div className="flex items-center space-x-4 pt-4">
          {config.testConnection && (
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isTestingConnection ? 'animate-spin' : ''}`} />
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
          )}
          
          <div className="flex space-x-3 ml-auto">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Connection'}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <a
                href={config.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
              >
                Visit {config.name}
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
              <a
                href={config.apiDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
              >
                API Documentation
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};