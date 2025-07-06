// Flow Network Token Addresses and Protocol Configurations

import { type Address } from "viem";

// Native token address constant for clarity
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const;

// Main Flow tokens
export const FLOW_TOKENS = {
  // Native and wrapped tokens
  WFLOW: "0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e" as Address,
  FROTH: "0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA" as Address,
  FVIX: "0x00f4CE400130C9383115f3858F9CA54677426583" as Address,
  SFVIX: "0x2751dB789ab49e4f1CFA192831c19D8f40c708c9" as Address,
} as const;

// Protocol contract addresses
export const FLOW_PROTOCOLS = {
  PUNCHSWAP_V2_ROUTER: "0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d" as Address,
  PUMPFLOW_FACTORY: "0x576Be17F4dFa0E4964034e2E3dD29465B225B8d4" as Address,
} as const;

// DeFi protocol configurations
export const FLOW_DEFI_CONFIG = {
  // FROTH to FVIX conversion ratio
  FROTH_TO_FVIX_RATIO: 10000n, // 10,000 FROTH = 1 FVIX
  
  // PunchSwap configuration
  PUNCHSWAP: {
    router: FLOW_PROTOCOLS.PUNCHSWAP_V2_ROUTER,
    defaultDeadline: 1800, // 30 minutes
    defaultSlippage: 50, // 0.5%
  },
  
  // sFVIX staking configuration
  SFVIX_STAKING: {
    stakingToken: FLOW_TOKENS.FVIX,
    rewardToken: FLOW_TOKENS.SFVIX,
    stakingContract: FLOW_TOKENS.SFVIX, // ERC4626 vault
    minimumStake: BigInt("1000000000000000000"), // 1 FVIX minimum
  },
  
  // PumpFlow meme coin configuration
  PUMPFLOW: {
    factory: FLOW_PROTOCOLS.PUMPFLOW_FACTORY,
    defaultFundingTarget: BigInt("1000000000000000000000"), // 1000 FLOW
    creationFee: BigInt("100000000000000000"), // 0.1 FLOW
  },
} as const;

// Token metadata for UI display
export const FLOW_TOKEN_METADATA = {
  WFLOW: {
    name: "Wrapped Flow",
    symbol: "WFLOW",
    decimals: 18,
    description: "Wrapped version of native FLOW token",
  },
  FROTH: {
    name: "Froth",
    symbol: "FROTH",
    decimals: 18,
    description: "Intermediate token for FVIX conversion",
  },
  FVIX: {
    name: "FVIX",
    symbol: "FVIX",
    decimals: 18,
    description: "Stakeable token for yield generation",
  },
  SFVIX: {
    name: "Staked FVIX",
    symbol: "sFVIX",
    decimals: 18,
    description: "Yield-bearing staked FVIX token",
  },
} as const;