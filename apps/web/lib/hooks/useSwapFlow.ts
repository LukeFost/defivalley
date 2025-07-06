import { useState } from 'react';
import { useWriteContract, useAccount, useBalance, useReadContract, usePublicClient } from 'wagmi';
import { type Address, erc20Abi } from 'viem';
import { 
  swapExactFLOWForTokens, 
  estimateFROTHOutput,
  hasInsufficientBalance,
  PUNCHSWAP_V2_ROUTER,
  PUNCHSWAP_V2_ABI,
  FLOW_TOKEN,
  FROTH_TOKEN
} from '../flow/swap';

export interface SwapFlowParams {
  amountIn: string;
  slippage?: number;
  amountOutMin?: string;
}

export interface SwapFlowResult {
  writeAsync: (params: SwapFlowParams) => Promise<string>;
  isLoading: boolean;
  isPending: boolean;
  data: string | undefined;
  error: Error | null;
  estimateOutput: (amountIn: string) => Promise<string | null>;
  hasInsufficientBalance: (amountIn: string) => boolean;
}

/**
 * Custom hook for swapping FLOW tokens to FROTH tokens using PunchSwap V2
 * 
 * @returns Object with writeAsync function, loading states, and utility functions
 */
export function useSwapFlow(): SwapFlowResult {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [estimateError, setEstimateError] = useState<Error | null>(null);
  
  // Contract write hook for executing swaps
  const { 
    writeContractAsync, 
    isPending, 
    data: txHash, 
    error: writeError 
  } = useWriteContract();
  
  // Get user's FLOW balance
  const { data: flowBalance } = useBalance({
    address,
    token: FLOW_TOKEN,
    query: { enabled: !!address }
  });
  
  // Function to get amounts out from router
  const { data: amountsOut, refetch: refetchAmountsOut } = useReadContract({
    address: PUNCHSWAP_V2_ROUTER,
    abi: PUNCHSWAP_V2_ABI,
    functionName: 'getAmountsOut',
    args: [0n, [FLOW_TOKEN, FROTH_TOKEN]], // Will be updated dynamically
    query: { enabled: false } // Disable automatic queries
  });
  
  /**
   * Execute FLOW → FROTH swap transaction
   */
  const writeAsync = async (params: SwapFlowParams): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    if (!publicClient) {
      throw new Error('Public client not available');
    }
    
    // Custom getAmountsOut function for the swap helper
    const getAmountsOut = async (amountIn: bigint, path: readonly Address[]) => {
      const result = await publicClient.readContract({
        address: PUNCHSWAP_V2_ROUTER,
        abi: PUNCHSWAP_V2_ABI,
        functionName: 'getAmountsOut',
        args: [amountIn, path]
      });
      return result;
    };
    
    // Prepare swap transaction data
    const swapData = await swapExactFLOWForTokens(
      {
        amountIn: params.amountIn,
        slippage: params.slippage,
        amountOutMin: params.amountOutMin,
        recipient: address
      },
      getAmountsOut
    );
    
    // Execute the swap transaction
    const hash = await writeContractAsync(swapData.txData);
    
    return hash;
  };
  
  /**
   * Estimate FROTH output for a given FLOW input
   */
  const estimateOutput = async (amountIn: string): Promise<string | null> => {
    if (!publicClient || !amountIn || amountIn === '0') {
      return null;
    }
    
    try {
      setEstimateError(null);
      
      const getAmountsOut = async (amountInWei: bigint, path: readonly Address[]) => {
        const result = await publicClient.readContract({
          address: PUNCHSWAP_V2_ROUTER,
          abi: PUNCHSWAP_V2_ABI,
          functionName: 'getAmountsOut',
          args: [amountInWei, path]
        });
        return result;
      };
      
      const output = await estimateFROTHOutput(amountIn, getAmountsOut);
      return output;
    } catch (error) {
      setEstimateError(error as Error);
      return null;
    }
  };
  
  /**
   * Check if user has insufficient FLOW balance for swap
   */
  const checkInsufficientBalance = (amountIn: string): boolean => {
    if (!flowBalance?.value || !amountIn) {
      return true;
    }
    
    return hasInsufficientBalance(flowBalance.value, amountIn);
  };
  
  return {
    writeAsync,
    isLoading: isPending,
    isPending,
    data: txHash,
    error: writeError || estimateError,
    estimateOutput,
    hasInsufficientBalance: checkInsufficientBalance
  };
}

/**
 * Hook to check FLOW token allowance for PunchSwap router
 */
export function useFlowAllowance() {
  const { address } = useAccount();
  
  const { data: allowance, refetch } = useReadContract({
    address: FLOW_TOKEN,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && [address, PUNCHSWAP_V2_ROUTER],
    query: { enabled: !!address }
  });
  
  const { writeContractAsync: approve, isPending: isApproving } = useWriteContract();
  
  const approveAsync = async (amount: bigint): Promise<string> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    const hash = await approve({
      address: FLOW_TOKEN,
      abi: erc20Abi,
      functionName: 'approve',
      args: [PUNCHSWAP_V2_ROUTER, amount]
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