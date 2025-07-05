const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking contract state...");
  
  // GameController on Saga
  const gameControllerAbi = [
    "function defiVaultAddress() view returns (string)",
    "function DESTINATION_CHAIN() view returns (string)",
    "function seedTypes(uint256) view returns (string, uint256, uint256, bool)"
  ];
  
  const provider = new ethers.providers.JsonRpcProvider("https://yieldfield-2751669528484000-1.jsonrpc.sagarpc.io");
  const gameController = new ethers.Contract("0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673", gameControllerAbi, provider);
  
  try {
    const vaultAddress = await gameController.defiVaultAddress();
    const destinationChain = await gameController.DESTINATION_CHAIN();
    const seedType1 = await gameController.seedTypes(1);
    
    console.log("GameController Configuration:");
    console.log("  DeFi Vault Address:", vaultAddress);
    console.log("  Destination Chain:", destinationChain);
    console.log("  Seed Type 1:", seedType1);
    
  } catch (error) {
    console.error("Error checking GameController:", error.message);
  }
}

main().catch(console.error);
EOF < /dev/null