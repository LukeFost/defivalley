import { useCallback } from 'react';
import { parseUnits, parseEther } from 'viem';
import { usePlayerData, useUI, useConfig } from '../../app/store';
import { GameControllerABI } from '../../app/lib/abis/GameController';
import { useBaseTransaction, createTransactionConfig } from './useBaseTransaction';

export interface PlantSeedParams {
  seedType: number;
  amount: string; // USDC amount as string (will be parsed to 6 decimals)
  gasEstimate?: bigint;
}

export interface PlantSeedResult {
  txId?: string;
  success: boolean;
  error?: string;
}

// Cross-chain gas estimation (simplified)
const ESTIMATED_CROSS_CHAIN_GAS = parseEther('0.01'); // 0.01 ETH

export function usePlantSeed() {
  const { executeTransaction, isLoading, currentTxId } = useBaseTransaction<{ txHash: string }>();
  const { seedTypes, addOptimisticSeed } = usePlayerData();
  const { addNotification } = useUI();
  const config = useConfig();
  
  const plantSeed = useCallback(async ({ 
    seedType, 
    amount, 
    gasEstimate = ESTIMATED_CROSS_CHAIN_GAS 
  }: PlantSeedParams): Promise<PlantSeedResult> => {
    
    // Validate seed type
    const selectedSeedType = seedTypes.find(st => st.id === seedType);
    if (!selectedSeedType) {
      addNotification({
        type: 'error',
        title: 'Invalid Seed Type',
        message: 'Selected seed type is not available'
      });
      return { success: false, error: 'Invalid seed type' };
    }
    
    // Validate amount
    const parsedAmount = parseUnits(amount, 6); // USDC has 6 decimals
    if (parsedAmount < selectedSeedType.minAmount) {
      addNotification({
        type: 'error',
        title: 'Insufficient Amount',
        message: `Minimum amount for ${selectedSeedType.name} is ${Number(selectedSeedType.minAmount) / 1e6} USDC`
      });
      return { success: false, error: 'Amount below minimum' };
    }
    
    // Create transaction configuration
    const txConfig = createTransactionConfig(
      config.gameControllerAddress,
      GameControllerABI,
      'plantSeed',
      [
        BigInt(seedType),
        parsedAmount,
        '0x0000000000000000000000000000000000000000' // Native gas token
      ],
      gasEstimate, // Cross-chain gas payment
      BigInt('100000000') // 0.1 Gwei minimum required by Saga
    );
    
    // Execute the transaction using base transaction hook
    const result = await executeTransaction(
      {
        type: 'plant_seed',
        targetChainId: config.sagaChainId,
        metadata: {
          seedType,
          amount: parsedAmount.toString(),
          gasEstimate: gasEstimate.toString()
        }
      },
      txConfig
    );
    
    if (result.success && result.txId) {
      // Add optimistic seed position
      const optimisticSeedId = addOptimisticSeed(
        seedType,
        parsedAmount,
        result.txId
      );
      
      // Handle cross-chain processing
      handleCrossChainProcessing(result.txId, selectedSeedType);
      
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
    seedTypes,
    addOptimisticSeed,
    addNotification,
    config
  ]);
  
  // Handle cross-chain processing stages
  const handleCrossChainProcessing = useCallback((txId: string, seedType: any) => {
    // In a real implementation, this would monitor Axelar message processing
    // For now, simulate the cross-chain flow with timeouts
    
    setTimeout(() => {
      addNotification({
        type: 'info',
        title: 'Cross-chain Processing',
        message: 'Axelar is processing your cross-chain message to Arbitrum...'
      });
    }, 5000);
    
    setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Seed Planted Successfully!',
        message: `Your ${seedType.name} is now growing and earning DeFi yield!`
      });
    }, 30000);
  }, [addNotification]);
  
  return {
    plantSeed,
    isLoading,
    currentTxId
  };
}