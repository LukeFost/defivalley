'use client';

import React, { useEffect, useState } from 'react';
import { useTransactions, useUI, TxStatus, CrossChainTx } from '../app/store';

// Helper function to get explorer URL for transaction hash
const getExplorerUrl = (txHash: string, chain: 'saga' | 'arbitrum' | 'axelar'): string => {
  switch (chain) {
    case 'saga':
      return `https://yieldfield-2751669528484000-1.sagaexplorer.io/tx/${txHash}`;
    case 'arbitrum':
      return `https://sepolia.arbiscan.io/tx/${txHash}`;
    case 'axelar':
      return `https://testnet.axelarscan.io/gmp/${txHash}`;
    default:
      return '#';
  }
};

// Helper function to get chain name for display
const getChainName = (chain: 'saga' | 'arbitrum' | 'axelar'): string => {
  switch (chain) {
    case 'saga':
      return 'Saga Chainlet';
    case 'arbitrum':
      return 'Arbitrum Sepolia';
    case 'axelar':
      return 'Axelar Network';
    default:
      return 'Unknown';
  }
};

interface TransactionStepProps {
  status: TxStatus;
  currentStatus: TxStatus;
  title: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
  hasError?: boolean;
}

function TransactionStep({ 
  status, 
  currentStatus, 
  title, 
  description, 
  isActive, 
  isCompleted, 
  hasError 
}: TransactionStepProps) {
  return (
    <div className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-300 ${
      isActive ? 'bg-blue-50 border border-blue-200' : 
      isCompleted ? 'bg-green-50 border border-green-200' :
      hasError ? 'bg-red-50 border border-red-200' :
      'bg-gray-50 border border-gray-200'
    }`}>
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
        hasError ? 'bg-red-500' :
        isCompleted ? 'bg-green-500' :
        isActive ? 'bg-blue-500 animate-pulse' :
        'bg-gray-300'
      }`}>
        {hasError ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        ) : isCompleted ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : isActive ? (
          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
        ) : (
          <div className="w-2 h-2 bg-gray-500 rounded-full" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${
          hasError ? 'text-red-700' :
          isCompleted ? 'text-green-700' :
          isActive ? 'text-blue-700' :
          'text-gray-500'
        }`}>
          {title}
        </p>
        <p className={`text-xs mt-1 ${
          hasError ? 'text-red-600' :
          isCompleted ? 'text-green-600' :
          isActive ? 'text-blue-600' :
          'text-gray-400'
        }`}>
          {description}
        </p>
      </div>
    </div>
  );
}

interface TransactionCardProps {
  transaction: CrossChainTx;
  onRetry: (id: string) => void;
}

function TransactionCard({ transaction, onRetry }: TransactionCardProps) {
  const getTimeAgo = () => {
    const now = Date.now();
    const diff = now - transaction.lastUpdated;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
  };
  
  const getTransactionSteps = (tx: CrossChainTx) => {
    const baseSteps = [
      {
        status: 'preparing' as TxStatus,
        title: 'Preparing Transaction',
        description: 'Validating parameters and checking requirements'
      },
      {
        status: 'wallet_confirm' as TxStatus,
        title: 'Wallet Confirmation',
        description: 'Please confirm the transaction in your wallet'
      }
    ];
    
    if (tx.type === 'plant_seed') {
      return [
        ...baseSteps,
        {
          status: 'saga_pending' as TxStatus,
          title: 'Saga Transaction',
          description: 'Processing seed planting on Saga Chainlet'
        },
        {
          status: 'axelar_processing' as TxStatus,
          title: 'Cross-chain Bridge',
          description: 'Axelar is processing cross-chain message'
        },
        {
          status: 'arbitrum_pending' as TxStatus,
          title: 'DeFi Deposit',
          description: 'Depositing USDC into yield farming vault'
        },
        {
          status: 'completed' as TxStatus,
          title: 'Complete',
          description: 'Seed planted and earning DeFi yield!'
        }
      ];
    } else if (tx.type === 'harvest_seed') {
      return [
        ...baseSteps,
        {
          status: 'saga_pending' as TxStatus,
          title: 'Harvest Processing',
          description: 'Marking seed as harvested on Saga'
        },
        {
          status: 'axelar_processing' as TxStatus,
          title: 'Cross-chain Claim',
          description: 'Triggering yield claim on Arbitrum'
        },
        {
          status: 'arbitrum_pending' as TxStatus,
          title: 'Yield Transfer',
          description: 'Transferring DeFi yield to your wallet'
        },
        {
          status: 'completed' as TxStatus,
          title: 'Harvested',
          description: 'Seed harvested and yield claimed!'
        }
      ];
    } else {
      return [
        ...baseSteps,
        {
          status: 'arbitrum_pending' as TxStatus,
          title: 'Yield Claim',
          description: 'Claiming accumulated yield from vault'
        },
        {
          status: 'completed' as TxStatus,
          title: 'Claimed',
          description: 'Yield successfully claimed!'
        }
      ];
    }
  };
  
  const steps = getTransactionSteps(transaction);
  const currentStepIndex = steps.findIndex(step => step.status === transaction.status);
  const hasError = transaction.status === 'failed';
  
  const getStatusColor = (status: TxStatus) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'axelar_processing': return 'text-orange-600';
      default: return 'text-blue-600';
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'plant_seed': return 'Plant Seed';
      case 'harvest_seed': return 'Harvest Seed';
      case 'claim_yield': return 'Claim Yield';
      default: return type;
    }
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {getTypeLabel(transaction.type)}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span className={getStatusColor(transaction.status)}>
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1).replace('_', ' ')}
            </span>
            <span>•</span>
            <span>{getTimeAgo()}</span>
          </div>
        </div>
        
        {transaction.status === 'failed' && (
          <button
            onClick={() => onRetry(transaction.id)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
      
      {/* Transaction Details */}
      {transaction.seedType && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Seed Type:</span>
              <span className="ml-2 font-medium">
                {transaction.seedType === 1 ? 'USDC Sprout' :
                 transaction.seedType === 2 ? 'USDC Premium' :
                 transaction.seedType === 3 ? 'USDC Whale Tree' : 
                 `Type ${transaction.seedType}`}
              </span>
            </div>
            {transaction.amount && (
              <div>
                <span className="text-gray-500">Amount:</span>
                <span className="ml-2 font-medium">
                  {transaction.amount ? (Number(transaction.amount) / 1e6).toFixed(2) : '0.00'} USDC
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Progress Steps */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <TransactionStep
            key={step.status}
            status={step.status}
            currentStatus={transaction.status}
            title={step.title}
            description={step.description}
            isActive={index === currentStepIndex && !hasError}
            isCompleted={index < currentStepIndex && !hasError}
            hasError={hasError && index === currentStepIndex}
          />
        ))}
      </div>
      
      {/* Error Message */}
      {transaction.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            <span className="font-medium">Error:</span> {transaction.error}
          </p>
          {transaction.retryCount > 0 && (
            <p className="text-xs text-red-600 mt-1">
              Retry attempt {transaction.retryCount}
            </p>
          )}
        </div>
      )}
      
      {/* Transaction Hashes */}
      {(transaction.sagaTxHash || transaction.arbitrumTxHash || transaction.axelarTxHash) && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Transaction Hashes:</p>
          <div className="space-y-1">
            {transaction.sagaTxHash && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-gray-500">Saga:</span>
                <a
                  href={getExplorerUrl(transaction.sagaTxHash, 'saga')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-100 px-2 py-1 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                  title={`View on ${getChainName('saga')} Explorer`}
                >
                  {transaction.sagaTxHash.slice(0, 10)}...{transaction.sagaTxHash.slice(-8)}
                </a>
              </div>
            )}
            {transaction.arbitrumTxHash && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-gray-500">Arbitrum:</span>
                <a
                  href={getExplorerUrl(transaction.arbitrumTxHash, 'arbitrum')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-100 px-2 py-1 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                  title={`View on ${getChainName('arbitrum')} Explorer`}
                >
                  {transaction.arbitrumTxHash.slice(0, 10)}...{transaction.arbitrumTxHash.slice(-8)}
                </a>
              </div>
            )}
            {transaction.axelarTxHash && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-gray-500">Axelar:</span>
                <a
                  href={getExplorerUrl(transaction.axelarTxHash, 'axelar')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-100 px-2 py-1 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                  title={`View on ${getChainName('axelar')} Explorer`}
                >
                  {transaction.axelarTxHash.slice(0, 10)}...{transaction.axelarTxHash.slice(-8)}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransactionTracker() {
  const { active: activeTransactions, history: transactionHistory, retry, clearCompleted, complete } = useTransactions();
  const { showTransactionTracker, toggleTransactionTracker } = useUI();
  const [, forceUpdate] = useState({});
  
  // Clean up stuck transactions on component mount
  useEffect(() => {
    // Find active transactions that are actually completed/failed but stuck in active state
    const stuckTransactions = activeTransactions.filter(tx => 
      tx.status === 'completed' || tx.status === 'failed'
    );
    
    // Move stuck transactions to history
    stuckTransactions.forEach(tx => {
      if (tx.status === 'completed') {
        complete(tx.id);
      }
    });
  }, [activeTransactions, complete]);
  
  // Single interval for all time updates
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({}); // Force re-render to update all time displays
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Debug: Check transaction state
  if (activeTransactions?.length === 0 && transactionHistory?.length === 0) {
    console.log('📊 TransactionTracker: No transactions to display');
  }
  
  if (!showTransactionTracker) {
    return null;
  }
  
  const allTransactions = [
    ...(activeTransactions || []), 
    ...(transactionHistory || []).slice(0, 10)
  ];
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Transaction Tracker</h2>
          <button
            onClick={toggleTransactionTracker}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {allTransactions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions</h3>
              <p className="text-gray-500">Your cross-chain transactions will appear here</p>
            </div>
          ) : (
            <div>
              {activeTransactions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Transactions</h3>
                  {activeTransactions.map((tx) => (
                    <TransactionCard
                      key={tx.id}
                      transaction={tx}
                      onRetry={retry}
                    />
                  ))}
                </div>
              )}
              
              {transactionHistory.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent History</h3>
                  {transactionHistory.slice(0, 10).map((tx) => (
                    <TransactionCard
                      key={tx.id}
                      transaction={tx}
                      onRetry={retry}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Real-time updates via Axelar Network</span>
          </div>
          
          <button
            onClick={clearCompleted}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}