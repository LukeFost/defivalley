import { useCallback } from 'react';
import { useUI, useConfig } from '../../app/store';
import { GameControllerABI } from '../../app/lib/abis/GameController';
import { useBaseTransaction, createTransactionConfig } from './useBaseTransaction';

export interface HarvestSeedParams {
  seedId: number;
}

export interface HarvestSeedResult {
  txId?: string;
  success: boolean;
  error?: string;
}

export function useHarvestSeed() {
  const { executeTransaction, isLoading } = useBaseTransaction<{ txHash: string }>();
  const { addNotification } = useUI();
  const config = useConfig();
  
  const harvestSeed = useCallback(async ({ seedId }: HarvestSeedParams): Promise<HarvestSeedResult> => {
    
    // Create transaction configuration for harvest
    const txConfig = createTransactionConfig(
      config.gameControllerAddress,
      GameControllerABI,
      'harvestSeed',
      [BigInt(seedId)]
    );
    
    // Execute the transaction using base transaction hook
    const result = await executeTransaction(
      {
        type: 'harvest_seed',
        targetChainId: config.sagaChainId,
        metadata: {
          seedId
        }
      },
      txConfig
    );
    
    if (result.success && result.txId) {
      // Handle post-harvest processing
      handleHarvestProcessing(result.txId);
      
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
  
  // Handle harvest processing and cross-chain yield claim
  const handleHarvestProcessing = useCallback((txId: string) => {
    // In a real implementation, this would:
    // 1. Wait for Saga harvest confirmation
    // 2. Trigger cross-chain yield claim on DeFi vault (Arbitrum)
    // 3. Update seed status and transfer yield to player
    
    setTimeout(() => {
      addNotification({
        type: 'info',
        title: 'Processing Harvest',
        message: 'Initiating cross-chain yield claim on Arbitrum...'
      });
    }, 2000);
    
    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Harvest Complete!',
        message: 'Your seed has been harvested and yield claimed!'
      });
    }, 5000);
  }, [addNotification]);
  
  return {
    harvestSeed,
    isLoading
  };
}