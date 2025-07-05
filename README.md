# DeFi Valley 🏕️

A cozy farming game where your crops are powered by real DeFi protocols. Plant seeds, earn yield, and watch your digital farm grow with actual blockchain value.

## 🎯 Project Overview

DeFi Valley is a multiplayer farming game that transforms complex DeFi yield farming into an intuitive, delightful gaming experience. Built for the hackathon with a focus on cross-chain interoperability and user experience.

## 🏆 Hackathon Features

### What Makes This Special
- **🎮 Gaming + DeFi**: First farming game with real yield farming integration
- **⚡ Gasless Gaming**: Zero transaction costs on Saga Chainlets
- **🔗 Cross-Chain Innovation**: Seamless Saga ↔ Arbitrum communication via Axelar
- **🛡️ Production Security**: Enterprise-grade smart contracts with circuit breakers
- **👥 Real-Time Multiplayer**: Live player interaction with Colyseus + Phaser
- **🎯 UX First**: Complex DeFi made simple through gaming metaphors

### Technical Innovation Stack
- **Frontend**: Next.js 15 + Phaser 3 + TypeScript
- **Game Server**: Colyseus multiplayer framework
- **Auth**: Privy Web3 authentication with embedded wallets
- **Smart Contracts**: Hardhat 3 Alpha + Solidity 0.8.28
- **Cross-Chain**: Axelar General Message Passing (GMP)
- **DeFi Integration**: EulerSwap yield farming on Arbitrum
- **Security**: OpenZeppelin + custom circuit breakers

### Live Demo
🚀 **Try it now**: [Insert your deployed URL here]
- Connect with email, social login, or crypto wallet
- Plant seeds, earn real yield, chat with other players
- Experience the first gamified cross-chain DeFi protocol

### Key Features

- **🌱 Seed Planting = DeFi Deposits**: Plant USDC seeds that automatically deposit into EulerSwap vaults
- **⚡ Gas-Free Gaming**: Built on Saga Chainlets for seamless, zero-cost gameplay  
- **🔗 Cross-Chain Magic**: Uses Axelar GMP for secure cross-chain communication
- **🎮 Real-Time Multiplayer**: Live multiplayer with player movement and chat via Colyseus
- **🕹️ Phaser Game Engine**: Smooth 2D graphics with TypeScript integration
- **💬 Interactive Chat**: Real-time messaging system between players

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
- **Testnet tokens** (Optional - for full DeFi testing)

### Installation

```bash
# Clone and install
git clone https://github.com/LukeFost/defivalley.git
cd defivalley
pnpm install

# Set up environment (create your own .env files)
cp packages/contracts/.env.example packages/contracts/.env
cp apps/web/.env.local.example apps/web/.env.local

# Start development environment
pnpm dev
```

> **⚠️ Security Note**: You'll need to add your own private keys to the `.env` files for full functionality. Never commit these files to git.

This starts:
- **Frontend**: http://localhost:3000 (Next.js with Turbopack + Phaser)
- **Game Server**: http://localhost:2567 (Colyseus multiplayer server)
- **Smart Contracts**: Local Hardhat network

### 🎮 Playing the Game

#### Local Development
1. **Start both servers**: `pnpm dev`
2. **Open game**: http://localhost:3000
3. **Move around**: Use WASD or Arrow keys
4. **Chat**: Press Enter to open chat, type message, press Enter to send
5. **Test multiplayer**: Open multiple browser tabs

#### Network Multiplayer
1. **Find your local IP**: Check server logs for network address (e.g., `172.31.50.134`)
2. **Share with friends**: http://[YOUR_IP]:3000
3. **Debug connections**: Use test client at http://[YOUR_IP]:2567/test.html

#### Game Controls
- **Movement**: WASD keys or Arrow keys
- **Chat**: Press Enter to open/send, Escape to cancel
- **Visual Indicators**: You appear as green circle, others as red circles

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
pnpm dev --filter=server

# Manual startup (run in separate terminals)
cd apps/web && pnpm dev     # Frontend on port 3000
cd apps/server && pnpm dev  # Game server on port 2567
```

### 🚨 Troubleshooting

#### Common Issues

**Connection Refused Error**
- Ensure game server is running: `cd apps/server && pnpm dev`
- Check server is listening on port 2567
- For network access, use IP address instead of localhost

**WASD Keys Not Working in Chat**
- Fixed! Movement is automatically disabled when chat input is focused
- Press Escape to close chat and resume movement

**Game Not Loading**
- Refresh the page if you see "Loading game..." stuck
- Check browser console for error messages
- Try the test client: http://localhost:2567/test.html

**Network Multiplayer Issues**
1. Check your local IP in server startup logs
2. Use test client first: http://[YOUR_IP]:2567/test.html
3. Ensure both players are on same network
4. Check firewall settings if connection fails

#### Development Tips
- Use browser developer tools to debug WebSocket connections
- Server logs show player connections and disconnections
- Test client provides detailed connection diagnostics
- Multiple browser tabs can simulate multiple players

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

## 🔒 Security & Public Repository

### Repository Security Status
- ✅ **No sensitive data committed** - All private keys and API keys are excluded
- ✅ **Clean git history** - No secrets have ever been committed
- ✅ **Proper .gitignore** - All sensitive files are properly excluded
- ✅ **Safe for public viewing** - Ready for hackathon judges and community

### For Developers
To get full functionality:
1. Copy `.env.example` files to `.env` in respective directories
2. Add your own private keys and API credentials
3. Never commit `.env` files to version control
4. Use `npx hardhat keystore set` for secure key management

### Smart Contract Addresses (Testnet)
- **GameController (Saga)**: `0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673`
- **DeFiVault (Arbitrum)**: `0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673`

## 🚀 Deployment & Links

### Networks
- **Saga Chainlet**: Gasless gaming layer
- **Arbitrum Sepolia**: DeFi yield farming layer
- **Axelar**: Cross-chain message passing

### Useful Links

Learn more about the technologies used:

- [Turborepo](https://turborepo.com/docs) - Monorepo build system
- [Colyseus](https://colyseus.io/) - Multiplayer game server
- [Phaser](https://phaser.io/) - 2D game engine
- [Privy](https://privy.io/) - Web3 authentication
- [Axelar](https://axelar.network/) - Cross-chain infrastructure
- [Saga](https://saga.xyz/) - Gaming-focused blockchain
- [Arbitrum](https://arbitrum.io/) - Ethereum L2 scaling
