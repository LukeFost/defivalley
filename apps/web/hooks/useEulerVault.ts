"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { type Address, parseUnits } from "viem";
import { ievault_abi } from "@/abi/euler_abi";
import { BASE_CHAIN_ID } from "@/constants/base-tokens";

export function useEulerVault(vaultAddress: Address | undefined) {
  const { address } = useAccount();
  const [error, setError] = useState<string | null>(null);

  // Check if ABI is loaded properly
  if (!ievault_abi || !Array.isArray(ievault_abi)) {
    console.error('❌ ievault_abi not loaded properly:', ievault_abi);
    return {
      assetAddress: undefined,
      vaultBalance: BigInt(0),
      totalAssets: BigInt(0),
      totalSupply: BigInt(0),
      assetsFromShares: BigInt(0),
      deposit: async () => null,
      withdraw: async () => null,
      redeem: async () => null,
      convertAssetsToShares: async () => BigInt(0),
      isExecuting: false,
      isSuccess: false,
      transactionHash: undefined,
      error: "ABI not loaded properly",
      refetchAll: async () => {},
      refetchVaultBalance: async () => {},
      refetchTotalAssets: async () => {},
      refetchTotalSupply: async () => {},
    };
  }

  // Write contract for vault operations
  const {
    writeContract: writeVault,
    data: transactionHash,
    isPending: isExecuting,
    error: vaultError,
  } = useWriteContract();

  // Wait for transaction confirmation
  const { 
    isLoading: isConfirming, 
    isSuccess: isSuccess 
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });

  // Define refetchAll function first
  const refetchAll = async () => {
    console.log('🔄 Refreshing vault data...');
    await Promise.all([
      refetchAsset(),
      refetchVaultBalance(),
      refetchTotalAssets(),
      refetchTotalSupply(),
      refetchAssetsFromShares(),
    ]);
    console.log('✅ Vault data refreshed');
  };

  // Auto-refresh data when transaction succeeds
  useEffect(() => {
    if (isSuccess && vaultAddress) {
      console.log('🔄 Transaction successful, refreshing vault data...');
      // Small delay to allow blockchain state to update
      setTimeout(() => {
        refetchAll();
      }, 1000);
    }
  }, [isSuccess, vaultAddress]);

  // Get vault asset address
  const { data: assetAddress, refetch: refetchAsset } = useReadContract({
    address: vaultAddress,
    abi: ievault_abi,
    functionName: "asset",
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: !!vaultAddress,
    },
  });

  // Get vault balance (shares)
  const { data: vaultBalance, refetch: refetchVaultBalance } = useReadContract({
    address: vaultAddress,
    abi: ievault_abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: !!vaultAddress && !!address,
    },
  });

  // Get total assets in vault
  const { data: totalAssets, refetch: refetchTotalAssets } = useReadContract({
    address: vaultAddress,
    abi: ievault_abi,
    functionName: "totalAssets",
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: !!vaultAddress,
    },
  });

  // Get total shares in vault
  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: vaultAddress,
    abi: ievault_abi,
    functionName: "totalSupply",
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: !!vaultAddress,
    },
  });

  // Convert shares to assets
  const { data: assetsFromShares, refetch: refetchAssetsFromShares } = useReadContract({
    address: vaultAddress,
    abi: ievault_abi,
    functionName: "convertToAssets",
    args: vaultBalance ? [vaultBalance] : [BigInt(0)],
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: !!vaultAddress && !!vaultBalance,
    },
  });

  // Convert assets to shares  
  const convertAssetsToShares = async (assets: bigint) => {
    if (!vaultAddress || !assets) return BigInt(0);
    
    try {
      // This would need a separate read contract call or state management
      // For now, approximate using total assets/supply ratio
      if (totalAssets && totalSupply && totalAssets > 0) {
        return (assets * totalSupply) / totalAssets;
      }
      return assets; // 1:1 if no data
    } catch (err) {
      console.error("Failed to convert assets to shares:", err);
      return BigInt(0);
    }
  };

  // Deposit assets into vault
  const deposit = async (amount: string, decimals: number = 18) => {
    if (!address || !vaultAddress) {
      setError("Wallet not connected or vault not specified");
      return null;
    }

    try {
      setError(null);
      const amountBigInt = parseUnits(amount, decimals);
      
      await writeVault({
        address: vaultAddress,
        abi: ievault_abi,
        functionName: "deposit",
        args: [amountBigInt, address],
        chainId: BASE_CHAIN_ID,
      });
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to deposit");
      return null;
    }
  };

  // Withdraw assets from vault
  const withdraw = async (amount: string, decimals: number = 18) => {
    if (!address || !vaultAddress) {
      setError("Wallet not connected or vault not specified");
      return null;
    }

    try {
      setError(null);
      const amountBigInt = parseUnits(amount, decimals);
      
      await writeVault({
        address: vaultAddress,
        abi: ievault_abi,
        functionName: "withdraw",
        args: [amountBigInt, address, address],
        chainId: BASE_CHAIN_ID,
      });
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to withdraw");
      return null;
    }
  };

  // Redeem shares from vault
  const redeem = async (shares: string, decimals: number = 18) => {
    if (!address || !vaultAddress) {
      setError("Wallet not connected or vault not specified");
      return null;
    }

    try {
      setError(null);
      const sharesBigInt = parseUnits(shares, decimals);
      
      await writeVault({
        address: vaultAddress,
        abi: ievault_abi,
        functionName: "redeem",
        args: [sharesBigInt, address, address],
        chainId: BASE_CHAIN_ID,
      });
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to redeem");
      return null;
    }
  };


  return {
    // Vault data
    assetAddress,
    vaultBalance: vaultBalance || BigInt(0),
    totalAssets: totalAssets || BigInt(0),
    totalSupply: totalSupply || BigInt(0),
    assetsFromShares: assetsFromShares || BigInt(0),
    
    // Operations
    deposit,
    withdraw,
    redeem,
    convertAssetsToShares,
    
    // Transaction state
    isExecuting: isExecuting || isConfirming,
    isSuccess,
    transactionHash,
    
    // Error handling
    error: error || vaultError?.message,
    
    // Utilities
    refetchAll,
    refetchVaultBalance,
    refetchTotalAssets,
    refetchTotalSupply,
  };
}