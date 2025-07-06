import type { HardhatUserConfig } from "hardhat/config";
import { config as dotenvConfig } from "dotenv";
import { defineChain } from "viem";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";

// Load environment variables
dotenvConfig();

// Define custom Saga chainlet for viem
const sagaChainlet = defineChain({
  id: 2751669528484000,
  name: "Saga Chainlet",
  network: "saga-chainlet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [
        process.env.SAGA_TESTNET_RPC_URL ||
          "https://yieldfield-2751669528484000-1.jsonrpc.sagarpc.io",
      ],
    },
    public: {
      http: [
        process.env.SAGA_TESTNET_RPC_URL ||
          "https://yieldfield-2751669528484000-1.jsonrpc.sagarpc.io",
      ],
    },
  },
});
const BASE_RPC_URL =
  process.env.BASE_RPC_URL || "https://base-sepolia.public.blastapi.io";
if (!BASE_RPC_URL) {
  throw new Error("BASE_RPC_URL is not defined in the environment variables.");
}
if (!process.env.FLOW_RPC_URL) {
  throw new Error("BASE_RPC_URL is not defined in the environment variables.");
}
const config: HardhatUserConfig = {
  /*
   * In Hardhat 3, plugins are defined as part of the Hardhat config instead of
   * being based on the side-effect of imports.
   *
   * Note: A `hardhat-toolbox` like plugin for Hardhat 3 hasn't been defined yet,
   * so this list is larger than what you would normally have.
   */
  plugins: [hardhatToolboxViemPlugin],

  paths: {
    sources: "./", // Contracts are in the root directory
  },
  solidity: {
    /*
     * Hardhat 3 supports different build profiles, allowing you to configure
     * different versions of `solc` and its settings for various use cases.
     *
     * Note: Using profiles is optional, and any Hardhat 2 `solidity` config
     * is still valid in Hardhat 3.
     */
    profiles: {
      /*
       * The default profile is used when no profile is defined or specified
       * in the CLI or by the tasks you are running.
       */
      default: {
        version: "0.8.28",
        settings: {
          evmVersion: "istanbul",
          viaIR: true,
        },
      },
      /*
       * The production profile is meant to be used for deployments, providing
       * more control over settings for production builds and taking some extra
       * steps to simplify the process of verifying your contracts.
       */
      production: {
        version: "0.8.28",
        settings: {
          evmVersion: "istanbul",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  /*
   * The `networks` configuration is mostly compatible with Hardhat 2.
   * The key differences right now are:
   *
   * - You must set a `type` for each network, which is either `edr` or `http`,
   *   allowing you to have multiple simulated networks.
   *
   * - You can set a `chainType` for each network, which is either `generic`,
   *   `l1`, or `optimism`. This has two uses. It ensures that you always
   *   connect to the network with the right Chain Type. And, on `edr`
   *   networks, it makes sure that the simulated chain behaves exactly like the
   *   real one. More information about this can be found in the test files.
   *
   * - The `accounts` field of `http` networks can also receive Configuration
   *   Variables, which are values that only get loaded when needed. This allows
   *   Hardhat to still run despite some of its config not being available
   *   (e.g., a missing private key or API key). More info about this can be
   *   found in the "Sending a Transaction to Optimism Sepolia" of the README.
   */
  networks: {
    hardhatMainnet: {
      type: "edr",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr",
      chainType: "optimism",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.SEPOLIA_RPC_URL ?? "",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY ?? ""],
    },
    // Saga Chainlet for GameController deployment
    sagaTestnet: {
      type: "http",
      chainType: "generic",
      url: process.env.SAGA_RPC_URL ?? "",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY ?? ""],
      chainId: 2751669528484000, // Your actual Saga chainlet chain ID
      gasPrice: 100000000, // 0.1 Gwei minimum required by Saga
    },
    flow: {
      type: "http",
      chainType: "generic",
      url: process.env.FLOW_RPC_URL ?? "",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY ?? ""],
      chainId: 747, // Flow EVM chainId
    },
    flowFork: {
      type: "edr",
      chainType: "generic",
      chainId: 747,
      forking: {
        url: process.env.FLOW_RPC_URL,
      },
    },
    katana: {
      type: "http",
      chainType: "generic",
      url: process.env.KATANA_RPC_URL ?? "",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY ?? ""],
      chainId: 747474, // Your actual Saga chainlet chain ID
    },
    // Arbitrum Sepolia for DeFiVault deployment
    arbitrumSepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY ?? ""],
      chainId: 421614,
    },
    base: {
      type: "http",
      chainType: "generic",
      url: process.env.BASE_RPC_URL ?? "",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY ?? ""],
      chainId: 8453, // Your actual Saga chainlet chain ID
    },
    baseFork: {
      type: "edr",
      chainType: "l1",
      forking: {
        url: BASE_RPC_URL,
      },
    },
  },
};

export default config;
