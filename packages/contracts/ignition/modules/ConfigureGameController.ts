import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ConfigureGameControllerModule = buildModule("ConfigureGameControllerModule", (m) => {
  const GAME_CONTROLLER_ADDRESS = "0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673";
  const DEFI_VAULT_ADDRESS = "0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673";

  // Get existing GameController contract
  const gameController = m.contractAt("GameController", GAME_CONTROLLER_ADDRESS);

  // Configure the DeFi vault address
  m.call(gameController, "setDeFiVaultAddress", [DEFI_VAULT_ADDRESS]);

  return { gameController };
});

export default ConfigureGameControllerModule;