"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { type Address, parseUnits, formatUnits } from "viem";
import { BASE_CHAIN_ID, EULER_CONTRACTS, BASE_TOKENS } from "@/constants/base-tokens";
import { eulerSwapFactoryAbi } from "@/abi/eulerswap-factory-abi";
import { ievc_abi, ievault_abi } from "@/abi/euler_abi";

// EulerSwap Factory address on Base
const EULERSWAP_FACTORY = "0xf0CFe22d23699ff1B2CFe6B8f706A6DB63911262" as Address;
const EULERSWAP_PERIPHERY = "0x18e5F5C1ff5e905b32CE860576031AE90E1d1336" as Address;

// Vault addresses on Base
const WETH_VAULT = "0x859160DB5841E5cfB8D3f144C6b3381A85A4b410" as Address; // eWETH-1
const USDC_VAULT = "0x0A1a3b5f2041F33522C4efc754a7D096f880eE16" as Address; // eUSDC-1

interface PoolParams {
  vault0: Address;
  vault1: Address;
  eulerAccount: Address;
  equilibriumReserve0: bigint;
  equilibriumReserve1: bigint;
  priceX: bigint;
  priceY: bigint;
  concentrationX: bigint;
  concentrationY: bigint;
  fee: bigint;
  protocolFee: bigint;
  protocolFeeRecipient: Address;
}

interface InitialState {
  currReserve0: bigint;
  currReserve1: bigint;
}

export function useEulerSwapPool() {
  const { address } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  // Read protocol fee from factory
  const { data: protocolFee } = useReadContract({
    address: EULERSWAP_FACTORY,
    abi: eulerSwapFactoryAbi,
    functionName: "protocolFee",
    chainId: BASE_CHAIN_ID,
  });

  // Read protocol fee recipient
  const { data: protocolFeeRecipient } = useReadContract({
    address: EULERSWAP_FACTORY,
    abi: eulerSwapFactoryAbi,
    functionName: "protocolFeeRecipient",
    chainId: BASE_CHAIN_ID,
  });

  // Check if user has a pool deployed
  const { data: userPool, refetch: refetchUserPool } = useReadContract({
    address: EULERSWAP_FACTORY,
    abi: eulerSwapFactoryAbi,
    functionName: "poolByEulerAccount",
    args: address ? [address] : undefined,
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: !!address,
    },
  });

  // Write contract for pool deployment
  const {
    writeContract: writeDeployPool,
    data: deployTxHash,
    isPending: isDeployPending,
    error: deployError,
  } = useWriteContract();

  // Wait for deployment transaction
  const { 
    isLoading: isDeployConfirming, 
    isSuccess: isDeploySuccess 
  } = useWaitForTransactionReceipt({
    hash: deployTxHash,
  });

  // Write contract for EVC operations
  const {
    writeContract: writeEVC,
    data: evcTxHash,
    isPending: isEVCPending,
  } = useWriteContract();

  // Deploy WETH/USDC pool with default parameters
  const deployDefaultPool = async (wethAmount: string, usdcAmount: string) => {
    if (!address || !protocolFee || !protocolFeeRecipient) {
      setError("Missing required data");
      return null;
    }

    try {
      setError(null);
      setIsDeploying(true);

      // Convert amounts to proper units
      const wethReserve = parseUnits(wethAmount, 18);
      const usdcReserve = parseUnits(usdcAmount, 6);

      // Create pool parameters
      const poolParams: PoolParams = {
        vault0: WETH_VAULT,
        vault1: USDC_VAULT,
        eulerAccount: address,
        equilibriumReserve0: wethReserve,
        equilibriumReserve1: usdcReserve,
        priceX: BigInt(1e18), // 1:1 price ratio
        priceY: BigInt(1e18),
        concentrationX: parseUnits("0.97", 18), // 97% concentration
        concentrationY: parseUnits("0.97", 18),
        fee: parseUnits("0.003", 18), // 0.3% fee
        protocolFee: protocolFee,
        protocolFeeRecipient: protocolFeeRecipient,
      };

      const initialState: InitialState = {
        currReserve0: wethReserve,
        currReserve1: usdcReserve,
      };

      // For now, use a simple salt (could implement HookMiner logic later)
      const salt = "0x0000000000000000000000000000000000000000000000000000000000000001" as `0x${string}`;

      console.log("🚀 Deploying EulerSwap pool with params:", {
        wethAmount: formatUnits(wethReserve, 18),
        usdcAmount: formatUnits(usdcReserve, 6),
      });

      await writeDeployPool({
        address: EULERSWAP_FACTORY,
        abi: eulerSwapFactoryAbi,
        functionName: "deployPool",
        args: [poolParams, initialState, salt],
        chainId: BASE_CHAIN_ID,
      });

      return true;
    } catch (err: any) {
      console.error("Pool deployment error:", err);
      setError(err.message || "Failed to deploy pool");
      setIsDeploying(false);
      return null;
    }
  };

  // Enable vault as collateral
  const enableVaultCollateral = async (vaultAddress: Address) => {
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

  // Set pool as account operator
  const authorizePoolOperator = async (poolAddress: Address) => {
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
        args: [address, poolAddress, true],
        chainId: BASE_CHAIN_ID,
      });
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to authorize pool");
      return null;
    }
  };

  // Batch EVC operations for pool setup
  const setupPoolWithEVC = async (wethAmount: string, usdcAmount: string) => {
    if (!address) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setError(null);
      
      // First enable collaterals
      console.log("🔐 Enabling vaults as collateral...");
      await enableVaultCollateral(WETH_VAULT);
      await enableVaultCollateral(USDC_VAULT);
      
      // Then deploy pool
      console.log("🏊 Deploying pool...");
      const result = await deployDefaultPool(wethAmount, usdcAmount);
      
      return result;
    } catch (err: any) {
      console.error("Pool setup error:", err);
      setError(err.message || "Failed to setup pool");
      return null;
    }
  };

  // Effect to update deployment status
  useEffect(() => {
    if (isDeploySuccess) {
      console.log("✅ Pool deployed successfully!");
      setIsDeploying(false);
      refetchUserPool();
    }
  }, [isDeploySuccess]);

  return {
    // Pool data
    userPool,
    hasPool: !!userPool && userPool !== "0x0000000000000000000000000000000000000000",
    
    // Deployment functions
    deployDefaultPool,
    setupPoolWithEVC,
    enableVaultCollateral,
    authorizePoolOperator,
    
    // State
    isDeploying: isDeploying || isDeployPending || isDeployConfirming || isEVCPending,
    isSuccess: isDeploySuccess,
    deployTxHash,
    
    // Error handling
    error: error || deployError?.message,
    
    // Utilities
    refetchUserPool,
    
    // Constants
    WETH_VAULT,
    USDC_VAULT,
    EULERSWAP_FACTORY,
    EULERSWAP_PERIPHERY,
  };
}