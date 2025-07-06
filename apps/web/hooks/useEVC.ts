"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { type Address } from "viem";
import { EULER_CONTRACTS, BASE_CHAIN_ID } from "@/constants/base-tokens";
import { ievc_abi } from "@/abi/euler_abi";

// EVC Batch Item type
interface BatchItem {
  targetContract: Address;
  onBehalfOfAccount: Address;
  value: bigint;
  data: `0x${string}`;
}

export function useEVC() {
  const { address } = useAccount();
  const [error, setError] = useState<string | null>(null);

  // Write contract for EVC operations
  const {
    writeContract: writeEVC,
    data: transactionHash,
    isPending: isExecuting,
    error: evcError,
  } = useWriteContract();

  // Wait for transaction confirmation
  const { 
    isLoading: isConfirming, 
    isSuccess: isSuccess 
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });

  // Check if collateral is enabled
  const { data: isCollateralEnabled, refetch: refetchCollateralStatus } = useReadContract({
    address: EULER_CONTRACTS.EVC,
    abi: ievc_abi,
    functionName: "isCollateralEnabled",
    args: address ? [address, EULER_CONTRACTS.EVC] : undefined, // Will be overridden when called
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: false, // Only call when explicitly requested
    },
  });

  // Check if controller is enabled  
  const { data: isControllerEnabled, refetch: refetchControllerStatus } = useReadContract({
    address: EULER_CONTRACTS.EVC,
    abi: ievc_abi,
    functionName: "isControllerEnabled",
    args: address ? [address, EULER_CONTRACTS.EVC] : undefined, // Will be overridden when called
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: false, // Only call when explicitly requested
    },
  });

  // Enable collateral for a vault
  const enableCollateral = async (vaultAddress: Address) => {
    if (!address) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setError(null);
      await writeEVC({
        address: EULER_CONTRACTS.EVC,
        abi: ievc_abi,
        functionName: "enableCollateral",
        args: [address, vaultAddress],
        chainId: BASE_CHAIN_ID,
      });
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to enable collateral");
      return null;
    }
  };

  // Disable collateral for a vault
  const disableCollateral = async (vaultAddress: Address) => {
    if (!address) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setError(null);
      await writeEVC({
        address: EULER_CONTRACTS.EVC,
        abi: ievc_abi,
        functionName: "disableCollateral",
        args: [address, vaultAddress],
        chainId: BASE_CHAIN_ID,
      });
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to disable collateral");
      return null;
    }
  };

  // Set account operator (authorize pool as operator)
  const setAccountOperator = async (operatorAddress: Address, authorized: boolean) => {
    if (!address) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setError(null);
      await writeEVC({
        address: EULER_CONTRACTS.EVC,
        abi: ievc_abi,
        functionName: "setAccountOperator",
        args: [address, operatorAddress, authorized],
        chainId: BASE_CHAIN_ID,
      });
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to set account operator");
      return null;
    }
  };

  // Execute batch operations
  const executeBatch = async (batchItems: BatchItem[]) => {
    if (!address) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setError(null);
      await writeEVC({
        address: EULER_CONTRACTS.EVC,
        abi: ievc_abi,
        functionName: "batch",
        args: [batchItems as any],
        chainId: BASE_CHAIN_ID,
      });
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to execute batch");
      return null;
    }
  };

  // Check collateral status for specific vault
  const checkCollateralStatus = async (vaultAddress: Address) => {
    if (!address) return false;
    
    try {
      const result = await refetchCollateralStatus();
      return result.data || false;
    } catch (err) {
      console.error("Failed to check collateral status:", err);
      return false;
    }
  };

  // Check controller status for specific vault
  const checkControllerStatus = async (vaultAddress: Address) => {
    if (!address) return false;
    
    try {
      const result = await refetchControllerStatus();
      return result.data || false;
    } catch (err) {
      console.error("Failed to check controller status:", err);
      return false;
    }
  };

  return {
    // Operations
    enableCollateral,
    disableCollateral,
    setAccountOperator,
    executeBatch,
    
    // Status checks
    checkCollateralStatus,
    checkControllerStatus,
    isCollateralEnabled,
    isControllerEnabled,
    
    // Transaction state
    isExecuting: isExecuting || isConfirming,
    isSuccess,
    transactionHash,
    
    // Error handling
    error: error || evcError?.message,
    
    // Utilities
    refetchCollateralStatus,
    refetchControllerStatus,
  };
}