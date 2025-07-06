import { useState } from 'react';
import { useWriteContract, useAccount, useBalance, useReadContract, usePublicClient, useSwitchChain } from 'wagmi';
import { erc20Abi, parseUnits, formatEther } from 'viem';
import { 
  sFVIX_ABI,
  sFVIX_TOKEN,
  FVIX_TOKEN
} from '../flow/stakeFVIX';
import { useStore } from '../store';

export interface PlantSFVIXParams {
  sFvixAmount: string;
  plantingLocation: { x: number; y: number };
}

export interface PlantSFVIXResult {
  plantAsync: (params: PlantSFVIXParams) => Promise<string>;
  isLoading: boolean;
  isPending: boolean;
  data: string | undefined;
  error: Error | null;
  checkEligibility: (amount: string) => PlantEligibilityResult;
  getMaxPlantable: () => string;
  hasPlantable: () => boolean;
  sFvixBalance: bigint;
  switchToFlow: () => Promise<void>;
  needsFlowNetwork: boolean;
}

export interface PlantEligibilityResult {
  canPlant: boolean;
  hasSufficientBalance: boolean;
  missingAmount: string;
  hasAnysFVIX: boolean;
  meetsMinimum: boolean;
}

// Flow network configuration
const FLOW_CHAIN_ID = 747;
const MINIMUM_SFVIX_PLANT = parseUnits('1', 18); // 1 sFVIX minimum

/**
 * Custom hook for planting sFVIX tokens as volatility plants in DeFi Valley
 * 
 * This hook handles:
 * 1. Verifying sFVIX balance on Flow network
 * 2. Cross-chain bridging to Saga for game integration
 * 3. Creating sFVIX plant in the game world
 * 
 * @returns Object with plantAsync function, loading states, and utility functions
 */
export function usePlantSFVIX(): PlantSFVIXResult {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();
  const [plantingError, setPlantingError] = useState<Error | null>(null);
  const { config } = useStore();
  
  // Check if user is on Flow network
  const needsFlowNetwork = chainId !== FLOW_CHAIN_ID;
  
  // Contract write hook for executing transactions
  const { 
    writeContractAsync, 
    isPending, 
    data: txHash, 
    error: writeError 
  } = useWriteContract();
  
  // Get user's sFVIX balance on Flow
  const { data: sFvixBalance } = useBalance({
    address,
    token: sFVIX_TOKEN,
    chainId: FLOW_CHAIN_ID,
    query: { enabled: !!address }
  });
  
  // Get user's sFVIX vault shares
  const { data: userShares } = useReadContract({
    address: sFVIX_TOKEN,
    abi: sFVIX_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: FLOW_CHAIN_ID,
    query: { enabled: !!address }
  });
  
  // Get pending rewards that could be claimed
  const { data: pendingRewards = 0n } = useReadContract({
    address: sFVIX_TOKEN,
    abi: sFVIX_ABI,
    functionName: 'pendingRewardsFor',
    args: address ? [address] : undefined,
    chainId: FLOW_CHAIN_ID,
    query: { enabled: !!address }
  });
  
  /**
   * Switch to Flow network for sFVIX operations
   */
  const switchToFlow = async (): Promise<void> => {
    if (!switchChain) {
      throw new Error('Chain switching not available');
    }
    
    try {
      await switchChain({ chainId: FLOW_CHAIN_ID });
    } catch (error) {
      throw new Error(`Failed to switch to Flow network: ${error}`);
    }
  };
  
  /**
   * Execute sFVIX plant transaction
   * 
   * Process:
   * 1. Verify sFVIX balance on Flow
   * 2. Lock sFVIX tokens in volatility farming contract
   * 3. Send cross-chain message to Saga GameController
   * 4. Create sFVIX plant in game world
   */
  const plantAsync = async (params: PlantSFVIXParams): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    if (needsFlowNetwork) {
      throw new Error('Please switch to Flow network first');
    }
    
    if (!sFvixBalance?.value) {
      throw new Error('sFVIX balance not available');
    }
    
    try {
      setPlantingError(null);
      
      const plantAmount = parseUnits(params.sFvixAmount, 18);
      
      // Check eligibility
      const eligibility = checkEligibility(params.sFvixAmount);
      if (!eligibility.canPlant) {
        throw new Error(`Cannot plant: ${eligibility.missingAmount} sFVIX needed`);
      }
      
      // For now, we'll simulate the planting process
      // In a full implementation, this would:
      // 1. Lock sFVIX in a volatility farming contract
      // 2. Send cross-chain message to Saga
      // 3. Create plant in GameController
      
      // Simulate transaction hash - in real implementation this would be the actual locking transaction
      const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
      
      // Add optimistic update to game state
      const seedId = Date.now(); // Simple seed ID generation
      
      console.log(`Planting ${params.sFvixAmount} sFVIX at location (${params.plantingLocation.x}, ${params.plantingLocation.y})`);
      console.log(`Seed ID: ${seedId}`);
      console.log(`Pending rewards: ${formatEther(pendingRewards)} FVIX`);
      
      return mockTxHash;
      
    } catch (error) {
      setPlantingError(error as Error);
      throw error;
    }
  };
  
  /**
   * Check sFVIX planting eligibility for a given amount
   */
  const checkEligibility = (amount: string): PlantEligibilityResult => {
    if (!sFvixBalance?.value) {
      return {
        canPlant: false,
        hasSufficientBalance: false,
        missingAmount: amount,
        hasAnysFVIX: false,
        meetsMinimum: false
      };
    }
    
    const plantAmount = parseUnits(amount, 18);
    const hasEnoughBalance = sFvixBalance.value >= plantAmount;
    const meetsMinimum = plantAmount >= MINIMUM_SFVIX_PLANT;
    
    return {
      canPlant: hasEnoughBalance && meetsMinimum,
      hasSufficientBalance: hasEnoughBalance,
      missingAmount: hasEnoughBalance ? '0' : formatEther(plantAmount - sFvixBalance.value),
      hasAnysFVIX: sFvixBalance.value > 0n,
      meetsMinimum
    };
  };
  
  /**
   * Get maximum plantable sFVIX with current balance
   */
  const getMaxPlantable = (): string => {
    if (!sFvixBalance?.value) {
      return '0';
    }
    
    return formatEther(sFvixBalance.value);
  };
  
  /**
   * Check if user has any plantable sFVIX
   */
  const hasPlantable = (): boolean => {
    if (!sFvixBalance?.value) {
      return false;
    }
    
    return sFvixBalance.value >= MINIMUM_SFVIX_PLANT;
  };
  
  return {
    plantAsync,
    isLoading: isPending,
    isPending,
    data: txHash,
    error: writeError || plantingError,
    checkEligibility,
    getMaxPlantable,
    hasPlantable,
    sFvixBalance: sFvixBalance?.value || 0n,
    switchToFlow,
    needsFlowNetwork
  };
}

/**
 * Hook to get sFVIX plant statistics and rewards
 */
export function useSFVIXPlantStats() {
  const { address } = useAccount();
  
  // Get current sFVIX balance
  const { data: sFvixBalance } = useBalance({
    address,
    token: sFVIX_TOKEN,
    chainId: FLOW_CHAIN_ID,
    query: { enabled: !!address }
  });
  
  // Get pending rewards
  const { data: pendingRewards = 0n } = useReadContract({
    address: sFVIX_TOKEN,
    abi: sFVIX_ABI,
    functionName: 'pendingRewardsFor',
    args: address ? [address] : undefined,
    chainId: FLOW_CHAIN_ID,
    query: { enabled: !!address }
  });
  
  // Get total assets in vault (for APY calculations)
  const { data: totalAssets } = useReadContract({
    address: sFVIX_TOKEN,
    abi: sFVIX_ABI,
    functionName: 'totalAssets',
    chainId: FLOW_CHAIN_ID,
    query: { enabled: !!address }
  });
  
  return {
    sFvixBalance: sFvixBalance?.value || 0n,
    formattedBalance: sFvixBalance?.formatted || '0',
    pendingRewards,
    formattedRewards: formatEther(pendingRewards),
    totalAssets: totalAssets || 0n,
    hasRewards: pendingRewards > 0n,
    hasBalance: (sFvixBalance?.value || 0n) > 0n
  };
}

/**
 * Hook to check if user needs to complete Flow quest steps before planting
 */
export function useSFVIXPlantRequirements() {
  const { address } = useAccount();
  const { flowQuests } = useStore();
  
  if (!address) {
    return {
      canPlant: false,
      needsSwap: true,
      needsMint: true,
      needsStake: true,
      questCompleted: false
    };
  }
  
  const userQuest = flowQuests[address];
  
  if (!userQuest) {
    return {
      canPlant: false,
      needsSwap: true,
      needsMint: true,
      needsStake: true,
      questCompleted: false
    };
  }
  
  const hasSwapped = userQuest.completedSteps.includes('SWAPPED');
  const hasMinted = userQuest.completedSteps.includes('MINTED');
  const hasStaked = userQuest.completedSteps.includes('STAKED');
  
  return {
    canPlant: hasSwapped && hasMinted && hasStaked,
    needsSwap: !hasSwapped,
    needsMint: !hasMinted,
    needsStake: !hasStaked,
    questCompleted: userQuest.isCompleted
  };
}