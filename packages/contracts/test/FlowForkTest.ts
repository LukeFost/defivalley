import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther, formatEther, type Address } from "viem";

describe("Flow Fork Test", async function () {
  it("Should connect to Flow fork and check basic functionality", async function () {
    const { viem, networkHelpers } = await network.connect({ network: "flowFork" });
    const publicClient = await viem.getPublicClient();
    const walletClient = await viem.getWalletClient();
    
    // Get a test address
    const [user] = await walletClient.getAddresses();
    console.log("Test user address:", user);
    
    // Fund the user
    await networkHelpers.setBalance(user, parseEther("1000"));
    
    // Check balance
    const balance = await publicClient.getBalance({ address: user });
    console.log("User balance:", formatEther(balance), "FLOW");
    assert.equal(balance, parseEther("1000"), "Balance should be 1000 FLOW");
    
    // Check chain ID
    const chainId = await publicClient.getChainId();
    console.log("Chain ID:", chainId);
    
    // Check block number
    const blockNumber = await publicClient.getBlockNumber();
    console.log("Current block number:", blockNumber);
    
    // Try to read WFLOW contract bytecode to verify it exists
    const WFLOW_ADDRESS: Address = "0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e";
    const bytecode = await publicClient.getBytecode({ address: WFLOW_ADDRESS });
    console.log("WFLOW contract exists:", bytecode ? "Yes" : "No");
    console.log("WFLOW bytecode length:", bytecode ? bytecode.length : 0);
    
    if (bytecode && bytecode !== "0x") {
      console.log("Flow fork is working correctly!");
    } else {
      console.log("Warning: WFLOW contract not found at expected address");
    }
  });
  
  it("Should test direct contract interaction with WFLOW", async function () {
    const { viem, networkHelpers } = await network.connect({ network: "flowFork" });
    const publicClient = await viem.getPublicClient();
    const walletClient = await viem.getWalletClient();
    
    const [user] = await walletClient.getAddresses();
    await networkHelpers.setBalance(user, parseEther("100"));
    
    const WFLOW_ADDRESS: Address = "0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e";
    
    // Define minimal WFLOW ABI for testing
    const wflowAbi = [
      {
        inputs: [],
        name: "deposit",
        outputs: [],
        stateMutability: "payable",
        type: "function"
      },
      {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
      }
    ] as const;
    
    try {
      // Try to deposit FLOW
      const depositHash = await walletClient.writeContract({
        address: WFLOW_ADDRESS,
        abi: wflowAbi,
        functionName: "deposit",
        value: parseEther("1"),
        account: user,
      });
      
      console.log("Deposit transaction hash:", depositHash);
      
      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
      console.log("Deposit successful, gas used:", receipt.gasUsed.toString());
      
      // Check WFLOW balance
      const wflowBalance = await publicClient.readContract({
        address: WFLOW_ADDRESS,
        abi: wflowAbi,
        functionName: "balanceOf",
        args: [user],
      });
      
      console.log("WFLOW balance:", formatEther(wflowBalance));
      assert.equal(wflowBalance, parseEther("1"), "WFLOW balance should be 1");
    } catch (error) {
      console.error("Error interacting with WFLOW:", error);
      throw error;
    }
  });
});