import { network } from "hardhat";
import { formatEther, parseUnits, defineChain, createPublicClient, http, createWalletClient, getContract } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// =============================================================================
// DEPLOYED CONTRACT ADDRESSES (From Ignition deployments)
// =============================================================================
const GAME_CONTROLLER_SAGA = "0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673";
const DEFI_VAULT_ARBITRUM = "0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673";

// Test wallet (from .env)
const PLAYER_ADDRESS = "0xa55eE8815a64af1ed93Ff6F1c242341432E18365";

// Network configuration
const SAGA_CHAIN_ID = 2751669528484000;
const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

// Define custom Saga chainlet for viem
const sagaChainlet = defineChain({
  id: 2751669528484000,
  name: 'Saga Chainlet',
  network: 'saga-chainlet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.SAGA_TESTNET_RPC_URL || 'https://yieldfield-2751669528484000-1.jsonrpc.sagarpc.io'],
    },
    public: {
      http: [process.env.SAGA_TESTNET_RPC_URL || 'https://yieldfield-2751669528484000-1.jsonrpc.sagarpc.io'],
    },
  },
});

/**
 * End-to-End Cross-Chain Test Script
 * 
 * This script tests the complete DeFi Valley flow:
 * 1. Player plants seed on Saga (GameController)
 * 2. Axelar relays message to Arbitrum (DeFiVault)
 * 3. USDC deposit is processed on Arbitrum
 * 4. Verify the cross-chain state update
 */
async function main() {
  console.log("🚀 Starting DeFi Valley End-to-End Cross-Chain Test");
  console.log("=" .repeat(60));
  
  try {
    // =========================================================================
    // STEP 1: Create custom viem clients for Saga chainlet
    // =========================================================================
    console.log("\n🔗 Step 1: Creating custom viem clients for Saga chainlet");
    
    // Create public client for reading
    const sagaPublicClient = createPublicClient({
      chain: sagaChainlet,
      transport: http(process.env.SAGA_TESTNET_RPC_URL)
    });
    
    // Create wallet client for transactions
    const account = privateKeyToAccount(process.env.SAGA_TESTNET_PRIVATE_KEY as `0x${string}`);
    const sagaWalletClient = createWalletClient({
      chain: sagaChainlet,
      transport: http(process.env.SAGA_TESTNET_RPC_URL),
      account
    });
    
    console.log("✅ Custom viem clients created for Saga chainlet");
    
    // =========================================================================
    // STEP 2: Connect to GameController on Saga using native viem
    // =========================================================================
    console.log("\n🔗 Step 2: Connecting to GameController on Saga Chainlet");
    
    // We need to get the ABI from Hardhat artifacts
    const { viem: hardhatViem } = await network.connect("arbitrumSepolia"); // Use a recognized network to get artifacts
    const gameControllerArtifact = await hardhatViem.getContractAt("GameController", GAME_CONTROLLER_SAGA);
    
    // Create contract instance with custom clients
    const gameController = getContract({
      address: GAME_CONTROLLER_SAGA as `0x${string}`,
      abi: gameControllerArtifact.abi,
      client: {
        public: sagaPublicClient,
        wallet: sagaWalletClient,
      },
    });
    
    // Check if player is registered
    const isRegistered = await gameController.read.players([PLAYER_ADDRESS]);
    console.log(`- Player registered: ${isRegistered}`);
    
    if (!isRegistered) {
      console.log("⚠️  Player not registered. Registering player first...");
      const registerTx = await gameController.write.registerPlayer();
      console.log(`- Registration transaction: ${registerTx}`);
      
      // Wait for registration to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log("✅ Player registration completed");
    }
    
    // =========================================================================
    // STEP 3: Check initial state on both chains
    // =========================================================================
    console.log("\n📊 Step 3: Checking initial state on both chains");
    
    // Get player's current seed count on Saga
    const playerData = await gameController.read.players([PLAYER_ADDRESS]);
    console.log(`- Current seeds planted: ${playerData.seedsPlanted}`);
    console.log(`- Current experience: ${playerData.experience}`);
    
    // Connect to DeFiVault on Arbitrum (using multi-chain capabilities)
    console.log("\n🔗 Connecting to Arbitrum network for DeFiVault...");
    const { viem: arbitrumViem } = await network.connect("arbitrumSepolia");
    const deFiVault = await arbitrumViem.getContractAt("DeFiVault", DEFI_VAULT_ARBITRUM);
    const initialPosition = await deFiVault.read.getPlayerPosition([PLAYER_ADDRESS]);
    console.log(`- Initial vault position: deposited=${initialPosition[0]}, lastClaim=${initialPosition[1]}, isActive=${initialPosition[3]}`);
    
    // =========================================================================
    // STEP 4: Plant a seed (trigger cross-chain deposit)
    // =========================================================================
    console.log("\n🌱 Step 4: Planting seed on Saga (cross-chain deposit)");
    
    const amountToDeposit = parseUnits("10", 6); // 10 USDC (6 decimals)
    console.log(`- Depositing amount: ${amountToDeposit} (10 USDC)`);
    
    // Estimate gas for the cross-chain call
    const gasEstimate = 500000n; // 500k gas units
    const gasValue = gasEstimate; // 1:1 ratio for gas payment
    
    console.log(`- Estimated gas: ${gasEstimate}`);
    console.log(`- Gas payment: ${formatEther(gasValue)} native tokens`);
    
    // Initiate the cross-chain deposit via plantSeed
    console.log("- Planting seed (triggers cross-chain deposit)...");
    const plantTx = await gameController.write.plantSeed([
      1,                           // Seed type (1 = USDC Sprout)
      amountToDeposit,            // Amount to deposit
      "0x0000000000000000000000000000000000000000" // Gas token (native)
    ], { 
      value: gasValue             // Pay for cross-chain gas
    });
    
    console.log(`✅ Saga transaction sent: ${plantTx}`);
    console.log(`🔍 Monitor on Axelarscan: https://axelarscan.io/`);
    
    // =========================================================================
    // STEP 5: Wait and verify cross-chain message processing
    // =========================================================================
    console.log("\n⏳ Step 5: Waiting for Axelar message processing...");
    console.log("This typically takes 2-5 minutes for cross-chain delivery");
    
    // Wait for Axelar processing
    const waitTime = 30; // seconds
    console.log(`- Waiting ${waitTime} seconds for initial propagation...`);
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    
    // =========================================================================
    // STEP 6: Verify final state on both chains
    // =========================================================================
    console.log("\n🔍 Step 6: Verifying final state on both chains");
    
    // Check updated player data on Saga
    const updatedPlayerData = await gameController.read.players([PLAYER_ADDRESS]);
    console.log(`- Updated seeds planted: ${updatedPlayerData.seedsPlanted}`);
    console.log(`- Updated experience: ${updatedPlayerData.experience}`);
    
    // Check if seed count increased
    const seedsIncrease = Number(updatedPlayerData.seedsPlanted) - Number(playerData.seedsPlanted);
    if (seedsIncrease > 0) {
      console.log(`✅ Seed planting successful! +${seedsIncrease} seeds`);
    } else {
      console.log("⚠️  Seed count unchanged (may still be processing)");
    }
    
    // Check updated vault position on Arbitrum (using multi-chain connection)
    const finalPosition = await deFiVault.read.getPlayerPosition([PLAYER_ADDRESS]);
    console.log(`- Final vault position: deposited=${finalPosition[0]}, lastClaim=${finalPosition[1]}, isActive=${finalPosition[3]}`);
    
    const depositIncrease = Number(finalPosition[0]) - Number(initialPosition[0]); // depositedAmount
    if (depositIncrease > 0) {
      console.log(`✅ Cross-chain deposit successful! +${depositIncrease} USDC`);
    } else {
      console.log("⚠️  Vault position unchanged (message may still be processing)");
    }
    
    // =========================================================================
    // STEP 7: Final verification and next steps
    // =========================================================================
    console.log("\n🎯 Step 7: Test Results & Next Steps");
    console.log("=" .repeat(60));
    
    if (seedsIncrease > 0 && depositIncrease > 0) {
      console.log("🎉 SUCCESS: Complete cross-chain flow working!");
      console.log("✅ Saga → Arbitrum message delivery confirmed");
      console.log("✅ DeFi vault integration operational");
      console.log("✅ Ready for frontend integration");
    } else if (seedsIncrease > 0) {
      console.log("⚠️  PARTIAL SUCCESS: Saga state updated");
      console.log("⏳ Arbitrum processing may still be in progress");
      console.log("🔄 Re-run this script in 2-3 minutes to check final state");
    } else {
      console.log("⚠️  PENDING: Cross-chain message processing");
      console.log("🔄 Re-run this script in 2-3 minutes");
      console.log("📊 Monitor Axelarscan for message status");
    }
    
    console.log("\n📋 Transaction Details:");
    console.log(`- Saga TX: ${plantTx}`);
    console.log(`- Player: ${PLAYER_ADDRESS}`);
    console.log(`- Amount: ${amountToDeposit} USDC`);
    console.log(`- Gas paid: ${formatEther(gasValue)} native tokens`);
    
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    
    // Provide helpful debugging information
    console.log("\n🔧 Debugging Tips:");
    console.log("1. Ensure you have native tokens for gas on Saga");
    console.log("2. Check that contracts are properly configured");
    console.log("3. Verify network connectivity to both chains");
    console.log("4. Monitor Axelarscan for message processing status");
  }
}

// Run the test
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});