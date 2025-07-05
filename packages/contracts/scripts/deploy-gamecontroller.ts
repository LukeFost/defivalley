import { viem } from "hardhat";
import { formatUnits, parseUnits } from "viem";

/**
 * Deploy GameController to Saga Chainlet
 * This script deploys the game controller that sends cross-chain messages to the DeFi vault
 */

async function main() {
  console.log("🚀 Deploying GameController to Saga Chainlet...");

  // Get deployment account
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  
  console.log(`📝 Deploying with account: ${deployer.account.address}`);
  
  // Check balance (should be 0 or minimal on Saga due to gasless transactions)
  try {
    const balance = await publicClient.getBalance({ 
      address: deployer.account.address 
    });
    console.log(`💰 Account balance: ${formatUnits(balance, 18)} SAGA`);
  } catch (error) {
    console.log("💰 Balance check skipped (gasless chain)");
  }

  // Saga Chainlet Axelar addresses (these need to be verified for Saga)
  // For now using placeholder - update with actual Saga Axelar addresses
  const AXELAR_GATEWAY_SAGA = "0x0000000000000000000000000000000000000001"; // TODO: Get actual Saga Axelar Gateway
  const AXELAR_GAS_SERVICE_SAGA = "0x0000000000000000000000000000000000000002"; // TODO: Get actual Saga Gas Service
  
  console.log("📋 Deployment parameters:");
  console.log(`   Axelar Gateway: ${AXELAR_GATEWAY_SAGA}`);
  console.log(`   Axelar Gas Service: ${AXELAR_GAS_SERVICE_SAGA}`);

  try {
    // Deploy GameController contract
    console.log("🔨 Deploying GameController contract...");
    
    const gameController = await viem.deployContract("GameController", [
      AXELAR_GATEWAY_SAGA,
      AXELAR_GAS_SERVICE_SAGA,
    ]);

    console.log(`✅ GameController deployed successfully!`);
    console.log(`📍 Contract address: ${gameController.address}`);
    console.log(`🔗 Transaction hash: ${gameController.transactionHash}`);

    // Wait for confirmations
    console.log("⏳ Waiting for confirmations...");
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: gameController.transactionHash!,
      confirmations: 1, // Faster on testnets
    });

    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed} (should be 0 on Saga)`);

    // Verify contract deployment
    console.log("🔍 Verifying contract deployment...");
    
    const contractCode = await publicClient.getCode({ 
      address: gameController.address 
    });
    
    if (contractCode && contractCode !== "0x") {
      console.log("✅ Contract bytecode verified on-chain");
    } else {
      console.log("❌ Contract deployment verification failed");
      return;
    }

    // Test basic contract functionality
    console.log("🧪 Testing basic contract functionality...");
    
    try {
      // Check if contract is properly initialized
      const gateway = await gameController.read.gateway();
      const gasService = await gameController.read.gasService();
      const destinationChain = await gameController.read.DESTINATION_CHAIN();
      
      console.log("✅ Contract state verification:");
      console.log(`   Gateway: ${gateway}`);
      console.log(`   Gas Service: ${gasService}`);
      console.log(`   Destination Chain: ${destinationChain}`);
      
      // Check seed types configuration
      const seedType1 = await gameController.read.seedTypes([1n]);
      console.log(`   Seed Type 1: ${seedType1.name} (min: ${formatUnits(seedType1.minAmount, 6)} USDC)`);

    } catch (error) {
      console.log("⚠️  Contract state verification failed:", error);
    }

    // Save deployment info
    const deploymentInfo = {
      network: "sagaTestnet",
      contractName: "GameController",
      address: gameController.address,
      transactionHash: gameController.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      deployedAt: new Date().toISOString(),
      constructorArgs: {
        gateway: AXELAR_GATEWAY_SAGA,
        gasService: AXELAR_GAS_SERVICE_SAGA,
      },
    };

    console.log("\n📄 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    console.log("\n🎯 Next Steps:");
    console.log("1. Set DeFi vault address using setDeFiVaultAddress()");
    console.log("2. Register test players");
    console.log("3. Test seed planting functionality");
    console.log("4. Test cross-chain communication with DeFi vault");

    // Instructions for setting vault address
    console.log("\n💡 To connect to DeFi vault, run:");
    console.log(`npx hardhat run scripts/configure-gamecontroller.ts --network sagaTestnet`);

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    
    // Check if it's a gas-related issue on Saga
    if (error.message.includes("gas") || error.message.includes("fee")) {
      console.log("\n💡 If this is a gas-related error on Saga:");
      console.log("1. Saga chainlets should have gasless transactions");
      console.log("2. Verify you're connected to the correct Saga testnet");
      console.log("3. Check if the chainlet requires special configuration");
    }
    
    process.exit(1);
  }
}

// Run deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Deployment script failed:", error);
    process.exit(1);
  });