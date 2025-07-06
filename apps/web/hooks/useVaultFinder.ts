"use client";

import { useReadContract } from "wagmi";
import { type Address } from "viem";
import { EULER_CONTRACTS, BASE_CHAIN_ID } from "@/constants/base-tokens";
import { vault_finder_abi } from "@/abi/euler_abi";
import type { VaultInfo } from "@/constants/base-tokens";

export function useVaultFinder() {
  // Get total number of vaults
  const { 
    data: totalVaults, 
    isLoading: isLoadingTotal,
    refetch: refetchTotal 
  } = useReadContract({
    address: EULER_CONTRACTS.VAULT_FINDER,
    abi: vault_finder_abi,
    functionName: "getTotalVaults",
    chainId: BASE_CHAIN_ID, // Base chain ID
  });

  // Get vault addresses (first 50 vaults)
  const { 
    data: vaultAddresses, 
    isLoading: isLoadingVaults,
    refetch: refetchVaults 
  } = useReadContract({
    address: EULER_CONTRACTS.VAULT_FINDER,
    abi: vault_finder_abi,
    functionName: "getVaults",
    args: [BigInt(0), totalVaults ? (totalVaults > BigInt(50) ? BigInt(50) : totalVaults) : BigInt(50)],
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: !!totalVaults,
    },
  });

  // Get vault info for discovered vaults
  const { 
    data: vaultsInfo, 
    isLoading: isLoadingInfo,
    refetch: refetchInfo 
  } = useReadContract({
    address: EULER_CONTRACTS.VAULT_FINDER,
    abi: vault_finder_abi,
    functionName: "getVaultsInfo",
    args: vaultAddresses ? [vaultAddresses] : [[]],
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: !!vaultAddresses && vaultAddresses.length > 0,
    },
  });

  // Find vaults by specific asset
  const findVaultsByAsset = (asset: Address) => {
    // This would need to be a separate hook call or state management
    // For now, filter from existing vaults info
    if (!vaultsInfo) return [];
    
    return vaultsInfo.filter((vault: VaultInfo) => 
      vault.asset.toLowerCase() === asset.toLowerCase()
    );
  };

  const refetchAll = async () => {
    console.log('🔄 Refreshing vault finder data...');
    await Promise.all([
      refetchTotal(),
      refetchVaults(),
      refetchInfo()
    ]);
    console.log('✅ Vault finder data refreshed');
  };

  return {
    // Data
    totalVaults: totalVaults || BigInt(0),
    vaultAddresses: vaultAddresses || [],
    vaultsInfo: vaultsInfo || [],
    
    // Loading states
    isLoading: isLoadingTotal || isLoadingVaults || isLoadingInfo,
    isLoadingTotal,
    isLoadingVaults,
    isLoadingInfo,
    
    // Utilities
    findVaultsByAsset,
    refetchAll,
    refetchTotal,
    refetchVaults,
    refetchInfo,
  };
}

// Hook for finding vaults by specific asset
export function useVaultsByAsset(asset: Address | undefined) {
  const { data: vaultAddresses, isLoading, refetch } = useReadContract({
    address: EULER_CONTRACTS.VAULT_FINDER,
    abi: vault_finder_abi,
    functionName: "findVaultsByAsset",
    args: asset ? [asset] : undefined,
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: !!asset,
    },
  });

  return {
    vaultAddresses: vaultAddresses || [],
    isLoading,
    refetch,
  };
}