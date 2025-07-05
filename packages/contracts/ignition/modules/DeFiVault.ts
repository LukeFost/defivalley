import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeFiVaultModule = buildModule("DeFiVaultModule", (m) => {
  // Arbitrum Sepolia contract addresses
  const AXELAR_GATEWAY = "0xe1cE95479C84e9809269227C7F8524aE051Ae77a";
  const USDC_ARBITRUM_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
  const EULER_VAULT = "0x0000000000000000000000000000000000000001"; // Placeholder

  const deFiVault = m.contract("DeFiVault", [
    AXELAR_GATEWAY,
    USDC_ARBITRUM_SEPOLIA,
    EULER_VAULT,
  ]);

  return { deFiVault };
});

export default DeFiVaultModule;