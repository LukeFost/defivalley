import { useCallback } from 'react';
import { useUI, useConfig } from '../store';
import { useBaseTransaction, createTransactionConfig } from '../../lib/hooks/useBaseTransaction';

export interface ClaimYieldResult {
  txId?: string;
  success: boolean;
  error?: string;
}

export function useClaimYield() {
  const { executeTransaction, isLoading } = useBaseTransaction<{ txHash: string }>();
  const { addNotification } = useUI();
  const config = useConfig();
  
  const claimYield = useCallback(async (): Promise<ClaimYieldResult> => {
    
    // Create transaction configuration for yield claim
    const txConfig = createTransactionConfig(
      config.defiVaultAddress,
      [
        {
          "inputs": [],
          "name": "claimYield",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ],
      'claimYield'
    );
    
    // Execute the transaction using base transaction hook
    const result = await executeTransaction(
      {
        type: 'claim_yield',
        targetChainId: config.arbitrumChainId,
        metadata: {}
      },
      txConfig
    );
    
    if (result.success && result.txId) {
      // Handle post-claim processing
      handleClaimProcessing(result.txId);
      
      return {
        success: true,
        txId: result.txId
      };
    }
    
    return {
      success: false,
      error: result.error
    };
  }, [
    executeTransaction,
    addNotification,
    config
  ]);
  
  // Handle claim processing
  const handleClaimProcessing = useCallback((txId: string) => {
    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Yield Claimed!',
        message: 'Your DeFi yield has been successfully claimed!'
      });
    }, 8000);
  }, [addNotification]);
  
  return {
    claimYield,
    isLoading
  };
}