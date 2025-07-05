import { randomBytes } from "crypto";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Creates a new wallet for contract deployment
 * Generates a random private key and displays the wallet details
 */
async function createDeployerWallet() {
  try {
    // Generate a random private key
    const privateKey = randomBytes(32);
    const privateKeyHex = `0x${privateKey.toString("hex")}` as `0x${string}`;
    
    // Create account from private key
    const account = privateKeyToAccount(privateKeyHex);
    
    console.log("=== NEW DEPLOYER WALLET CREATED ===");
    console.log(`Address: ${account.address}`);
    console.log(`Private Key: ${privateKeyHex}`);
    console.log("");
    console.log("IMPORTANT SECURITY NOTES:");
    console.log("1. Store this private key securely using:");
    console.log(`   npx hardhat keystore set DEPLOYER_PRIVATE_KEY`);
    console.log("2. Never commit this private key to git");
    console.log("3. Fund this address with testnet tokens before deployment");
    console.log("");
    console.log("NEXT STEPS:");
    console.log("1. Fund the address with testnet tokens:");
    console.log(`   - Arbitrum Sepolia: https://faucet.arbitrum.io/`);
    console.log(`   - Saga Testnet: Check Saga documentation for faucet`);
    console.log("2. Add to hardhat.config.ts networks if needed");
    console.log("3. Set in keystore for secure storage");
    
  } catch (error) {
    console.error("Error creating deployer wallet:", error);
    process.exit(1);
  }
}

// Run the script
createDeployerWallet();