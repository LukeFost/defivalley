import { useState } from 'react';
import { useWriteContract, useAccount, useBalance, useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { 
  mintFVIXWithFroth, 
  checkFVIXMintEligibility,
  getMaxMintableFVIX,
  meetsMinimumThreshold,
  FVIX_ABI,
  FVIX_TOKEN,
  FROTH_TOKEN
} from '../flow/mintFVIX';

export interface MintFVIXParams {
  frothAmount: string;
}

export interface MintFVIXResult {
  writeAsync: (params: MintFVIXParams) => Promise<string>;
  isLoading: boolean;
  isPending: boolean;
  data: string | undefined;
  error: Error | null;
  checkEligibility: (amount: string) => ReturnType<typeof checkFVIXMintEligibility>;
  getMaxMintable: () => string;
  meetsThreshold: (amount: string) => boolean;
}

/**
 * Custom hook for minting FVIX tokens using FROTH tokens
 * 
 * @returns Object with writeAsync function, loading states, and utility functions
 */
export function useMintFVIX(): MintFVIXResult {
  const { address } = useAccount();
  const [mintError, setMintError] = useState<Error | null>(null);
  
  // Contract write hook for executing mints
  const { 
    writeContractAsync, 
    isPending, 
    data: txHash, 
    error: writeError 
  } = useWriteContract();
  
  // Get user's FROTH balance
  const { data: frothBalance } = useBalance({
    address,
    token: FROTH_TOKEN,
    query: { enabled: !!address }
  });
  
  // Get user's FVIX balance for display
  const { data: fvixBalance } = useBalance({
    address,
    token: FVIX_TOKEN,
    query: { enabled: !!address }
  });
  
  /**
   * Execute FROTH → FVIX minting transaction
   */
  const writeAsync = async (params: MintFVIXParams): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    if (!frothBalance?.value) {
      throw new Error('FROTH balance not available');
    }
    
    try {
      setMintError(null);
      
      // Prepare mint transaction data
      const mintData = mintFVIXWithFroth(
        { frothAmount: params.frothAmount },
        frothBalance.value
      );
      
      if (!mintData.canMint) {
        if (mintData.missingFroth > 0n) {
          throw new Error(`Insufficient FROTH balance. Missing: ${mintData.missingFroth.toString()}`);
        } else {
          throw new Error('Amount is below minimum threshold of 10,000 FROTH');
        }
      }
      
      // Execute the mint transaction
      const hash = await writeContractAsync(mintData.txData);
      
      return hash;
    } catch (error) {
      setMintError(error as Error);
      throw error;
    }
  };
  
  /**
   * Check FVIX minting eligibility for a given FROTH amount
   */
  const checkEligibility = (amount: string) => {
    if (!frothBalance?.value) {
      return {
        canMint: false,
        hasMinimumThreshold: false,
        hasSufficientBalance: false,
        missingFroth: amount,
        thresholdMet: false
      };
    }
    
    return checkFVIXMintEligibility(frothBalance.value, amount);
  };
  
  /**
   * Get maximum mintable FVIX with current FROTH balance
   */
  const getMaxMintable = (): string => {
    if (!frothBalance?.value) {
      return '0';
    }
    
    return getMaxMintableFVIX(frothBalance.value);
  };
  
  /**
   * Check if amount meets minimum threshold
   */
  const meetsThreshold = (amount: string): boolean => {
    return meetsMinimumThreshold(amount);
  };
  
  return {
    writeAsync,
    isLoading: isPending,
    isPending,
    data: txHash,
    error: writeError || mintError,
    checkEligibility,
    getMaxMintable,
    meetsThreshold
  };
}

/**
 * Hook to check FROTH token allowance for FVIX contract
 */
export function useFrothAllowance() {
  const { address } = useAccount();
  
  const { data: allowance, refetch } = useReadContract({
    address: FROTH_TOKEN,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && [address, FVIX_TOKEN],
    query: { enabled: !!address }
  });
  
  const { writeContractAsync: approve, isPending: isApproving } = useWriteContract();
  
  const approveAsync = async (amount: bigint): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    const hash = await approve({
      address: FROTH_TOKEN,
      abi: erc20Abi,
      functionName: 'approve',
      args: [FVIX_TOKEN, amount]
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
 * Hook to get FVIX token balance and related information
 */
export function useFVIXBalance() {
  const { address } = useAccount();
  
  const { data: balance, isLoading, refetch } = useBalance({
    address,
    token: FVIX_TOKEN,
    query: { enabled: !!address }
  });
  
  return {
    balance: balance?.value || 0n,
    formatted: balance?.formatted || '0',
    isLoading,
    refetch
  };
}