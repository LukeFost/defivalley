// Flow Blockchain Token Addresses and Router Configuration
// Based on test/FlowSwap.ts and interface definitions

export const FLOW_TOKEN = "0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e";  // WFLOW (Wrapped Flow)
export const FROTH_TOKEN = "0xB73BF8e6A4477a952E0338e6CC00cC0ce5AD04bA";
export const FVIX_TOKEN = "0x00f4CE400130C9383115f3858F9CA54677426583";
export const sFVIX_TOKEN = "0x2751dB789ab49e4f1CFA192831c19D8f40c708c9";
export const PUNCHSWAP_V2_ROUTER = "0xf45AFe28fd5519d5f8C1d4787a4D5f724C0eFa4d";

// FROTH threshold for FVIX minting (10,000 FROTH with 18 decimals)
export const FROTH_THRESHOLD = BigInt(10_000) * 10n ** 18n;

// Additional Flow Ecosystem Addresses
export const PUMPFLOW_FACTORY = "0x576Be17F4dFa0E4964034e2E3dD29465B225B8d4";

// Token Decimals (standard ERC20)
export const TOKEN_DECIMALS = {
  FLOW: 18,
  FROTH: 18,
  FVIX: 18,
  sFVIX: 18,
} as const;

// Swap Path Configurations
export const SWAP_PATHS = {
  FLOW_TO_FROTH: [FLOW_TOKEN, FROTH_TOKEN],
  FROTH_TO_FVIX: [FROTH_TOKEN, FVIX_TOKEN],
  FLOW_TO_FVIX: [FLOW_TOKEN, FROTH_TOKEN, FVIX_TOKEN],
} as const;

// Quest Step Verification Amounts
export const QUEST_AMOUNTS = {
  MIN_FROTH_FOR_MINT: FROTH_THRESHOLD,
  MIN_FVIX_FOR_STAKE: BigInt(1) * 10n ** 18n, // 1 FVIX
} as const;