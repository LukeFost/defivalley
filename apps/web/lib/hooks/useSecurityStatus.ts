import { useReadContract } from 'wagmi';
import { useConfig } from '../../app/store';
import { DeFiVaultABI } from '../../app/lib/abis/DeFiVault';

export interface SecurityStatus {
  isEmergency: boolean;
  activatedAt: number;
  reason: string;
  isPaused: boolean;
  totalDeposited: number;
  totalDepositCap: number;
  utilizationRate: number; // percentage of cap used
}

export function useSecurityStatus() {
  const config = useConfig();

  // Get emergency state
  const { data: emergencyData, isLoading: emergencyLoading } = useReadContract({
    address: config.defiVaultAddress,
    abi: DeFiVaultABI,
    functionName: 'getEmergencyState',
    query: {
      refetchInterval: 30000, // Check every 30 seconds
    },
  });

  // Get total deposited
  const { data: totalDeposited, isLoading: depositedLoading } = useReadContract({
    address: config.defiVaultAddress,
    abi: DeFiVaultABI,
    functionName: 'totalDeposited',
    query: {
      refetchInterval: 60000, // Check every minute
    },
  });

  // Get deposit cap
  const { data: depositCap, isLoading: capLoading } = useReadContract({
    address: config.defiVaultAddress,
    abi: DeFiVaultABI,
    functionName: 'totalDepositCap',
    query: {
      refetchInterval: 300000, // Check every 5 minutes (caps change less frequently)
    },
  });

  const isLoading = emergencyLoading || depositedLoading || capLoading;

  const securityStatus: SecurityStatus | undefined = 
    emergencyData && totalDeposited !== undefined && depositCap !== undefined
      ? {
          isEmergency: emergencyData[0],
          activatedAt: Number(emergencyData[1]),
          reason: emergencyData[2],
          isPaused: emergencyData[3],
          totalDeposited: Number(totalDeposited),
          totalDepositCap: Number(depositCap),
          utilizationRate: Number(depositCap) > 0 
            ? (Number(totalDeposited) / Number(depositCap)) * 100 
            : 0,
        }
      : undefined;

  return {
    securityStatus,
    isLoading,
  };
}