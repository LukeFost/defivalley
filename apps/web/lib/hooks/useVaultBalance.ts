import { useAccount, useReadContract } from 'wagmi';
import { useConfig } from '../../app/store';
import { DeFiVaultABI } from '../../app/lib/abis/DeFiVault';

export interface PlayerPosition {
  depositedAmount: number;
  lastYieldClaim: number;
  totalYieldEarned: number;
  isActive: boolean;
}

export interface VaultBalance {
  position: PlayerPosition;
  availableYield: number;
}

export function useVaultBalance() {
  const { address } = useAccount();
  const config = useConfig();

  const { data, isLoading, error, refetch } = useReadContract({
    address: config.defiVaultAddress,
    abi: DeFiVaultABI,
    functionName: 'getPlayerPosition',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      // Refetch every 60 seconds to check for yield updates
      refetchInterval: 60000,
    },
  });

  const vaultBalance: VaultBalance | undefined = data ? {
    position: {
      depositedAmount: Number(data[0].depositedAmount),
      lastYieldClaim: Number(data[0].lastYieldClaim),
      totalYieldEarned: Number(data[0].totalYieldEarned),
      isActive: data[0].isActive,
    },
    availableYield: Number(data[1]),
  } : undefined;

  return {
    vaultBalance,
    isLoading,
    error,
    refetch,
  };
}