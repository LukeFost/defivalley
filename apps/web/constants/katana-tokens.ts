// Katana Network Token Addresses and Vault Configurations

import { type Address } from "viem";

// Token Addresses
export const KATANA_TOKENS = {
  // Main tokens
  vbUSDC: "0x203A662b0BD271A6ed5a60EdFbd04bFce608FD36" as Address, // Bridged USDC (lending token)
  vbETH: "0xEE7D8BCFb72bC1880D0Cf19822eB0A2e6577aB62" as Address, // Bridged ETH (collateral)
  POL: "0xb24e3035d1FCBC0E43CF3143C3Fd92E53df2009b" as Address, // POL token (collateral)

  // Other tokens for reference
  AgoraUSD: "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC" as Address,
  WETH: "0x17B8Ee96E3bcB3b04b3e8334de4524520C51caB4" as Address,
} as const;

// Morpho Vault Configurations
export const MORPHO_VAULTS = {
  vbETH: {
    name: "vbUSDC lent for vbETH",
    loanToken: KATANA_TOKENS.vbUSDC,
    collateralToken: KATANA_TOKENS.vbETH,
    oracle: "0xD423D353f890aD0D18532fFaf5c47B0Cb943bf47" as Address,
    irm: "0x4F708C0ae7deD3d74736594C2109C2E3c065B428" as Address, // Default IRM
    lltv: BigInt("860000000000000000"), // 86% = 86e16
    description: "Lend vbUSDC against vbETH collateral (86% LLTV)",
  },
  POL: {
    name: "vbUSDC lent for POL",
    loanToken: KATANA_TOKENS.vbUSDC,
    collateralToken: KATANA_TOKENS.POL,
    oracle: "0x8b99035AF467A46c4B208B00348ad9456177d76E" as Address,
    irm: "0x4F708C0ae7deD3d74736594C2109C2E3c065B428" as Address, // Default IRM
    lltv: BigInt("770000000000000000"), // 77% = 77e16
    description: "Lend vbUSDC against POL collateral (77% LLTV)",
  },
} as const;
