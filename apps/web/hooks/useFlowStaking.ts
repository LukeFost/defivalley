"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import { parseUnits, formatUnits, type Address } from "viem";
import { FLOW_TOKENS, FLOW_DEFI_CONFIG } from "@/constants/flow-tokens";

// ERC20 ABI for FVIX token
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
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ERC4626 Vault ABI for sFVIX staking
const erc4626Abi = [
  {
    inputs: [{ name: "assets", type: "uint256" }, { name: "receiver", type: "address" }],
    name: "deposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "shares", type: "uint256" }, { name: "receiver", type: "address" }, { name: "owner", type: "address" }],
    name: "redeem",
    outputs: [{ name: "assets", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "assets", type: "uint256" }],
    name: "convertToShares",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "convertToAssets",
    outputs: [{ name: "assets", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "assets", type: "uint256" }],
    name: "previewDeposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "previewRedeem",
    outputs: [{ name: "assets", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minimumDeposit",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const FVIX_ADDRESS = FLOW_TOKENS.FVIX;
const SFVIX_ADDRESS = FLOW_TOKENS.SFVIX;

export function useFlowStaking() {
  const { address, chain } = useAccount();
  const chainId = useChainId();
  const [error, setError] = useState<string | null>(null);
  const [approvalNeeded, setApprovalNeeded] = useState(false);

  // Read FVIX balance
  const {
    data: fvixBalance,
    isLoading: isLoadingBalance,
    refetch: refetchBalance,
  } = useReadContract({
    address: FVIX_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: chainId,
  });

  // Read sFVIX balance (staked amount)
  const {
    data: sFvixBalance,
    isLoading: isLoadingStakedBalance,
    refetch: refetchStakedBalance,
  } = useReadContract({
    address: SFVIX_ADDRESS,
    abi: erc4626Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: chainId,
  });

  // Read current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: FVIX_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, SFVIX_ADDRESS] : undefined,
    chainId: chainId,
  });

  // Read total assets in vault for APY calculation
  const { data: totalAssets } = useReadContract({
    address: SFVIX_ADDRESS,
    abi: erc4626Abi,
    functionName: "totalAssets",
    chainId: chainId,
  });

  // Read total supply for APY calculation
  const { data: totalSupply } = useReadContract({
    address: SFVIX_ADDRESS,
    abi: erc4626Abi,
    functionName: "totalSupply",
    chainId: chainId,
  });

  // Read minimum deposit from the contract
  const { data: minimumDeposit } = useReadContract({
    address: SFVIX_ADDRESS,
    abi: erc4626Abi,
    functionName: "minimumDeposit",
    chainId: chainId,
  });

  // Approve FVIX spending
  const {
    writeContract: writeApprove,
    data: approvalHash,
    isPending: isApproving,
    error: approvalError,
  } = useWriteContract();

  // Deposit FVIX to get sFVIX
  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositing,
    error: depositError,
  } = useWriteContract();

  // Withdraw (redeem) sFVIX to get FVIX back
  const {
    writeContract: writeRedeem,
    data: redeemHash,
    isPending: isRedeeming,
    error: redeemError,
  } = useWriteContract();

  // Wait for approval transaction
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({
      hash: approvalHash,
    });

  // Wait for deposit transaction
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({
      hash: depositHash,
    });

  // Wait for redeem transaction
  const { isLoading: isRedeemConfirming, isSuccess: isRedeemSuccess } =
    useWaitForTransactionReceipt({
      hash: redeemHash,
    });

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
        address: FVIX_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [SFVIX_ADDRESS, amount],
      });
    } catch (err: any) {
      setError(err.message || "Failed to approve FVIX");
      throw err;
    }
  };

  // Deposit function (stake FVIX)
  const deposit = async (amount: bigint) => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    // Check minimum stake amount from contract
    if (minimumDeposit && amount < minimumDeposit) {
      setError(`Minimum stake amount is ${formatUnits(minimumDeposit, 18)} FVIX.`);
      return;
    }

    try {
      setError(null);
      await writeDeposit({
        address: SFVIX_ADDRESS,
        abi: erc4626Abi,
        functionName: "deposit",
        args: [amount, address],
      });
    } catch (err: any) {
      setError(err.message || "Failed to stake FVIX");
      throw err;
    }
  };

  // Redeem function (unstake sFVIX)
  const redeem = async (shares: bigint) => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    try {
      setError(null);
      await writeRedeem({
        address: SFVIX_ADDRESS,
        abi: erc4626Abi,
        functionName: "redeem",
        args: [shares, address, address],
      });
    } catch (err: any) {
      setError(err.message || "Failed to unstake sFVIX");
      throw err;
    }
  };

  // Calculate current APY (simplified)
  const calculateAPY = (): number => {
    if (!totalAssets || !totalSupply || totalSupply === BigInt(0)) {
      return 0;
    }
    
    // This is a simplified calculation
    // In reality, you'd need historical data to calculate true APY
    const exchangeRate = Number(totalAssets) / Number(totalSupply);
    const baseAPY = Math.max(0, (exchangeRate - 1) * 100);
    
    return Math.min(baseAPY, 20); // Cap at 20% for display
  };

  // Calculate expected shares for a given FVIX amount
  const previewDeposit = async (assets: bigint): Promise<bigint> => {
    if (!totalAssets || !totalSupply || totalSupply === BigInt(0)) {
      return assets; // 1:1 ratio if no assets yet
    }
    
    return (assets * totalSupply) / totalAssets;
  };

  // Calculate expected FVIX for a given sFVIX amount
  const previewRedeem = async (shares: bigint): Promise<bigint> => {
    if (!totalAssets || !totalSupply || totalSupply === BigInt(0)) {
      return shares; // 1:1 ratio if no assets yet
    }
    
    return (shares * totalAssets) / totalSupply;
  };

  // Update error state from contract errors
  useEffect(() => {
    if (approvalError) {
      setError(approvalError.message || "Approval failed");
    }
    if (depositError) {
      setError(depositError.message || "Deposit failed");
    }
    if (redeemError) {
      setError(redeemError.message || "Redeem failed");
    }
  }, [approvalError, depositError, redeemError]);

  // Refetch balances after successful transactions
  useEffect(() => {
    if (isApprovalSuccess) {
      refetchAllowance();
      setApprovalNeeded(false);
    }
  }, [isApprovalSuccess, refetchAllowance]);

  useEffect(() => {
    if (isDepositSuccess) {
      refetchBalance();
      refetchStakedBalance();
      
      // Also trigger a refetch after a short delay
      setTimeout(() => {
        refetchBalance();
        refetchStakedBalance();
      }, 2000);
    }
  }, [isDepositSuccess, refetchBalance, refetchStakedBalance]);

  useEffect(() => {
    if (isRedeemSuccess) {
      refetchBalance();
      refetchStakedBalance();
      
      // Also trigger a refetch after a short delay
      setTimeout(() => {
        refetchBalance();
        refetchStakedBalance();
      }, 2000);
    }
  }, [isRedeemSuccess, refetchBalance, refetchStakedBalance]);

  return {
    // Balance data
    fvixBalance,
    sFvixBalance,
    isLoadingBalance,
    isLoadingStakedBalance,
    refetchBalance,
    refetchStakedBalance,

    // Approval functions
    approve,
    checkApproval,
    approvalNeeded,
    isApproving: isApproving || isApprovalConfirming,

    // Staking functions
    deposit,
    redeem,
    isDepositing: isDepositing || isDepositConfirming,
    isRedeeming: isRedeeming || isRedeemConfirming,

    // Vault data
    totalAssets,
    totalSupply,
    minimumDeposit,
    calculateAPY,
    previewDeposit,
    previewRedeem,

    // Transaction state
    error,
    depositHash,
    redeemHash,
    isDepositSuccess,
    isRedeemSuccess,
  };
}