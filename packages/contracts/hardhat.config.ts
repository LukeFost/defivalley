import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-viem";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  
  networks: {
    hardhat: {
      // Local development network - can fork Arbitrum for testing
      chainId: 31337,
      forking: process.env.FORK_ARBITRUM === "true" ? {
        url: "https://arb1.arbitrum.io/rpc",
        blockNumber: undefined // Latest block
      } : undefined
    },
    
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    
    // Arbitrum Sepolia Testnet (for EulerSwap integration)
    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto"
    },
    
    // Arbitrum Mainnet (production EulerSwap)
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto"
    },
    
    // Saga Testnet Chainlet (for game logic)
    sagaTestnet: {
      url: process.env.SAGA_RPC_URL || "https://your-chainlet-rpc-endpoint.saga.xyz",
      chainId: process.env.SAGA_CHAIN_ID ? parseInt(process.env.SAGA_CHAIN_ID) : 1712762003250914,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto"
    },
    
    // Saga Mainnet Chainlet (production game)
    sagaMainnet: {
      url: process.env.SAGA_MAINNET_RPC_URL || "https://your-mainnet-chainlet-rpc.saga.xyz",
      chainId: process.env.SAGA_MAINNET_CHAIN_ID ? parseInt(process.env.SAGA_MAINNET_CHAIN_ID) : 1,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: "auto",
      gas: "auto"
    }
  },
  
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
      // Saga chains may have their own block explorer API keys
      sagaTestnet: process.env.SAGA_EXPLORER_API_KEY || "",
      sagaMainnet: process.env.SAGA_EXPLORER_API_KEY || ""
    },
    customChains: [
      {
        network: "sagaTestnet",
        chainId: process.env.SAGA_CHAIN_ID ? parseInt(process.env.SAGA_CHAIN_ID) : 1712762003250914,
        urls: {
          apiURL: process.env.SAGA_EXPLORER_API_URL || "https://your-chainlet-explorer.saga.xyz/api",
          browserURL: process.env.SAGA_EXPLORER_URL || "https://your-chainlet-explorer.saga.xyz"
        }
      },
      {
        network: "sagaMainnet",
        chainId: process.env.SAGA_MAINNET_CHAIN_ID ? parseInt(process.env.SAGA_MAINNET_CHAIN_ID) : 1,
        urls: {
          apiURL: process.env.SAGA_MAINNET_EXPLORER_API_URL || "https://your-mainnet-chainlet-explorer.saga.xyz/api",
          browserURL: process.env.SAGA_MAINNET_EXPLORER_URL || "https://your-mainnet-chainlet-explorer.saga.xyz"
        }
      }
    ]
  },
  
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6"
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  }
};

export default config;