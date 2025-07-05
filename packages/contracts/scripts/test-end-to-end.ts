import { viem } from "hardhat";
import { formatEther, parseUnits } from "viem";

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
    // STEP 1: Connect to GameController on Saga
    // =========================================================================
    console.log("\n🔗 Step 1: Connecting to GameController on Saga Chainlet");
    
    const gameController = await viem.getContractAt("GameController", GAME_CONTROLLER_SAGA);
    
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
    // STEP 2: Check initial state on both chains
    // =========================================================================
    console.log("\n📊 Step 2: Checking initial state on both chains");
    
    // Get player's current seed count on Saga
    const playerData = await gameController.read.players([PLAYER_ADDRESS]);
    console.log(`- Current seeds planted: ${playerData.seedsPlanted}`);
    console.log(`- Current experience: ${playerData.experience}`);
    
    // Connect to DeFiVault on Arbitrum
    const deFiVault = await viem.getContractAt("DeFiVault", DEFI_VAULT_ARBITRUM);
    const initialBalance = await deFiVault.read.getPlayerBalance([PLAYER_ADDRESS]);
    console.log(`- Initial vault balance: ${initialBalance} USDC`);
    
    // =========================================================================
    // STEP 3: Plant a seed (trigger cross-chain deposit)
    // =========================================================================
    console.log("\n🌱 Step 3: Planting seed on Saga (cross-chain deposit)");
    
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
    // STEP 4: Wait and verify cross-chain message processing
    // =========================================================================
    console.log("\n⏳ Step 4: Waiting for Axelar message processing...");
    console.log("This typically takes 2-5 minutes for cross-chain delivery");
    
    // Wait for Axelar processing
    const waitTime = 30; // seconds
    console.log(`- Waiting ${waitTime} seconds for initial propagation...`);
    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    
    // =========================================================================
    // STEP 5: Verify final state on both chains
    // =========================================================================
    console.log("\n🔍 Step 5: Verifying final state on both chains");
    
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
    
    // Check updated vault balance on Arbitrum
    const finalBalance = await deFiVault.read.getPlayerBalance([PLAYER_ADDRESS]);
    console.log(`- Final vault balance: ${finalBalance} USDC`);
    
    const balanceIncrease = Number(finalBalance) - Number(initialBalance);
    if (balanceIncrease > 0) {
      console.log(`✅ Cross-chain deposit successful! +${balanceIncrease} USDC`);
    } else {
      console.log("⚠️  Vault balance unchanged (message may still be processing)");
    }
    
    // =========================================================================
    // STEP 6: Final verification and next steps
    // =========================================================================
    console.log("\n🎯 Step 6: Test Results & Next Steps");
    console.log("=" .repeat(60));
    
    if (seedsIncrease > 0 && balanceIncrease > 0) {
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