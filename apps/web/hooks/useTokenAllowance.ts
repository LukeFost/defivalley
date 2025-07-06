"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address } from "viem";
import { useState, useEffect } from "react";

// Standard ERC20 ABI for allowance and approve
const erc20Abi = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Default SushiSwap RouteProcessor address
const DEFAULT_SUSHI_ROUTE_PROCESSOR = "0xAC4c6e212A361c968F1725b4d055b47E63F80b75" as Address;

export function useTokenAllowance(tokenAddress: Address, spenderAddress?: Address) {
  const { address } = useAccount();
  const [error, setError] = useState<string | null>(null);
  
  // Use provided spender or default to SushiSwap RouteProcessor
  const spender = spenderAddress || DEFAULT_SUSHI_ROUTE_PROCESSOR;

  // Read current allowance
  const { 
    data: allowance, 
    isLoading: isLoadingAllowance,
    refetch: refetchAllowance 
  } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, spender] : undefined,
    query: {
      enabled: Boolean(address && tokenAddress),
    },
  });

  // Approve contract
  const {
    writeContract: writeApprove,
    data: approvalHash,
    isPending: isApproving,
    error: approvalError,
  } = useWriteContract();

  // Wait for approval transaction
  const { 
    isLoading: isApprovalConfirming, 
    isSuccess: isApprovalSuccess 
  } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });

  // Check if approval is needed for a specific amount
  const checkApprovalNeeded = (amount: bigint): boolean => {
    if (!allowance) return true;
    return allowance < amount;
  };

  // Approve function
  const approve = async (amount: bigint) => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    try {
      setError(null);
      await writeApprove({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, amount],
      });
    } catch (err: any) {
      setError(err.message || "Failed to approve token");
      throw err;
    }
  };

  // Approve unlimited amount (max uint256)
  const approveMax = async () => {
    const maxAmount = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    return approve(maxAmount);
  };

  // Update error state from contract errors
  useEffect(() => {
    if (approvalError) {
      setError(approvalError.message || "Approval failed");
    }
  }, [approvalError]);

  // Refetch allowance after successful approval
  useEffect(() => {
    if (isApprovalSuccess) {
      refetchAllowance();
    }
  }, [isApprovalSuccess, refetchAllowance]);

  // Poll allowance while approval is pending
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isApproving && !isApprovalSuccess) {
      // Poll every 3 seconds while approval is pending
      interval = setInterval(() => {
        console.log("Polling allowance during approval...");
        refetchAllowance();
      }, 3000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isApproving, isApprovalSuccess, refetchAllowance]);

  return {
    // Allowance data
    allowance: allowance || BigInt(0),
    isLoadingAllowance,
    
    // Approval functions
    approve,
    approveMax,
    checkApprovalNeeded,
    
    // Transaction state
    isApproving: isApproving || isApprovalConfirming,
    approvalHash,
    isApprovalSuccess,
    
    // Error handling
    error,
    
    // Utilities
    spenderAddress: spender,
    refetchAllowance,
  };
}