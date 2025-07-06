import { useAccount, useReadContract } from 'wagmi';
import { useConfig } from '../../app/store';
import { GameControllerABI } from '../../app/lib/abis/GameController';

export interface HarvestableSeeds {
  seedIds: number[];
  totalHarvestableAmount: number;
  totalEstimatedYield: number;
}

export function useHarvestableSeeds() {
  const { address } = useAccount();
  const config = useConfig();

  const { data, isLoading, error, refetch } = useReadContract({
    address: config.gameControllerAddress,
    abi: GameControllerABI,
    functionName: 'getHarvestableSeeds',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      // Refetch every 30 seconds to check for newly mature seeds
      refetchInterval: 30000,
    },
  });

  const harvestableSeeds: HarvestableSeeds | undefined = data ? {
    seedIds: data[0].map((id: bigint) => Number(id)),
    totalHarvestableAmount: Number(data[1]),
    totalEstimatedYield: Number(data[2]),
  } : undefined;

  return {
    harvestableSeeds,
    isLoading,
    error,
    refetch,
  };
}