"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { type Address } from "viem";
import { FLOW_TOKENS, FLOW_DEFI_CONFIG } from "@/constants/flow-tokens";

// ERC20 ABI for FROTH token
const erc20Abi = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
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
] as const;

// FVIX Minting Contract ABI (simplified)
// This assumes there's a contract that handles FROTH -> FVIX conversion
const fvixMintingAbi = [
  {
    inputs: [{ name: "frothAmount", type: "uint256" }],
    name: "mintFVIX",
    outputs: [{ name: "fvixAmount", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "frothAmount", type: "uint256" }],
    name: "getFVIXOutput",
    outputs: [{ name: "fvixAmount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const FROTH_ADDRESS = FLOW_TOKENS.FROTH;
const FVIX_ADDRESS = FLOW_TOKENS.FVIX;

// Note: This would need to be the actual FVIX minting contract address
// For now, using FVIX address as placeholder
const FVIX_MINTING_CONTRACT = FVIX_ADDRESS;

export function useFrothToFvix() {
  const { address } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [approvalNeeded, setApprovalNeeded] = useState(false);

  // Read FROTH balance
  const {
    data: frothBalance,
    isLoading: isLoadingFrothBalance,
    refetch: refetchFrothBalance,
  } = useReadContract({
    address: FROTH_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 747, // Flow mainnet chain ID
  });

  // Read FVIX balance
  const {
    data: fvixBalance,
    isLoading: isLoadingFvixBalance,
    refetch: refetchFvixBalance,
  } = useReadContract({
    address: FVIX_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 747,
  });

  // Read current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: FROTH_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, FVIX_MINTING_CONTRACT] : undefined,
    chainId: 747,
  });

  // Approve FROTH spending
  const {
    writeContract: writeApprove,
    data: approvalHash,
    isPending: isApproving,
    error: approvalError,
  } = useWriteContract();

  // Convert FROTH to FVIX
  const {
    writeContract: writeConvert,
    data: convertHash,
    isPending: isConverting,
    error: convertError,
  } = useWriteContract();

  // Wait for approval transaction
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({
      hash: approvalHash,
    });

  // Wait for conversion transaction
  const { isLoading: isConvertConfirming, isSuccess: isConvertSuccess } =
    useWaitForTransactionReceipt({
      hash: convertHash,
    });

  // Calculate FVIX output for given FROTH input
  const calculateFvixOutput = (frothAmount: bigint): bigint => {
    // 10,000 FROTH = 1 FVIX
    return frothAmount / FLOW_DEFI_CONFIG.FROTH_TO_FVIX_RATIO;
  };

  // Calculate FROTH needed for given FVIX output
  const calculateFrothNeeded = (fvixAmount: bigint): bigint => {
    // 1 FVIX = 10,000 FROTH
    return fvixAmount * FLOW_DEFI_CONFIG.FROTH_TO_FVIX_RATIO;
  };

  // Check if approval is needed
  const checkApproval = async (amount: bigint): Promise<boolean> => {
    if (!address) return false;

    const allowance = currentAllowance || BigInt(0);
    const needsApproval = allowance < amount;
    setApprovalNeeded(needsApproval);
    return needsApproval;
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
        address: FROTH_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [FVIX_MINTING_CONTRACT, amount],
      });
    } catch (err: any) {
      setError(err.message || "Failed to approve FROTH");
      throw err;
    }
  };

  // Convert function (FROTH to FVIX)
  const convert = async (frothAmount: bigint) => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    // Check minimum conversion amount (must be at least 10,000 FROTH for 1 FVIX)
    if (frothAmount < FLOW_DEFI_CONFIG.FROTH_TO_FVIX_RATIO) {
      setError(`Minimum conversion is ${FLOW_DEFI_CONFIG.FROTH_TO_FVIX_RATIO} FROTH`);
      return;
    }

    // Check if amount is divisible by conversion ratio
    if (frothAmount % FLOW_DEFI_CONFIG.FROTH_TO_FVIX_RATIO !== BigInt(0)) {
      setError("FROTH amount must be divisible by 10,000");
      return;
    }

    try {
      setError(null);
      
      // For now, we'll simulate the conversion by calling a minting function
      // In reality, this would be a specific contract call
      await writeConvert({
        address: FVIX_MINTING_CONTRACT,
        abi: fvixMintingAbi,
        functionName: "mintFVIX",
        args: [frothAmount],
      });
    } catch (err: any) {
      setError(err.message || "Failed to convert FROTH to FVIX");
      throw err;
    }
  };

  // Get maximum convertible FROTH amount
  const getMaxConvertibleFroth = (): bigint => {
    if (!frothBalance) return BigInt(0);
    
    // Round down to nearest multiple of 10,000
    const maxFvix = frothBalance / FLOW_DEFI_CONFIG.FROTH_TO_FVIX_RATIO;
    return maxFvix * FLOW_DEFI_CONFIG.FROTH_TO_FVIX_RATIO;
  };

  // Update error state from contract errors
  useEffect(() => {
    if (approvalError) {
      setError(approvalError.message || "Approval failed");
    }
    if (convertError) {
      setError(convertError.message || "Conversion failed");
    }
  }, [approvalError, convertError]);

  // Refetch balances after successful transactions
  useEffect(() => {
    if (isApprovalSuccess) {
      refetchAllowance();
      setApprovalNeeded(false);
    }
  }, [isApprovalSuccess, refetchAllowance]);

  useEffect(() => {
    if (isConvertSuccess) {
      refetchFrothBalance();
      refetchFvixBalance();
      
      // Also trigger a refetch after a short delay
      setTimeout(() => {
        refetchFrothBalance();
        refetchFvixBalance();
      }, 2000);
    }
  }, [isConvertSuccess, refetchFrothBalance, refetchFvixBalance]);

  return {
    // Balance data
    frothBalance,
    fvixBalance,
    isLoadingFrothBalance,
    isLoadingFvixBalance,

    // Approval functions
    approve,
    checkApproval,
    approvalNeeded,
    isApproving: isApproving || isApprovalConfirming,

    // Conversion functions
    convert,
    isConverting: isConverting || isConvertConfirming,
    calculateFvixOutput,
    calculateFrothNeeded,
    getMaxConvertibleFroth,

    // Constants
    conversionRatio: FLOW_DEFI_CONFIG.FROTH_TO_FVIX_RATIO,

    // Transaction state
    error,
    convertHash,
    isConvertSuccess,
  };
}