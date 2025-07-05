import hre from "hardhat";
import { formatUnits, parseUnits } from "viem";

/**
 * Deploy DeFiVault to Arbitrum Sepolia
 * This script deploys the DeFi vault that receives cross-chain deposits from the game
 */

async function main() {
  console.log("🚀 Deploying DeFiVault to Arbitrum Sepolia...");

  // Get deployment account
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log(`📝 Deploying with account: ${deployer.account.address}`);
  
  // Check balance
  const balance = await publicClient.getBalance({ 
    address: deployer.account.address 
  });
  console.log(`💰 Account balance: ${formatUnits(balance, 18)} ETH`);

  // Arbitrum Sepolia contract addresses
  const AXELAR_GATEWAY = "0xe1cE95479C84e9809269227C7F8524aE051Ae77a";
  const USDC_ARBITRUM_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"; // USDC on Arbitrum Sepolia
  
  // Placeholder EulerSwap vault address (update with actual address)
  const EULER_VAULT = "0x0000000000000000000000000000000000000001"; // TODO: Replace with actual EulerSwap vault
  
  console.log("📋 Deployment parameters:");
  console.log(`   Axelar Gateway: ${AXELAR_GATEWAY}`);
  console.log(`   USDC Token: ${USDC_ARBITRUM_SEPOLIA}`);
  console.log(`   Euler Vault: ${EULER_VAULT}`);

  try {
    // Deploy DeFiVault contract
    console.log("🔨 Deploying DeFiVault contract...");
    
    const deFiVault = await hre.viem.deployContract("DeFiVault", [
      AXELAR_GATEWAY,
      USDC_ARBITRUM_SEPOLIA,
      EULER_VAULT,
    ]);

    console.log(`✅ DeFiVault deployed successfully!`);
    console.log(`📍 Contract address: ${deFiVault.address}`);
    console.log(`🔗 Transaction hash: ${deFiVault.transactionHash}`);

    // Wait for confirmations
    console.log("⏳ Waiting for confirmations...");
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: deFiVault.transactionHash!,
      confirmations: 3,
    });

    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed}`);

    // Verify contract deployment
    console.log("🔍 Verifying contract deployment...");
    
    const contractCode = await publicClient.getCode({ 
      address: deFiVault.address 
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
      const gateway = await deFiVault.read.gateway();
      const depositToken = await deFiVault.read.depositToken();
      const eulerVault = await deFiVault.read.eulerVault();
      
      console.log("✅ Contract state verification:");
      console.log(`   Gateway: ${gateway}`);
      console.log(`   Deposit Token: ${depositToken}`);
      console.log(`   Euler Vault: ${eulerVault}`);
      
      if (gateway.toLowerCase() === AXELAR_GATEWAY.toLowerCase()) {
        console.log("✅ Axelar Gateway correctly configured");
      } else {
        console.log("❌ Axelar Gateway mismatch");
      }

    } catch (error) {
      console.log("⚠️  Contract state verification failed:", error);
    }

    // Save deployment info
    const deploymentInfo = {
      network: "arbitrumSepolia",
      contractName: "DeFiVault",
      address: deFiVault.address,
      transactionHash: deFiVault.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      deployedAt: new Date().toISOString(),
      constructorArgs: {
        gateway: AXELAR_GATEWAY,
        depositToken: USDC_ARBITRUM_SEPOLIA,
        eulerVault: EULER_VAULT,
      },
    };

    console.log("\n📄 Deployment Summary:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    console.log("\n🎯 Next Steps:");
    console.log("1. Update GameController with this vault address");
    console.log("2. Fund the vault with initial USDC for testing");
    console.log("3. Configure EulerSwap integration");
    console.log("4. Test cross-chain communication");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
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