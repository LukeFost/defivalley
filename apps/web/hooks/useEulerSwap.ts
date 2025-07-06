"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSimulateContract } from "wagmi";
import { type Address, parseUnits, formatUnits } from "viem";
import { BASE_CHAIN_ID } from "@/constants/base-tokens";
import { simpleSwapHelperAbi } from "@/abi/eulerswap-factory-abi";
import { useEulerSwapPool } from "./useEulerSwapPool";

// SimpleSwapHelper contract on Base
const SIMPLE_SWAP_HELPER = "0x2e234dae75c793f67a35089c9d99245e1c58470b" as Address;

export function useEulerSwap() {
  const { address } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const { userPool, EULERSWAP_PERIPHERY } = useEulerSwapPool();

  // Simulate contract for quotes
  const { data: simulateData, error: simulateError, refetch: refetchQuote } = useSimulateContract({
    address: SIMPLE_SWAP_HELPER,
    abi: simpleSwapHelperAbi,
    functionName: "getQuote",
    args: userPool && address ? [userPool, address as Address, address as Address, BigInt(0)] : undefined,
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: false, // Manual control
    },
  });

  // Get quote from SimpleSwapHelper
  const getQuote = async (
    tokenIn: Address,
    tokenOut: Address,
    amountIn: string,
    decimalsIn: number
  ) => {
    if (!userPool) {
      setError("No pool available");
      return null;
    }

    try {
      const amountInBigInt = parseUnits(amountIn, decimalsIn);
      
      // For now, return a simple estimate (we'd need to properly implement this)
      // In production, you'd use a read contract call or simulate
      console.log("Getting quote for:", {
        tokenIn,
        tokenOut,
        amountIn: formatUnits(amountInBigInt, decimalsIn),
      });

      // Simple 1:1 estimate for demo (in reality, would use pool's pricing)
      return amountInBigInt;
    } catch (err: any) {
      console.error("Quote error:", err);
      setError(err.message || "Failed to get quote");
      return null;
    }
  };

  // Write contract for swap
  const {
    writeContract: writeSwap,
    data: swapTxHash,
    isPending: isSwapPending,
    error: swapError,
  } = useWriteContract();

  // Wait for swap transaction
  const { 
    isLoading: isSwapConfirming, 
    isSuccess: isSwapSuccess 
  } = useWaitForTransactionReceipt({
    hash: swapTxHash,
  });

  // Execute swap through SimpleSwapHelper
  const swap = async (
    tokenIn: Address,
    tokenOut: Address,
    amountIn: string,
    decimalsIn: number,
    minAmountOut: string,
    decimalsOut: number
  ) => {
    if (!address || !userPool) {
      setError("Missing required data");
      return null;
    }

    try {
      setError(null);
      
      const amountInBigInt = parseUnits(amountIn, decimalsIn);
      const minAmountOutBigInt = parseUnits(minAmountOut, decimalsOut);

      console.log("🔄 Executing swap through EulerSwap pool...", {
        pool: userPool,
        tokenIn,
        tokenOut,
        amountIn: formatUnits(amountInBigInt, decimalsIn),
        minAmountOut: formatUnits(minAmountOutBigInt, decimalsOut),
      });

      await writeSwap({
        address: SIMPLE_SWAP_HELPER,
        abi: simpleSwapHelperAbi,
        functionName: "swap",
        args: [userPool, tokenIn, tokenOut, amountInBigInt, minAmountOutBigInt],
        chainId: BASE_CHAIN_ID,
      });

      return true;
    } catch (err: any) {
      console.error("Swap error:", err);
      setError(err.message || "Failed to execute swap");
      return null;
    }
  };

  return {
    // Swap functions
    getQuote,
    swap,
    
    // State
    isSwapping: isSwapPending || isSwapConfirming,
    isSuccess: isSwapSuccess,
    swapTxHash,
    
    // Error handling
    error: error || swapError?.message,
    
    // Pool info
    userPool,
    hasPool: !!userPool && userPool !== "0x0000000000000000000000000000000000000000",
    
    // Contract addresses
    SIMPLE_SWAP_HELPER,
    EULERSWAP_PERIPHERY,
  };
}