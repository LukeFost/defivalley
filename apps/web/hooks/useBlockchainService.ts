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
      type: 'plant_seed',
      status: 'preparing',
      player: address,
      seedType,
      amount: amount,
      gasEstimate: gasEstimate?.toString()
    });

    // Register tracker
    const tracker = createTracker(txId, 'plant_seed');
    serviceRef.current.registerTracker(txId, tracker);
    config?.onTransactionStart?.(txId, 'plant_seed');

    // Execute transaction
    return serviceRef.current.plantSeed({
      seedType,
      amount,
      gasEstimate,
      from: address,
      trackerId: txId
    });
  }, [address, addTransaction, createTracker, config, addNotification]);

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

    if (seedIds.length === 0) {
      addNotification({
        type: 'error',
        title: 'No Seeds Selected',
        message: 'Please select seeds to harvest'
      });
      return { success: false, error: 'No seeds selected' };
    }

    // Create transaction in store
    const txId = addTransaction({
      type: 'harvest_seed',
      status: 'preparing',
      player: address,
      seedId: seedIds[0] // Use first seed ID for tracking
    });

    // Register tracker
    const tracker = createTracker(txId, 'batch_harvest');
    serviceRef.current.registerTracker(txId, tracker);
    config?.onTransactionStart?.(txId, 'batch_harvest');

    // Execute transaction
    return serviceRef.current.batchHarvest({
      seedIds,
      gasEstimate,
      from: address,
      trackerId: txId
    });
  }, [address, addTransaction, createTracker, config, addNotification]);

  /**
   * Claim accumulated yield
   */
  const claimYield = useCallback(async (): Promise<TransactionResult> => {
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
      type: 'claim_yield',
      status: 'preparing',
      player: address
    });

    // Register tracker
    const tracker = createTracker(txId, 'claim_yield');
    serviceRef.current.registerTracker(txId, tracker);
    config?.onTransactionStart?.(txId, 'claim_yield');

    // Execute transaction
    return serviceRef.current.claimYield({
      from: address,
      trackerId: txId
    });
  }, [address, addTransaction, createTracker, config, addNotification]);

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