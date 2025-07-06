import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';

interface TransactionData {
  id: string;
  player_id: string;
  type: 'plant_seed' | 'harvest_seed' | 'claim_yield';
  status: 'preparing' | 'wallet_confirm' | 'saga_pending' | 'axelar_processing' | 'arbitrum_pending' | 'completed' | 'failed';
  saga_tx_hash?: string;
  arbitrum_tx_hash?: string;
  axelar_tx_id?: string;
  axelar_tx_hash?: string;
  start_time: number;
  last_updated: number;
  estimated_completion_time?: number;
  error_message?: string;
  retry_count: number;
  seed_type?: number;
  seed_id?: number;
  amount?: string;
  gas_estimate?: string;
  created_at?: string;
  updated_at?: string;
}

interface UseTransactionPersistenceOptions {
  enableWebsockets?: boolean;
  pollInterval?: number;
}

export function useTransactionPersistence(options: UseTransactionPersistenceOptions = {}) {
  const { enableWebsockets = true, pollInterval = 5000 } = options;
  const { address } = useAccount();
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch transactions from API
  const fetchTransactions = useCallback(async (activeOnly = false) => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        playerId: address,
        limit: '50',
        offset: '0',
        activeOnly: activeOnly.toString()
      });

      const response = await fetch(`/api/transactions?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Save transaction to database
  const saveTransaction = useCallback(async (transaction: Omit<TransactionData, 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction, action: 'save' })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update local state
      setTransactions(prev => {
        const existing = prev.find(tx => tx.id === transaction.id);
        if (existing) {
          return prev.map(tx => tx.id === transaction.id ? data.transaction : tx);
        } else {
          return [data.transaction, ...prev];
        }
      });

      return data.transaction;
    } catch (err) {
      console.error('Error saving transaction:', err);
      throw err;
    }
  }, []);

  // Update transaction in database
  const updateTransaction = useCallback(async (id: string, updates: Partial<TransactionData>) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update local state
      setTransactions(prev => 
        prev.map(tx => tx.id === id ? { ...tx, ...data.transaction } : tx)
      );

      return data.transaction;
    } catch (err) {
      console.error('Error updating transaction:', err);
      throw err;
    }
  }, []);

  // WebSocket connection for real-time updates
  const connectWebSocket = useCallback(() => {
    if (!enableWebsockets || !address) return;

    // For now, simulate WebSocket with polling
    // In production, this would connect to a real WebSocket server
    console.log('🔗 Starting transaction monitoring for', address);
    
    // Clean up existing connections
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    // Simulate WebSocket with polling for active transactions
    const startPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(async () => {
        try {
          // Check for transaction status updates via RPC
          const activeTransactions = transactions.filter(tx => 
            !['completed', 'failed'].includes(tx.status)
          );

          for (const tx of activeTransactions) {
            await checkTransactionStatus(tx);
          }
        } catch (err) {
          console.error('Error polling transaction status:', err);
        }
      }, pollInterval);
    };

    startPolling();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [enableWebsockets, address, transactions, pollInterval]);

  // Check transaction status using RPC
  const checkTransactionStatus = useCallback(async (transaction: TransactionData) => {
    try {
      // Simulate RPC calls to check transaction status
      // In production, this would make actual RPC calls to Saga/Arbitrum/Axelar
      
      if (transaction.saga_tx_hash && transaction.status === 'saga_pending') {
        // Simulate Saga RPC call
        const sagaConfirmed = Math.random() > 0.7; // 30% chance of confirmation
        if (sagaConfirmed) {
          await updateTransaction(transaction.id, { 
            status: 'axelar_processing',
            last_updated: Date.now()
          });
        }
      }

      if (transaction.axelar_tx_id && transaction.status === 'axelar_processing') {
        // Simulate Axelar status check
        const axelarCompleted = Math.random() > 0.8; // 20% chance of completion
        if (axelarCompleted) {
          await updateTransaction(transaction.id, { 
            status: 'arbitrum_pending',
            arbitrum_tx_hash: '0x' + Math.random().toString(16).substring(2, 66),
            last_updated: Date.now()
          });
        }
      }

      if (transaction.arbitrum_tx_hash && transaction.status === 'arbitrum_pending') {
        // Simulate Arbitrum confirmation
        const arbitrumConfirmed = Math.random() > 0.6; // 40% chance of confirmation
        if (arbitrumConfirmed) {
          await updateTransaction(transaction.id, { 
            status: 'completed',
            last_updated: Date.now()
          });
        }
      }
    } catch (err) {
      console.error('Error checking transaction status:', err);
    }
  }, [updateTransaction]);

  // Initialize on mount
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Set up WebSocket monitoring
  useEffect(() => {
    const cleanup = connectWebSocket();
    return cleanup;
  }, [connectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    saveTransaction,
    updateTransaction,
    // Utility functions
    getActiveTransactions: () => transactions.filter(tx => !['completed', 'failed'].includes(tx.status)),
    getCompletedTransactions: () => transactions.filter(tx => tx.status === 'completed'),
    getFailedTransactions: () => transactions.filter(tx => tx.status === 'failed'),
    getTransactionById: (id: string) => transactions.find(tx => tx.id === id),
  };
}