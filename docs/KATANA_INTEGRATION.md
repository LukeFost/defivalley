# Katana Network Integration

## Overview
This document outlines the integration of Katana network for DeFi Valley, including token addresses, vault configurations, and user flow.

## Token Addresses on Katana

### Main Tokens
- **vbUSDC** (Bridged USDC): `0x203A662b0BD271A6ed5a60EdFbd04bFce608FD36`
  - Used for lending in Morpho vaults
  - 6 decimals
  
- **vbETH** (Bridged ETH): `0xEE7D8BCFb72bC1880D0Cf19822eB0A2e6577aB62`
  - Used as collateral in Morpho vaults
  - 18 decimals

- **POL Token**: `0xb24e3035d1FCBC0E43CF3143C3Fd92E53df2009b`
  - Alternative collateral option
  - Decimals: TBD

### Other Tokens
- **Agora USD**: `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC`
- **WETH**: `0x17B8Ee96E3bcB3b04b3e8334de4524520C51caB4`

## Morpho Vault Configurations

### vbETH Vault
- **Loan Token**: vbUSDC
- **Collateral Token**: vbETH
- **Oracle**: `0xD423D353f890aD0D18532fFaf5c47B0Cb943bf47`
- **LLTV**: 86% (860000000000000000)
- **Description**: Lend vbUSDC against vbETH collateral

### POL Vault
- **Loan Token**: vbUSDC
- **Collateral Token**: POL
- **Oracle**: `0x8b99035AF467A46c4B208B00348ad9456177d76E`
- **LLTV**: 77% (770000000000000000)
- **Description**: Lend vbUSDC against POL collateral

## User Flow

1. **Connect Wallet** (upper right corner)
2. **Visit Marketplace** (market building)
   - **Wrap/Unwrap Tab**: Convert ETH ↔ WETH
   - **Swap Tab**: Trade tokens using SushiSwap
     - Swap WETH/vbETH → vbUSDC for deposits
3. **Visit Bank** (bank building)
   - Choose vault type (vbETH or POL)
   - Deposit vbUSDC to earn yield

## Implementation Details

### New Files Created
- `/apps/web/constants/katana-tokens.ts` - Token addresses and vault configs
- `/apps/web/hooks/useWrapETH.ts` - Hook for wrapping/unwrapping ETH
- `/docs/KATANA_INTEGRATION.md` - This documentation

### Updated Files
- `/apps/web/hooks/useMorphoDeposit.ts` - Now uses vbUSDC and supports multiple vaults
- `/apps/web/components/MorphoDepositModal.tsx` - Updated UI for vault selection
- `/apps/web/components/MarketplaceModal.tsx` - Added vbUSDC/vbETH to swap options

### Key Features
- Dual vault support (vbETH and POL collateral)
- Automatic token approval flow
- Real-time balance display for vbUSDC
- Improved token selection UI in marketplace
- ETH wrapping/unwrapping functionality
- Clear user guidance for the wrap → swap → deposit flow