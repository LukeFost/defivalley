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
import { useAppStore, useUI } from '../app/store';

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



  return {
    // Service access
    service: serviceRef.current,
    
    // State
    isInitialized: !!serviceRef.current,
    address
  };
}