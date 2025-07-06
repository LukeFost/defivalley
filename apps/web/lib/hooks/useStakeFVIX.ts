import { useState } from 'react';
import { useWriteContract, useAccount, useBalance, useReadContract, usePublicClient } from 'wagmi';
import { erc20Abi, parseUnits } from 'viem';
import { 
  stakeFVIXForShares, 
  unstakeFVIXFromShares,
  claimStakingRewards,
  checkStakingEligibility,
  getMaxStakeableFVIX,
  estimateSFVIXShares,
  hasStakeableFVIX,
  sFVIX_ABI,
  sFVIX_TOKEN,
  FVIX_TOKEN
} from '../flow/stakeFVIX';

export interface StakeFVIXParams {
  fvixAmount: string;
}

export interface UnstakeFVIXParams {
  sFvixAmount: string;
}

export interface StakeFVIXResult {
  writeAsync: (params: StakeFVIXParams) => Promise<string>;
  unstakeAsync: (params: UnstakeFVIXParams) => Promise<string>;
  claimRewardsAsync: () => Promise<string>;
  isLoading: boolean;
  isPending: boolean;
  data: string | undefined;
  error: Error | null;
  checkEligibility: (amount: string) => ReturnType<typeof checkStakingEligibility>;
  getMaxStakeable: () => string;
  hasStakeable: () => boolean;
  estimateShares: (amount: string) => Promise<string | null>;
  pendingRewards: bigint;
}

/**
 * Custom hook for staking FVIX tokens to receive sFVIX shares
 * 
 * @returns Object with writeAsync function, loading states, and utility functions
 */
export function useStakeFVIX(): StakeFVIXResult {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [stakingError, setStakingError] = useState<Error | null>(null);
  
  // Contract write hook for executing transactions
  const { 
    writeContractAsync, 
    isPending, 
    data: txHash, 
    error: writeError 
  } = useWriteContract();
  
  // Get user's FVIX balance
  const { data: fvixBalance } = useBalance({
    address,
    token: FVIX_TOKEN,
    query: { enabled: !!address }
  });
  
  // Get user's sFVIX balance
  const { data: sFvixBalance } = useBalance({
    address,
    token: sFVIX_TOKEN,
    query: { enabled: !!address }
  });
  
  // Get pending rewards
  const { data: pendingRewards = 0n } = useReadContract({
    address: sFVIX_TOKEN,
    abi: sFVIX_ABI,
    functionName: 'pendingRewardsFor',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });
  
  /**
   * Execute FVIX → sFVIX staking transaction
   */
  const writeAsync = async (params: StakeFVIXParams): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    if (!fvixBalance?.value) {
      throw new Error('FVIX balance not available');
    }
    
    try {
      setStakingError(null);
      
      // Prepare staking transaction data
      const stakingData = stakeFVIXForShares(
        { 
          fvixAmount: params.fvixAmount, 
          recipient: address 
        },
        fvixBalance.value
      );
      
      if (!stakingData.canStake) {
        throw new Error(`Insufficient FVIX balance. Missing: ${stakingData.missingFvix.toString()}`);
      }
      
      // Execute the staking transaction
      const hash = await writeContractAsync(stakingData.txData);
      
      return hash;
    } catch (error) {
      setStakingError(error as Error);
      throw error;
    }
  };
  
  /**
   * Execute sFVIX → FVIX unstaking transaction
   */
  const unstakeAsync = async (params: UnstakeFVIXParams): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    try {
      setStakingError(null);
      
      // Prepare unstaking transaction data
      const unstakingData = unstakeFVIXFromShares({
        sFvixAmount: params.sFvixAmount,
        recipient: address,
        owner: address
      });
      
      // Execute the unstaking transaction
      const hash = await writeContractAsync(unstakingData);
      
      return hash;
    } catch (error) {
      setStakingError(error as Error);
      throw error;
    }
  };
  
  /**
   * Execute rewards claiming transaction
   */
  const claimRewardsAsync = async (): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    try {
      setStakingError(null);
      
      // Prepare rewards claiming transaction data
      const claimData = claimStakingRewards();
      
      // Execute the claim transaction
      const hash = await writeContractAsync(claimData);
      
      return hash;
    } catch (error) {
      setStakingError(error as Error);
      throw error;
    }
  };
  
  /**
   * Check FVIX staking eligibility for a given amount
   */
  const checkEligibility = (amount: string) => {
    if (!fvixBalance?.value) {
      return {
        canStake: false,
        hasSufficientBalance: false,
        missingFvix: amount,
        hasAnyFvix: false
      };
    }
    
    return checkStakingEligibility(fvixBalance.value, amount);
  };
  
  /**
   * Get maximum stakeable FVIX with current balance
   */
  const getMaxStakeable = (): string => {
    if (!fvixBalance?.value) {
      return '0';
    }
    
    return getMaxStakeableFVIX(fvixBalance.value);
  };
  
  /**
   * Check if user has any stakeable FVIX
   */
  const hasStakeable = (): boolean => {
    if (!fvixBalance?.value) {
      return false;
    }
    
    return hasStakeableFVIX(fvixBalance.value);
  };
  
  /**
   * Estimate sFVIX shares for a given FVIX amount
   */
  const estimateShares = async (amount: string): Promise<string | null> => {
    if (!publicClient || !amount || amount === '0') {
      return null;
    }
    
    try {
      const previewDeposit = async (assets: bigint) => {
        const result = await publicClient.readContract({
          address: sFVIX_TOKEN,
          abi: sFVIX_ABI,
          functionName: 'previewDeposit',
          args: [assets]
        });
        return result;
      };
      
      const shares = await estimateSFVIXShares(amount, previewDeposit);
      return shares;
    } catch (error) {
      return null;
    }
  };
  
  return {
    writeAsync,
    unstakeAsync,
    claimRewardsAsync,
    isLoading: isPending,
    isPending,
    data: txHash,
    error: writeError || stakingError,
    checkEligibility,
    getMaxStakeable,
    hasStakeable,
    estimateShares,
    pendingRewards
  };
}

/**
 * Hook to check FVIX token allowance for sFVIX contract
 */
export function useFVIXAllowance() {
  const { address } = useAccount();
  
  const { data: allowance, refetch } = useReadContract({
    address: FVIX_TOKEN,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && [address, sFVIX_TOKEN],
    query: { enabled: !!address }
  });
  
  const { writeContractAsync: approve, isPending: isApproving } = useWriteContract();
  
  const approveAsync = async (amount: bigint): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    const hash = await approve({
      address: FVIX_TOKEN,
      abi: erc20Abi,
      functionName: 'approve',
      args: [sFVIX_TOKEN, amount]
    });
    
    return hash;
  };
  
  return {
    allowance: allowance || 0n,
    approveAsync,
    isApproving,
    refetch
  };
}

/**
 * Hook to get sFVIX token balance and related information
 */
export function useSFVIXBalance() {
  const { address } = useAccount();
  
  const { data: balance, isLoading, refetch } = useBalance({
    address,
    token: sFVIX_TOKEN,
    query: { enabled: !!address }
  });
  
  return {
    balance: balance?.value || 0n,
    formatted: balance?.formatted || '0',
    isLoading,
    refetch
  };
}

/**
 * Hook to get sFVIX vault information
 */
export function useSFVIXVaultInfo() {
  const { address } = useAccount();
  
  const { data: totalAssets } = useReadContract({
    address: sFVIX_TOKEN,
    abi: sFVIX_ABI,
    functionName: 'totalSupply',
    query: { enabled: !!address }
  });
  
  const { data: userShares } = useReadContract({
    address: sFVIX_TOKEN,
    abi: sFVIX_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });
  
  return {
    totalAssets: totalAssets || 0n,
    userShares: userShares || 0n
  };
}