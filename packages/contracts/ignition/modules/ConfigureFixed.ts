import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ConfigureFixedModule = buildModule("ConfigureFixed", (m) => {
  // Your current deployed addresses
  const GAME_CONTROLLER_SAGA = "0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673";
  const DEFI_VAULT_ARBITRUM = "0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673";
  
  console.log("Configuring cross-chain communication...");
  
  // Get reference to the deployed GameController
  const gameController = m.contractAt("GameController", GAME_CONTROLLER_SAGA);
  
  // Configure the DeFi vault address
  m.call(gameController, "setDeFiVaultAddress", [DEFI_VAULT_ARBITRUM]);
  
  console.log("✅ GameController configured with DeFi vault address!");
  
  return { gameController };
});

export default ConfigureFixedModule;