"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useReadContract,
} from "wagmi";
import { parseEther, formatEther, type Address } from "viem";
import { KATANA_TOKENS } from "@/constants/katana-tokens";

// vbETH ABI - minimal interface for wrap/unwrap
const vbETH_ABI = [
  {
    stateMutability: "payable",
    type: "function",
    inputs: [],
    name: "deposit",
    outputs: [],
  },
  {
    stateMutability: "nonpayable",
    type: "function",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "burn",
    outputs: [],
  },
  {
    stateMutability: "view",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function useWrapETH() {
  const { address } = useAccount();
  const [error, setError] = useState<string | null>(null);

  // Debug chain info
  // console.log("=== WRAP ETH HOOK DEBUG ===");
  // console.log("Current chain:", chain);
  // console.log("Chain ID:", chain?.id);
  // console.log("Address:", address);
  // console.log("WETH address:", KATANA_TOKENS.WETH);
  // console.log("===========================");

  // Get ETH balance
  const {
    data: ethBalance,
    isLoading: isLoadingETH,
    refetch: refetchETH,
  } = useBalance({
    address,
    chainId: 747474, // Katana chain ID
  });

  // Get vbETH balance
  const {
    data: vbEthBalance,
    isLoading: isLoadingVbETH,
    refetch: refetchVbETH,
  } = useReadContract({
    address: KATANA_TOKENS.vbETH,
    abi: vbETH_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 747474, // Katana chain ID
  });

  // Wrap ETH to vbETH
  const {
    writeContract: writeWrap,
    data: wrapHash,
    isPending: isWrapping,
    error: wrapError,
  } = useWriteContract();

  // Unwrap vbETH to ETH
  const {
    writeContract: writeUnwrap,
    data: unwrapHash,
    isPending: isUnwrapping,
    error: unwrapError,
  } = useWriteContract();

  // Wait for wrap transaction
  const { isLoading: isWrapConfirming, isSuccess: isWrapSuccess } =
    useWaitForTransactionReceipt({
      hash: wrapHash,
    });

  // Wait for unwrap transaction
  const { isLoading: isUnwrapConfirming, isSuccess: isUnwrapSuccess } =
    useWaitForTransactionReceipt({
      hash: unwrapHash,
    });

  // Wrap ETH function
  const wrapETH = async (amount: string) => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    try {
      setError(null);
      const amountWei = parseEther(amount);

      // console.log('Wrapping ETH:', amount);

      await writeWrap({
        address: KATANA_TOKENS.vbETH,
        abi: vbETH_ABI,
        functionName: "deposit",
        args: [],
        value: amountWei,
      });
    } catch (err: any) {
      // console.error('Wrap error:', err);
      setError(err.message || "Failed to wrap ETH");
      throw err;
    }
  };

  // Unwrap vbETH function
  const unwrapVbETH = async (amount: string) => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    try {
      setError(null);
      const amountWei = parseEther(amount);

      // console.log('Unwrapping vbETH:', amount);

      await writeUnwrap({
        address: KATANA_TOKENS.vbETH,
        abi: vbETH_ABI,
        functionName: "burn",
        args: [address, amountWei],
      });
    } catch (err: any) {
      // console.error('Unwrap error:', err);
      setError(err.message || "Failed to unwrap vbETH");
      throw err;
    }
  };

  // Refetch balances after successful transactions
  if (isWrapSuccess || isUnwrapSuccess) {
    refetchETH();
    refetchVbETH();
  }

  return {
    // Balances
    ethBalance: ethBalance?.value || BigInt(0),
    wethBalance: vbEthBalance || BigInt(0), // Keep as wethBalance for compatibility
    vbEthBalance: vbEthBalance || BigInt(0),
    isLoadingBalances: isLoadingETH || isLoadingVbETH,

    // Wrap functions
    wrapETH,
    isWrapping: isWrapping || isWrapConfirming,
    wrapHash,
    isWrapSuccess,

    // Unwrap functions
    unwrapWETH: unwrapVbETH, // Keep old name for compatibility
    isUnwrapping: isUnwrapping || isUnwrapConfirming,
    unwrapHash,
    isUnwrapSuccess,

    // Error state
    error: error || wrapError?.message || unwrapError?.message,
    
    // Refetch functions
    refetchETH,
    refetchVbETH,
  };
}
