import { useState, useCallback } from 'react';
import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, parseEther } from 'viem';
import { useAppStore, useTransactions, usePlayerData, useUI, useConfig } from '../store';
import { GameControllerABI } from '../lib/abis/GameController';

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
  const [isLoading, setIsLoading] = useState(false);
  const [currentTxId, setCurrentTxId] = useState<string | null>(null);
  
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract } = useWriteContract();
  
  const { add: addTransaction, update: updateTransaction } = useTransactions();
  const { seedTypes, addOptimisticSeed } = usePlayerData();
  const { addNotification } = useUI();
  const config = useConfig();
  
  const plantSeed = useCallback(async ({ 
    seedType, 
    amount, 
    gasEstimate = ESTIMATED_CROSS_CHAIN_GAS 
  }: PlantSeedParams): Promise<PlantSeedResult> => {
    
    if (!address) {
      addNotification({
        type: 'error',
        title: 'Wallet Required',
        message: 'Please connect your wallet to plant seeds'
      });
      return { success: false, error: 'No wallet connected' };
    }
    
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
    
    try {
      setIsLoading(true);
      
      // Ensure we're on Saga chainlet for gaming transactions
      if (chainId !== config.sagaChainId) {
        addNotification({
          type: 'info',
          title: 'Switching Network',
          message: 'Switching to Saga Chainlet for gasless gaming...'
        });
        
        await switchChain({ chainId: config.sagaChainId });
      }
      
      // Create transaction in store with optimistic update
      const txId = addTransaction({
        type: 'plant_seed',
        status: 'preparing',
        player: address,
        seedType,
        amount: parsedAmount.toString(),
        gasEstimate: gasEstimate.toString()
      });
      
      setCurrentTxId(txId);
      
      // Add optimistic seed position
      const optimisticSeedId = addOptimisticSeed(
        seedType,
        parsedAmount,
        txId
      );
      
      updateTransaction(txId, { 
        status: 'wallet_confirm',
        optimisticSeedId 
      });
      
      addNotification({
        type: 'info',
        title: 'Confirm Transaction',
        message: 'Please confirm the transaction in your wallet'
      });
      
      // Execute the plant seed transaction on Saga
      const txHash = await writeContract({
        address: config.gameControllerAddress,
        abi: GameControllerABI,
        functionName: 'plantSeed',
        args: [
          BigInt(seedType),
          parsedAmount,
          '0x0000000000000000000000000000000000000000' // Native gas token
        ],
        value: gasEstimate // Cross-chain gas payment
      });
      
      updateTransaction(txId, { 
        status: 'saga_pending',
        sagaTxHash: txHash 
      });
      
      addNotification({
        type: 'success',
        title: 'Transaction Submitted',
        message: 'Seed planting initiated on Saga! Cross-chain processing will begin shortly.'
      });
      
      // Note: In a real implementation, you would monitor the transaction
      // and update the status through various stages:
      // 1. Wait for Saga confirmation
      // 2. Monitor Axelar message processing
      // 3. Wait for Arbitrum execution
      // 4. Update final status
      
      // For now, we'll simulate the process with timeouts
      setTimeout(() => {
        updateTransaction(txId, { 
          status: 'axelar_processing',
          estimatedCompletionTime: Date.now() + 5 * 60 * 1000 // 5 minutes
        });
        
        addNotification({
          type: 'info',
          title: 'Cross-chain Processing',
          message: 'Axelar is processing your cross-chain message to Arbitrum...'
        });
      }, 3000);
      
      // Simulate completion after 5 minutes (in production, this would be event-driven)
      setTimeout(() => {
        updateTransaction(txId, { status: 'completed' });
        
        addNotification({
          type: 'success',
          title: 'Seed Planted Successfully!',
          message: `Your ${selectedSeedType.name} is now growing and earning DeFi yield!`
        });
      }, 5 * 60 * 1000);
      
      setCurrentTxId(null);
      setIsLoading(false);
      
      return { 
        success: true, 
        txId 
      };
      
    } catch (error: any) {
      console.error('Plant seed error:', error);
      
      if (currentTxId) {
        updateTransaction(currentTxId, { 
          status: 'failed',
          error: error.message || 'Unknown error occurred'
        });
      }
      
      addNotification({
        type: 'error',
        title: 'Transaction Failed',
        message: error.message || 'Failed to plant seed. Please try again.'
      });
      
      setCurrentTxId(null);
      setIsLoading(false);
      
      return { 
        success: false, 
        error: error.message || 'Transaction failed' 
      };
    }
  }, [
    address,
    chainId,
    switchChain,
    writeContract,
    addTransaction,
    updateTransaction,
    seedTypes,
    addOptimisticSeed,
    addNotification,
    config
  ]);
  
  return {
    plantSeed,
    isLoading,
    currentTxId
  };
}

// Hook for harvesting seeds (triggers yield claim on Arbitrum)
export function useHarvestSeed() {
  const [isLoading, setIsLoading] = useState(false);
  
  const { address } = useAccount();
  const { add: addTransaction, update: updateTransaction } = useTransactions();
  const { addNotification } = useUI();
  const config = useConfig();
  
  const harvestSeed = useCallback(async (seedId: number): Promise<PlantSeedResult> => {
    if (!address) {
      addNotification({
        type: 'error',
        title: 'Wallet Required',
        message: 'Please connect your wallet to harvest seeds'
      });
      return { success: false, error: 'No wallet connected' };
    }
    
    try {
      setIsLoading(true);
      
      // Create harvest transaction
      const txId = addTransaction({
        type: 'harvest_seed',
        status: 'preparing',
        player: address,
        seedId
      });
      
      updateTransaction(txId, { status: 'wallet_confirm' });
      
      addNotification({
        type: 'info',
        title: 'Harvesting Seed',
        message: 'Initiating harvest and yield claim...'
      });
      
      // In a real implementation, this would:
      // 1. Call harvestSeed on GameController (Saga)
      // 2. Trigger cross-chain yield claim on DeFiVault (Arbitrum)
      // 3. Update seed status and transfer yield to player
      
      // Simulate harvest process
      setTimeout(() => {
        updateTransaction(txId, { status: 'completed' });
        
        addNotification({
          type: 'success',
          title: 'Harvest Complete!',
          message: 'Your seed has been harvested and yield claimed!'
        });
      }, 3000);
      
      setIsLoading(false);
      return { success: true, txId };
      
    } catch (error: any) {
      console.error('Harvest seed error:', error);
      
      addNotification({
        type: 'error',
        title: 'Harvest Failed',
        message: error.message || 'Failed to harvest seed. Please try again.'
      });
      
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  }, [address, addTransaction, updateTransaction, addNotification, config]);
  
  return {
    harvestSeed,
    isLoading
  };
}

// Hook for claiming accumulated yield directly from DeFi vault
export function useClaimYield() {
  const [isLoading, setIsLoading] = useState(false);
  
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract } = useWriteContract();
  
  const { add: addTransaction, update: updateTransaction } = useTransactions();
  const { addNotification } = useUI();
  const config = useConfig();
  
  const claimYield = useCallback(async (): Promise<PlantSeedResult> => {
    if (!address) {
      addNotification({
        type: 'error',
        title: 'Wallet Required',
        message: 'Please connect your wallet to claim yield'
      });
      return { success: false, error: 'No wallet connected' };
    }
    
    try {
      setIsLoading(true);
      
      // Switch to Arbitrum for DeFi operations
      if (chainId !== config.arbitrumChainId) {
        addNotification({
          type: 'info',
          title: 'Switching Network',
          message: 'Switching to Arbitrum for DeFi operations...'
        });
        
        await switchChain({ chainId: config.arbitrumChainId });
      }
      
      // Create yield claim transaction
      const txId = addTransaction({
        type: 'claim_yield',
        status: 'preparing',
        player: address
      });
      
      updateTransaction(txId, { status: 'wallet_confirm' });
      
      addNotification({
        type: 'info',
        title: 'Claiming Yield',
        message: 'Please confirm yield claim in your wallet'
      });
      
      // Execute yield claim on DeFi vault
      const txHash = await writeContract({
        address: config.defiVaultAddress,
        abi: [
          {
            "inputs": [],
            "name": "claimYield",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ],
        functionName: 'claimYield'
      });
      
      updateTransaction(txId, { 
        status: 'arbitrum_pending',
        arbitrumTxHash: txHash 
      });
      
      addNotification({
        type: 'success',
        title: 'Yield Claim Submitted',
        message: 'Your yield claim is being processed on Arbitrum'
      });
      
      // Simulate completion
      setTimeout(() => {
        updateTransaction(txId, { status: 'completed' });
        
        addNotification({
          type: 'success',
          title: 'Yield Claimed!',
          message: 'Your DeFi yield has been successfully claimed!'
        });
      }, 10000);
      
      setIsLoading(false);
      return { success: true, txId };
      
    } catch (error: any) {
      console.error('Claim yield error:', error);
      
      addNotification({
        type: 'error',
        title: 'Claim Failed',
        message: error.message || 'Failed to claim yield. Please try again.'
      });
      
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  }, [
    address,
    chainId,
    switchChain,
    writeContract,
    addTransaction,
    updateTransaction,
    addNotification,
    config
  ]);
  
  return {
    claimYield,
    isLoading
  };
}

// Main hook that combines all cross-chain transaction functionality
export function useCrossChainTx() {
  const plantSeedHook = usePlantSeed();
  const harvestSeedHook = useHarvestSeed();
  const claimYieldHook = useClaimYield();
  
  const isLoading = plantSeedHook.isLoading || harvestSeedHook.isLoading || claimYieldHook.isLoading;
  
  return {
    ...plantSeedHook,
    ...harvestSeedHook,
    ...claimYieldHook,
    isLoading,
    
    // Gas estimation helper
    estimateGas: useCallback(async (seedType: number, amount: string) => {
      // Simple gas estimation - in production, this would call actual contract methods
      return ESTIMATED_CROSS_CHAIN_GAS;
    }, [])
  };
}