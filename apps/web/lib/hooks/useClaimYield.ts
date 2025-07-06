import { useCallback } from 'react';
import { useUI, useConfig } from '../../app/store';
import { DeFiVaultABI } from '../../app/lib/abis/DeFiVault';
import { useBaseTransaction, createTransactionConfig } from './useBaseTransaction';

export interface ClaimYieldResult {
  success: boolean;
  txId?: string;
  error?: string;
}

export function useClaimYield() {
  const { executeTransaction, isLoading } = useBaseTransaction();
  const { addNotification } = useUI();
  const config = useConfig();

  const claimYield = useCallback(async (): Promise<ClaimYieldResult> => {
    try {
      // Create transaction configuration for direct yield claim
      const txConfig = createTransactionConfig(
        config.defiVaultAddress,
        DeFiVaultABI,
        'claimYield',
        []
      );

      // Execute the transaction
      const result = await executeTransaction(
        {
          type: 'claim_yield',
          targetChainId: config.arbitrumChainId,
          metadata: {
            action: 'direct_claim'
          }
        },
        txConfig
      );

      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Yield Claimed!',
          message: 'Your available yield has been claimed directly from the DeFi vault.'
        });

        return {
          success: true,
          txId: result.txId
        };
      }

      return {
        success: false,
        error: result.error
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Yield claim failed';
      
      addNotification({
        type: 'error',
        title: 'Claim Failed',
        message: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }, [executeTransaction, addNotification, config]);

  return {
    claimYield,
    isLoading
  };
}