// src/components/DebugPanel.tsx
import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { tradeService } from '../services/tradeService';

interface DebugPanelProps {
  cloudTrades: any[];
  localTrades: any[];
  isLoadingCloudData: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  cloudTrades,
  localTrades,
  isLoadingCloudData,
}) => {
  const { currentUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const runPermissionTest = async () => {
    if (!currentUser) return;
    
    setIsTesting(true);
    const results = [];
    
    try {
      // Test 1: Read permission
      results.push({ test: 'Read Trades', status: 'testing' });
      setTestResults([...results]);
      
      const trades = await tradeService.getUserTrades(currentUser.uid);
      results[results.length - 1] = { 
        test: 'Read Trades', 
        status: 'success', 
        details: `Found ${trades.length} trades` 
      };
      
      // Test 2: Write permission (if we have trades to test with)
      if (localTrades.length > 0) {
        results.push({ test: 'Create Trade', status: 'testing' });
        setTestResults([...results]);
        
        const testTrade = {
          ...localTrades[0],
          ticker: 'TEST',
          notes: 'Debug test trade - safe to delete'
        };
        
        const tradeId = await tradeService.addTrade(currentUser.uid, testTrade);
        results[results.length - 1] = { 
          test: 'Create Trade', 
          status: 'success', 
          details: `Created test trade with ID: ${tradeId}` 
        };
        
        // Test 3: Delete permission
        results.push({ test: 'Delete Trade', status: 'testing' });
        setTestResults([...results]);
        
        await tradeService.deleteTrade(tradeId);
        results[results.length - 1] = { 
          test: 'Delete Trade', 
          status: 'success', 
          details: 'Successfully deleted test trade' 
        };
      }
      
    } catch (error) {
      const lastIndex = results.length - 1;
      if (lastIndex >= 0) {
        results[lastIndex] = { 
          ...results[lastIndex], 
          status: 'error', 
          details: error.message 
        };
      }
    }
    
    setTestResults(results);
    setIsTesting(false);
  };

  const copyDebugInfo = () => {
    const debugInfo = {
      user: {
        uid: currentUser?.uid,
        email: currentUser?.email,
        isAuthenticated: !!currentUser,
      },
      data: {
        cloudTradesCount: cloudTrades.length,
        localTradesCount: localTrades.length,
        isLoadingCloudData,
      },
      browser: {
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
      testResults,
      timestamp: new Date().toISOString(),
    };
    
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Only show in development or when explicitly enabled
  if (process.env.NODE_ENV === 'production' && !localStorage.getItem('debug-mode')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-w-md">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
        >
          <div className="flex items-center">
            <Bug className="h-4 w-4 mr-2 text-yellow-600" />
            Debug Panel
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {isExpanded && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-600">
            <div className="space-y-3 text-xs">
              <div>
                <strong>Auth Status:</strong> {currentUser ? '✅ Signed In' : '❌ Not Signed In'}
                {currentUser && (
                  <div className="text-gray-600 dark:text-gray-400 mt-1">
                    {currentUser.email}
                  </div>
                )}
              </div>
              
              <div>
                <strong>Data Status:</strong>
                <div className="text-gray-600 dark:text-gray-400 mt-1">
                  Cloud: {isLoadingCloudData ? 'Loading...' : `${cloudTrades.length} trades`}<br/>
                  Local: {localTrades.length} trades
                </div>
              </div>
              
              {testResults.length > 0 && (
                <div>
                  <strong>Permission Tests:</strong>
                  <div className="mt-1 space-y-1">
                    {testResults.map((result, index) => (
                      <div key={index} className="text-gray-600 dark:text-gray-400">
                        {result.status === 'testing' && '🔄 '}
                        {result.status === 'success' && '✅ '}
                        {result.status === 'error' && '❌ '}
                        {result.test}: {result.details}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={runPermissionTest}
                  disabled={!currentUser || isTesting}
                  className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTesting ? 'Testing...' : 'Test Permissions'}
                </button>
                
                <button
                  onClick={copyDebugInfo}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 flex items-center"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              
              <div className="text-gray-500 dark:text-gray-400 text-xs">
                To hide: remove 'debug-mode' from localStorage
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};