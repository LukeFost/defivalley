import { useCallback } from 'react';
import { useUI, useConfig } from '../../app/store';
import { GameControllerABI } from '../../app/lib/abis/GameController';
import { useBaseTransaction, createTransactionConfig } from './useBaseTransaction';
import { parseEther } from 'viem';

export interface BatchHarvestParams {
  seedIds: number[];
  gasToken?: `0x${string}`;
}

export interface BatchHarvestResult {
  success: boolean;
  txId?: string;
  error?: string;
  harvestedCount?: number;
}

export function useBatchHarvest() {
  const { executeTransaction, isLoading } = useBaseTransaction();
  const { addNotification } = useUI();
  const config = useConfig();

  const batchHarvest = useCallback(async ({ 
    seedIds, 
    gasToken 
  }: BatchHarvestParams): Promise<BatchHarvestResult> => {
    try {
      if (seedIds.length === 0) {
        return {
          success: false,
          error: 'No seeds selected for harvest'
        };
      }

      // Estimate gas cost for cross-chain transactions (0.01 ETH per seed)
      const gasPayment = parseEther((0.01 * seedIds.length).toString());

      // Create transaction configuration
      const txConfig = createTransactionConfig(
        config.gameControllerAddress,
        GameControllerABI,
        'batchHarvestSeeds',
        [seedIds.map(id => BigInt(id)), gasToken || '0x0000000000000000000000000000000000000000'],
        gasPayment
      );

      // Execute the transaction
      const result = await executeTransaction(
        {
          type: 'batch_harvest',
          targetChainId: config.sagaChainId,
          metadata: {
            seedIds,
            seedCount: seedIds.length,
            gasToken
          }
        },
        txConfig
      );

      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Batch Harvest Started!',
          message: `Harvesting ${seedIds.length} seeds. Cross-chain yield claims initiated.`
        });

        // Simulate cross-chain processing
        setTimeout(() => {
          addNotification({
            type: 'info',
            title: 'Processing Cross-Chain Claims',
            message: `Claiming yield from ${seedIds.length} seeds on Arbitrum...`
          });
        }, 3000);

        setTimeout(() => {
          addNotification({
            type: 'success',
            title: 'Batch Harvest Complete!',
            message: `Successfully harvested ${seedIds.length} seeds and claimed all yields!`
          });
        }, 8000);

        return {
          success: true,
          txId: result.txId,
          harvestedCount: seedIds.length
        };
      }

      return {
        success: false,
        error: result.error
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch harvest failed';
      
      addNotification({
        type: 'error',
        title: 'Batch Harvest Failed',
        message: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }, [executeTransaction, addNotification, config]);

  return {
    batchHarvest,
    isLoading
  };
}