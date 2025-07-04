# DeFi Valley 🏕️

A cozy farming game where your crops are powered by real DeFi protocols. Plant seeds, earn yield, and watch your digital farm grow with actual blockchain value.

## 🎯 Project Overview

DeFi Valley is a multiplayer farming game that transforms complex DeFi yield farming into an intuitive, delightful gaming experience. Built for the hackathon with a focus on cross-chain interoperability and user experience.

### Key Features

- **🌱 Seed Planting = DeFi Deposits**: Plant USDC seeds that automatically deposit into EulerSwap vaults
- **⚡ Gas-Free Gaming**: Built on Saga Chainlets for seamless, zero-cost gameplay  
- **🔗 Cross-Chain Magic**: Uses Avail Nexus for one-click bridging from any chain to Arbitrum
- **🎮 Real-Time Multiplayer**: See other farmers in your world via Colyseus
- **🎨 Cozy Aesthetic**: Beautiful, hand-drawn sprites with satisfying "juice" animations

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Game Server    │    │ Smart Contracts │
│   (Next.js)     │◄──►│   (Colyseus)     │    │                 │
│                 │    │                  │    │ GameController  │
│ - Phaser Game   │    │ - Player Sync    │    │ (Saga Testnet)  │
│ - Privy Auth    │    │ - Real-time      │    │                 │
│ - Wagmi/Viem    │    │   Multiplayer    │    │ DeFiVault      │
│                 │    │                  │    │ (Arbitrum)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js v22+** (Required for Hardhat 3 Alpha)
- **pnpm** (Package manager)
- **Metamask** or compatible wallet

### Installation

```bash
# Clone and install
git clone <your-repo>
cd defivalley
pnpm install

# Start development environment
pnpm dev
```

This starts:
- **Frontend**: http://localhost:3000 (Next.js with Turbopack)
- **Game Server**: Colyseus multiplayer server
- **Smart Contracts**: Local Hardhat network

## 🛠️ Development

### Project Structure

```
defivalley/
├── apps/
│   ├── web/           # Next.js frontend + Phaser game
│   └── server/        # Colyseus multiplayer server
├── packages/
│   └── (contracts)/   # Hardhat 3 Alpha smart contracts
├── turbo.json         # Turborepo configuration
└── pnpm-workspace.yaml
```

### Smart Contract Development

```bash
# Navigate to packages directory
cd packages

# Compile contracts
npx hardhat compile

# Run tests (both Solidity and TypeScript)
npx hardhat test

# Deploy to Saga testnet
npx hardhat run scripts/deploy.ts --network sagaTestnet

# Deploy to Arbitrum testnet  
npx hardhat run scripts/deploy.ts --network arbitrumSepolia
```

### Build Commands

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build --filter=web

# Development mode
pnpm dev

# Development for specific package
pnpm dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo login

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo login
yarn exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo link

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo link
yarn exec turbo link
pnpm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.com/docs/reference/configuration)
- [CLI Usage](https://turborepo.com/docs/reference/command-line-reference)
