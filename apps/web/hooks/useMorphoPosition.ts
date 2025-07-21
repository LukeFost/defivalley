"use client";

import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { type Address } from "viem";
import { morpho_abi, morpho_katana_address } from '../../../packages/contracts/abi/morpho_abi';
import { MORPHO_VAULTS } from "@/constants/katana-tokens";
import { type VaultType } from "@/hooks/useMorphoDeposit";

// Market ID calculation helper (keccak256 of market params)
import { keccak256, encodeAbiParameters } from "viem";

const calculateMarketId = (marketParams: any): `0x${string}` => {
  // console.log("Calculating market ID for params:", marketParams);
  const id = keccak256(
    encodeAbiParameters(
      [
        { type: "address" },
        { type: "address" },
        { type: "address" },
        { type: "address" },
        { type: "uint256" },
      ],
      [
        marketParams.loanToken,
        marketParams.collateralToken,
        marketParams.oracle,
        marketParams.irm,
        BigInt(marketParams.lltv),
      ]
    )
  );
  return id;
};

// IRM ABI for getting borrow rate
const irmAbi = [
  {
    inputs: [
      {
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      {
        components: [
          { name: "totalSupplyAssets", type: "uint128" },
          { name: "totalSupplyShares", type: "uint128" },
          { name: "totalBorrowAssets", type: "uint128" },
          { name: "totalBorrowShares", type: "uint128" },
          { name: "lastUpdate", type: "uint128" },
          { name: "fee", type: "uint128" },
        ],
        internalType: "struct Market",
        name: "market",
        type: "tuple",
      },
    ],
    name: "borrowRateView",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function useMorphoPosition(vaultType: VaultType = "vbETH") {
  const { address } = useAccount();

  const marketParams = MORPHO_VAULTS[vaultType as keyof typeof MORPHO_VAULTS];
  const marketId = useMemo(
    () => calculateMarketId(marketParams),
    [marketParams]
  );
  // console.log(marketParams);
  // console.log("Market ID:", marketId);
  // Get market data
  const { data: marketData, isLoading: isLoadingMarket, refetch: refetchMarket } = useReadContract({
    address: morpho_katana_address as Address,
    abi: morpho_abi,
    functionName: "market",
    args: [marketId],
    query: {
      enabled: Boolean(marketId),
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });
  // console.log("Market data:", marketData);
  // Get user position
  const { data: positionData, isLoading: isLoadingPosition, refetch: refetchPosition } = useReadContract({
    address: morpho_katana_address as Address,
    abi: morpho_abi,
    functionName: "position",
    args: address ? [marketId, address] : undefined,
    query: {
      enabled: Boolean(marketId && address),
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  // Get borrow rate from IRM
  // console.log("Data", marketData, marketParams);
  const fixedMarketParams = {
    loanToken: marketParams.loanToken,
    collateralToken: marketParams.collateralToken,
    oracle: marketParams.oracle,
    irm: marketParams.irm, // Default IRM
    lltv: marketParams.lltv, // 86% = 86e16
  };
  console.log(marketData ? [fixedMarketParams, marketData] : undefined);
  console.log(marketParams.irm);
  const { data: borrowRateData, isLoading: isLoadingRate } = useReadContract({
    address: marketParams.irm as Address,
    abi: irmAbi,
    functionName: "borrowRateView",
    args: marketData ? [fixedMarketParams, marketData] : undefined,
    query: {
      enabled: Boolean(marketData && marketParams.irm),
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });
  console.log("Borrow rate data:", borrowRateData);
  // Calculate APY metrics
  const metrics = useMemo(() => {
    if (!marketData || !borrowRateData) {
      return {
        borrowRate: BigInt(0),
        borrowAPY: 0,
        utilization: 0,
        supplyAPY: 0,
        fee: 0,
        userSupplyAssets: BigInt(0),
        userSupplyValue: 0,
      };
    }

    const secondsPerYear = 365.25 * 24 * 60 * 60;
    const borrowRate = borrowRateData;

    // Calculate borrow APY: e^(borrowRate * secondsPerYear) - 1
    const borrowRatePerSecond = Number(borrowRate) / 1e18; // Convert from wei
    const borrowAPY = Math.exp(borrowRatePerSecond * secondsPerYear) - 1;

    // Calculate utilization: totalBorrowAssets / totalSupplyAssets
    const totalSupplyAssets = Number(marketData.totalSupplyAssets);
    const totalBorrowAssets = Number(marketData.totalBorrowAssets);
    const utilization =
      totalSupplyAssets > 0 ? totalBorrowAssets / totalSupplyAssets : 0;

    // Fee as percentage (fee is in wei, so divide by 1e18)
    const fee = Number(marketData.fee) / 1e18;

    // Calculate supply APY: borrowAPY * utilization * (1 - fee)
    const supplyAPY = borrowAPY * utilization * (1 - fee);

    // Calculate user's supply position in assets
    let userSupplyAssets = BigInt(0);
    if (
      positionData &&
      positionData.supplyShares > 0 &&
      marketData.totalSupplyShares > 0
    ) {
      // Convert shares to assets: (userShares * totalAssets) / totalShares
      userSupplyAssets =
        (positionData.supplyShares * marketData.totalSupplyAssets) /
        marketData.totalSupplyShares;
    }

    const userSupplyValue = Number(userSupplyAssets) / 1e6; // vbUSDC has 6 decimals

    return {
      borrowRate,
      borrowAPY,
      utilization,
      supplyAPY,
      fee,
      userSupplyAssets,
      userSupplyValue,
    };
  }, [marketData, borrowRateData, positionData]);

  const isLoading = isLoadingMarket || isLoadingPosition || isLoadingRate;

  return {
    // Market data
    marketData,
    marketId,

    // User position
    positionData,

    // Calculated metrics
    ...metrics,

    // Loading states
    isLoading,

    // Vault info
    vaultInfo: marketParams,

    // Refetch functions
    refetchMarket,
    refetchPosition,
  };
}
