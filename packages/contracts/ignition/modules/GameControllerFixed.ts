import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const GameControllerFixedModule = buildModule("GameControllerFixed", (m) => {
  // Axelar testnet addresses for EVM-compatible chains
  // These are the standard addresses that should work with Saga chainlets
  const axelarGateway = "0xe432150cce91c13a887f7D836923d5597adD8E31";   // Standard EVM testnet gateway
  const axelarGasService = "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6"; // Standard EVM testnet gas service
  
  // Deploy GameController with real Axelar addresses
  const gameController = m.contract("GameController", [
    axelarGateway,
    axelarGasService
  ]);

  return { gameController };
});

export default GameControllerFixedModule;