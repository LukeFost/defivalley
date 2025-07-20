import { useCallback, useEffect, useRef } from 'react';
import { useConfig, useAccount } from 'wagmi';
import { 
  BlockchainService, 
  createBlockchainService,
  type BlockchainServiceConfig,
  type TransactionResult,
  type TransactionTracker,
  type TransactionType
} from '../services/BlockchainService';
import { useAppStore, useTransactions, useUI } from '../app/store';

// Hook configuration
interface UseBlockchainServiceConfig {
  onTransactionStart?: (txId: string, type: TransactionType) => void;
  onTransactionUpdate?: (txId: string, status: string, metadata?: any) => void;
  onTransactionComplete?: (txId: string, result: TransactionResult) => void;
  onTransactionError?: (txId: string, error: Error) => void;
}

/**
 * React hook for using the BlockchainService
 * Provides a convenient interface for blockchain operations with automatic state management
 */
export function useBlockchainService(config?: UseBlockchainServiceConfig) {
  const wagmiConfig = useConfig();
  const { address } = useAccount();
  const serviceRef = useRef<BlockchainService | null>(null);
  
  // Store hooks
  const { 
    add: addTransaction, 
    update: updateTransaction,
    complete: completeTransaction,
    fail: failTransaction 
  } = useTransactions();
  const { addNotification } = useUI();
  const appConfig = useAppStore(state => state.config);

  // Initialize service
  useEffect(() => {
    if (!serviceRef.current && wagmiConfig) {
      const serviceConfig: BlockchainServiceConfig = {
        sagaChainId: appConfig.sagaChainId,
        arbitrumChainId: appConfig.arbitrumChainId,
        gameControllerAddress: appConfig.gameControllerAddress,
        defiVaultAddress: appConfig.defiVaultAddress,
      };

      serviceRef.current = createBlockchainService(serviceConfig, wagmiConfig);
    }
  }, [wagmiConfig, appConfig]);

  /**
   * Create a transaction tracker that integrates with the store
   */
  const createTracker = useCallback((
    txId: string,
    type: TransactionType
  ): TransactionTracker => {
    return {
      onStatusUpdate: (id, status, metadata) => {
        updateTransaction(id, { status: status as any, ...metadata });
        config?.onTransactionUpdate?.(id, status, metadata);
        
        // Show notifications for key status updates
        switch (status) {
          case 'wallet_confirm':
            addNotification({
              type: 'info',
              title: 'Confirm Transaction',
              message: 'Please confirm the transaction in your wallet'
            });
            break;
          case 'transaction_sent':
            addNotification({
              type: 'success',
              title: 'Transaction Submitted',
              message: `Your ${type.replace('_', ' ')} transaction has been submitted!`
            });
            break;
          case 'cross_chain_processing':
            addNotification({
              type: 'info',
              title: 'Cross-chain Processing',
              message: 'Your transaction is being processed across chains...'
            });
            break;
        }
      },
      onError: (id, error) => {
        failTransaction(id, error.message);
        config?.onTransactionError?.(id, error);
        
        addNotification({
          type: 'error',
          title: 'Transaction Failed',
          message: error.message || 'An error occurred during the transaction'
        });
      },
      onComplete: (id, result) => {
        completeTransaction(id);
        config?.onTransactionComplete?.(id, result);
        
        if (result.success) {
          addNotification({
            type: 'success',
            title: 'Transaction Complete!',
            message: `Your ${type.replace('_', ' ')} has been completed successfully!`
          });
        }
      }
    };
  }, [updateTransaction, failTransaction, completeTransaction, addNotification, config]);

  /**
   * Plant a seed
   */
  const plantSeed = useCallback(async (
    seedType: number,
    amount: string,
    gasEstimate?: bigint
  ): Promise<TransactionResult> => {
    // Plant seed functionality removed with cross-chain logic
    addNotification({
      type: 'info',
      title: 'Feature Disabled',
      message: 'Plant seed functionality has been removed'
    });
    return { success: false, error: 'Feature disabled' };
  }, [addNotification]);

  /**
   * Harvest a single crop
   */
  const harvestCrop = useCallback(async (
    seedId: number,
    gasEstimate?: bigint
  ): Promise<TransactionResult> => {
    if (!serviceRef.current) {
      throw new Error('Blockchain service not initialized');
    }

    if (!address) {
      addNotification({
        type: 'error',
        title: 'Wallet Required',
        message: 'Please connect your wallet to continue'
      });
      return { success: false, error: 'No wallet connected' };
    }

    // Create transaction in store
    const txId = addTransaction({
      type: 'harvest_seed',
      status: 'preparing',
      player: address,
      seedId
    });

    // Register tracker
    const tracker = createTracker(txId, 'harvest_seed');
    serviceRef.current.registerTracker(txId, tracker);
    config?.onTransactionStart?.(txId, 'harvest_seed');

    // Execute transaction
    return serviceRef.current.harvestCrop({
      seedId,
      gasEstimate,
      from: address,
      trackerId: txId
    });
  }, [address, addTransaction, createTracker, config, addNotification]);

  /**
   * Batch harvest multiple crops
   */
  const batchHarvest = useCallback(async (
    seedIds: number[],
    gasEstimate?: bigint
  ): Promise<TransactionResult> => {
    // Batch harvest functionality removed with cross-chain logic
    addNotification({
      type: 'info',
      title: 'Feature Disabled',
      message: 'Batch harvest functionality has been removed'
    });
    return { success: false, error: 'Feature disabled' };
  }, [addNotification]);

  /**
   * Claim accumulated yield
   */
  const claimYield = useCallback(async (): Promise<TransactionResult> => {
    // Claim yield functionality removed with cross-chain logic
    addNotification({
      type: 'info',
      title: 'Feature Disabled',
      message: 'Claim yield functionality has been removed'
    });
    return { success: false, error: 'Feature disabled' };
  }, [addNotification]);

  /**
   * Estimate gas for an operation
   */
  const estimateGas = useCallback(async (
    operation: TransactionType,
    params?: any
  ): Promise<bigint> => {
    if (!serviceRef.current) {
      throw new Error('Blockchain service not initialized');
    }

    return serviceRef.current.estimateCrossChainGas(operation, params);
  }, []);

  return {
    // Main operations
    plantSeed,
    harvestCrop,
    batchHarvest,
    claimYield,
    
    // Utilities
    estimateGas,
    
    // Service access
    service: serviceRef.current,
    
    // State
    isInitialized: !!serviceRef.current,
    address
  };
}