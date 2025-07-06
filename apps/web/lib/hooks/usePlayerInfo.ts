import { useAccount, useReadContract } from 'wagmi';
import { useConfig } from '../../app/store';
import { GameControllerABI } from '../../app/lib/abis/GameController';

export interface PlayerInfo {
  isRegistered: boolean;
  totalSeeds: number;
  lastPlantTime: number;
  experience: number;
  seedCount: number;
}

export function usePlayerInfo() {
  const { address } = useAccount();
  const config = useConfig();

  const { data, isLoading, error, refetch } = useReadContract({
    address: config.gameControllerAddress,
    abi: GameControllerABI,
    functionName: 'getPlayerState',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const playerInfo: PlayerInfo | undefined = data ? {
    isRegistered: data[0],
    totalSeeds: Number(data[1]),
    lastPlantTime: Number(data[2]),
    experience: Number(data[3]),
    seedCount: Number(data[4]),
  } : undefined;

  return {
    playerInfo,
    isLoading,
    error,
    refetch,
  };
}