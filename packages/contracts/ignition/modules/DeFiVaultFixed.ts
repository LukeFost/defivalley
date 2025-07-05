import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeFiVaultFixedModule = buildModule("DeFiVaultFixed", (m) => {
  // Official Axelar testnet addresses for Arbitrum Sepolia
  const ARBITRUM_AXELAR_GATEWAY = "0xe432150cce91c13a887f7D836923d5597adD8E31";
  const USDC_ARBITRUM_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
  
  // Initial deposit cap: 1M USDC (1,000,000 * 1e6)
  const INITIAL_DEPOSIT_CAP = "1000000000000"; // 1M USDC in wei (6 decimals)
  
  // Deploy DeFiVault with correct Axelar gateway address and deposit cap
  const deFiVault = m.contract("DeFiVault", [
    ARBITRUM_AXELAR_GATEWAY,
    USDC_ARBITRUM_SEPOLIA,
    "0x0000000000000000000000000000000000000000", // placeholder euler vault
    INITIAL_DEPOSIT_CAP
  ]);

  return { deFiVault };
});

export default DeFiVaultFixedModule;