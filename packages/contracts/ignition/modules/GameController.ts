import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const GameControllerModule = buildModule("GameControllerModule", (m) => {
  // Saga Chainlet Axelar addresses (placeholders - need actual addresses)
  const AXELAR_GATEWAY_SAGA = "0x0000000000000000000000000000000000000001"; 
  const AXELAR_GAS_SERVICE_SAGA = "0x0000000000000000000000000000000000000002";

  const gameController = m.contract("GameController", [
    AXELAR_GATEWAY_SAGA,
    AXELAR_GAS_SERVICE_SAGA,
  ]);

  return { gameController };
});

export default GameControllerModule;