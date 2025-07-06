"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, type Address } from "viem";
import { morpho_abi, morpho_katana_address } from "@/abi/morpho_abi";
import { KATANA_TOKENS, MORPHO_VAULTS } from "@/constants/katana-tokens";

// vbUSDC address on Katana (bridged USDC for lending)
const vbUSDC_ADDRESS = KATANA_TOKENS.vbUSDC;

// Simple ERC20 ABI for USDC
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

export type VaultType = "vbETH" | "POL";

export function useMorphoDeposit() {
  const { address, chain } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  const [selectedVault, setSelectedVault] = useState<VaultType>("vbETH");

  // Read vbUSDC balance
  // console.log("=== MORPHO DEPOSIT HOOK DEBUG ===");
  // console.log("Reading vbUSDC balance for address:", address);
  // console.log("Current chain:", chain);
  // console.log("Chain ID:", chain?.id);
  // console.log("Chain Name:", chain?.name);
  // console.log("Using vbUSDC address:", vbUSDC_ADDRESS);
  // console.log("Expected Katana chain ID:", 747474);
  // console.log("==================================");
  const {
    data: vbUsdcBalance,
    isLoading: isLoadingBalance,
    refetch: refetchBalance,
  } = useReadContract({
    address: vbUSDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 747474, // Explicitly specify Katana chain ID
  });
  // console.log("vbUSDC balance data:", vbUsdcBalance);
  // console.log("Balance loading:", isLoadingBalance);
  // console.log("Balance in readable format:", vbUsdcBalance ? Number(vbUsdcBalance) / 1e6 : 0);
  // Read current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract(
    {
      address: vbUSDC_ADDRESS,
      abi: erc20Abi,
      functionName: "allowance",
      args: address ? [address, morpho_katana_address as Address] : undefined,
      chainId: 747474, // Explicitly specify Katana chain ID
    }
  );

  // Approve USDC spending
  const {
    writeContract: writeApprove,
    data: approvalHash,
    isPending: isApproving,
    error: approvalError,
  } = useWriteContract();

  // Supply to Morpho
  const {
    writeContract: writeSupply,
    data: supplyHash,
    isPending: isDepositing,
    error: depositError,
  } = useWriteContract();

  // Wait for approval transaction
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } =
    useWaitForTransactionReceipt({
      hash: approvalHash,
    });

  // Wait for supply transaction
  const { isLoading: isSupplyConfirming, isSuccess: isSupplySuccess } =
    useWaitForTransactionReceipt({
      hash: supplyHash,
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
      // console.log("Approving vbUSDC spend:", amount);

      await writeApprove({
        address: vbUSDC_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [morpho_katana_address as Address, amount],
      });
    } catch (err: any) {
      // console.error("Approval error:", err);
      setError(err.message || "Failed to approve vbUSDC");
      throw err;
    }
  };

  // Deposit function
  const deposit = async (
    amount: bigint,
    vaultType: VaultType = selectedVault
  ) => {
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    try {
      setError(null);
      // console.log(`Depositing to Morpho ${vaultType} vault:`, amount);

      // Get market parameters based on selected vault
      const vault = MORPHO_VAULTS[vaultType];
      const marketParams = {
        loanToken: vault.loanToken,
        collateralToken: vault.collateralToken,
        oracle: vault.oracle,
        irm: vault.irm,
        lltv: vault.lltv,
      };

      await writeSupply({
        address: morpho_katana_address as Address,
        abi: morpho_abi,
        functionName: "supply",
        args: [
          marketParams,
          amount,
          BigInt(0), // Let Morpho calculate shares
          address,
          "0x" as `0x${string}`, // No callback data
        ],
      });
    } catch (err: any) {
      // console.error("Deposit error:", err);
      setError(err.message || "Failed to deposit to Morpho");
      throw err;
    }
  };

  // Update error state from contract errors
  useEffect(() => {
    if (approvalError) {
      setError(approvalError.message || "Approval failed");
    }
    if (depositError) {
      setError(depositError.message || "Deposit failed");
    }
  }, [approvalError, depositError]);

  // Refetch balances after successful transactions
  useEffect(() => {
    if (isApprovalSuccess) {
      refetchAllowance();
      setApprovalNeeded(false);
    }
  }, [isApprovalSuccess, refetchAllowance]);

  useEffect(() => {
    if (isSupplySuccess) {
      // Refetch token balance immediately
      refetchBalance();
      
      // Also trigger a refetch after a short delay to ensure blockchain state is updated
      setTimeout(() => {
        refetchBalance();
      }, 2000);
    }
  }, [isSupplySuccess, refetchBalance]);

  return {
    // Balance data
    vbUsdcBalance,
    isLoadingBalance,

    // Approval functions
    approve,
    checkApproval,
    approvalNeeded,
    isApproving: isApproving || isApprovalConfirming,

    // Deposit functions
    deposit,
    isDepositing: isDepositing || isSupplyConfirming,

    // Vault selection
    selectedVault,
    setSelectedVault,

    // Transaction state
    error,
    txHash: supplyHash,
    isSuccess: isSupplySuccess,
  };
}
