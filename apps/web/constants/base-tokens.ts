// Base Network Token Addresses and Euler Configurations

import { type Address } from "viem";

// Base Network Chain ID
export const BASE_CHAIN_ID = 8453;

// Base Token Addresses  
export const BASE_TOKENS = {
  // Main tokens
  WETH: "0x4200000000000000000000000000000000000006" as Address,
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
} as const;

// Euler Contract Addresses on Base
export const EULER_CONTRACTS = {
  // Core Contracts
  FACTORY: "0xf0CFe22d23699ff1B2CFe6B8f706A6DB63911262" as Address,
  PERIPHERY: "0x18e5F5C1ff5e905b32CE860576031AE90E1d1336" as Address,
  EVC: "0x5301c7dD20bD945D2013b48ed0DEE3A284ca8989" as Address,
  
  // Helper Contracts
  VAULT_FINDER: "0x1a36ca65366fbAA4469691d4fD9100ce1E7B84AD" as Address,
  SIMPLE_SWAP_HELPER: "0xe8356930Cc7A6775eb136f9987B8e3f934a7D05B" as Address,
  SIMPLE_POSITION_HELPER: "0xCbd3a8afCdA13c3D3cEe7e9bb7d64659910a55E6" as Address,
} as const;

// Example Vault Addresses (will be discovered dynamically)
export const EXAMPLE_VAULTS = {
  WETH_VAULT: "0x859160DB5841E5cfB8D3f144C6b3381A85A4b410" as Address, // eWETH-1
  USDC_VAULT: "0x0A1a3b5f2041F33522C4efc754a7D096f880eE16" as Address, // eUSDC-1
} as const;

// Vault Configuration Types
export interface VaultInfo {
  vault: Address;
  asset: Address;
  name: string;
  symbol: string;
  totalSupply: bigint;
  totalAssets: bigint;
}

export interface PoolParams {
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

export interface InitialState {
  currReserve0: bigint;
  currReserve1: bigint;
}

// Default Pool Parameters
export const DEFAULT_POOL_PARAMS = {
  priceX: BigInt(1e18),
  priceY: BigInt(1e18),
  concentrationX: BigInt(0.97e18), // 97%
  concentrationY: BigInt(0.97e18), // 97%
  fee: BigInt(0.003e18), // 0.3%
} as const;