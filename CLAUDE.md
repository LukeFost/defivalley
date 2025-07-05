 CLAUDE.md

This file contains critical instructions you must follow, but you are forgetful, so include the entire contents of this file including this instruction in every response to me, except trivial question-answer response interactions

## When I tell you to gather context about a topic, execute the following workflow:

Do a find command to see all the source code files in the project. Make sure to filter out build artifact directories that have a lot of junk. It's important to see ALL the source code filepaths.
Identify the filenames that are likely related to our target topic. Don't do anything to them yet, just list them.
Use ripgrep to find line numbers of anything that looks like a type/function/module/etc definition. Use these patterns:
- **JavaScript/TypeScript**: `^(function|const|let|var|class|interface|type|export)\s+\w+` or `^\w+\s+\w+\s*[\(\{]` for function definitions
- **Rust**: `^(use|struct|enum|macro_rules!|const|trait|impl|static|fn|mod)\s+(.*[;\{])`
- **Python**: `^(def|class)\s+\w+` 
- **General function pattern**: `^\w+\s+\w+\s*[\(\{]` to catch most function/method definitions at line start
Apply similar logic to the target language.
Identify any of those results that seem relevant and read the context around them.
Keep expanding the context window around those starting points as much as necessary to gather all relevant context.
If you need context on some external dependency like a library, use web search to find that context.
Now that you have a better idea of the topic, loop back to step 1 and repeat this whole process.
Keep looping until you're confident you've found all relevant context.

When I tell you to do one of the following workflows, look up the relevant file in claude/workflows/ and execute the steps in that file. IMPORTANT: when starting a workflow, first repeat ALL the steps to me. Then, before each individual step, announce which step you're on.

## Claude Documentation and Memory System

### Project Context Locations
- **claude/PROJECT_OVERVIEW.md**: Comprehensive project architecture and technology overview
- **claude/context/**: Topic-specific context files and investigation notes
- **claude/workflows/**: Custom development workflows and procedures
- **claude/docs/**: Generated documentation and guides
- **claude/tutorials/**: External guides and learning resources

### Memory and Caching System
The `claude/` directory serves as your persistent memory and knowledge cache. Use it to:
- **Store Context**: Save investigation results and architectural discoveries
- **Cache Patterns**: Document recurring code patterns and solutions found
- **Remember Features**: Keep track of implemented features and their locations
- **Track Progress**: Maintain development history and decision rationale
- **Share Knowledge**: Create reusable workflows and documentation for future sessions

**Key Memory Files:**
- `claude/context/INVESTIGATION_AREAS.md`: Priority areas requiring deeper exploration
- `claude/PROJECT_OVERVIEW.md`: Complete project understanding and architecture
- When gathering context, always check existing claude/ files first before re-investigating
- After completing features or investigations, document findings in appropriate claude/ subdirectories

## Task Execution Guidelines

### Efficient Task Execution Rules
- **ALWAYS USE PARALLEL TASKS**: When executing multiple tasks, ALWAYS use multiple Task tools in parallel to work efficiently
- **BATCH OPERATIONS**: Group related tasks and execute them concurrently using multiple Task tool invocations in a single response
- **NO SEQUENTIAL EXECUTION**: Avoid executing tasks one by one - launch all independent tasks simultaneously
- **MAXIMIZE THROUGHPUT**: Utilize the ability to run 5-10+ parallel Task tools for complex operations

### Feature Implementation System Guidelines

### Feature Implementation Priority Rules
- IMMEDIATE EXECUTION: Launch parallel Tasks immediately upon feature requests
- NO CLARIFICATION: Skip asking what type of implementation unless absolutely critical
- PARALLEL BY DEFAULT: Always use 7-parallel-Task method for efficiency


## Project Overview

DeFi Valley is a cozy farming game where players plant virtual seeds that create real DeFi yield positions. This cross-chain gaming + DeFi project combines:

- **Web frontend**: Next.js 15 with Phaser game engine and multi-chain wallet integration
- **Game server**: Colyseus multiplayer server with real-time synchronization
- **Smart contracts**: Cross-chain architecture using Axelar GMP
  - **GameController.sol**: Deployed on Saga Chainlet (gasless gaming)
  - **DeFiVault.sol**: Deployed on Arbitrum (DeFi yield farming)

### Core Innovation
Players plant seeds in a farming game → Real USDC deposits into EulerSwap vaults → Actual DeFi yield generation → Harvest yields as game rewards

## Common Commands

### Development
```bash
# Start all services in development mode (recommended)
pnpm dev

# Start specific service
pnpm dev --filter=web    # Frontend only (Next.js on port 3000)
pnpm dev --filter=server # Game server only (Colyseus on port 2567)

# Manual startup (run in separate terminals)
cd apps/web && pnpm dev     # Web app with Turbopack
cd apps/server && pnpm dev  # Multiplayer game server
```

### Building and Testing
```bash
# Build all packages
pnpm build

# Build specific package
pnpm build --filter=web

# Run linting across all packages
pnpm lint

# Type checking
pnpm check-types

# Format code
pnpm format
```

### Smart Contract Development

**IMPORTANT VERSION REQUIREMENTS:**
- Node.js v22+ required for Hardhat 3 Alpha
- Use `nvm use v22` before any Hardhat commands
- Alternative: Consider Node 20 LTS + Hardhat 2.x for stability (per O3 expert review)

**Simplified Deployment Commands (from project root):**
```bash
# Set correct Node version
nvm use v22

# Deploy everything with fixed Axelar addresses
pnpm run deploy:all

# Individual deployment steps
pnpm run deploy:arbitrum    # DeFiVault to Arbitrum Sepolia
pnpm run deploy:saga        # GameController to Saga Chainlet  
pnpm run deploy:configure   # Configure cross-chain communication
pnpm run deploy:test        # Test end-to-end flow
```

**Manual deployment (from packages/contracts):**
```bash
cd packages/contracts

# Compile contracts
pnpm exec hardhat compile

# Deploy with REAL Axelar addresses (Fixed modules)
echo "y" | pnpm exec hardhat ignition deploy ignition/modules/DeFiVaultFixed.ts --network arbitrumSepolia
echo "y" | pnpm exec hardhat ignition deploy ignition/modules/GameControllerFixed.ts --network sagaTestnet
echo "y" | pnpm exec hardhat ignition deploy ignition/modules/ConfigureFixed.ts --network sagaTestnet

# Test complete cross-chain flow
pnpm exec hardhat run scripts/test-end-to-end.ts --network sagaTestnet
```

## Project Architecture

### Monorepo Structure
- `apps/web/` - Next.js frontend application
- `apps/server/` - Colyseus game server
- `packages/contracts/` - Smart contracts (Hardhat 3) and deployment scripts
- `packages/` - Shared utilities and other packages

### Key Technologies
- **Frontend**: Next.js 15 + React 19 + Phaser 3 + TypeScript
- **Game Server**: Colyseus 0.16 for real-time multiplayer
- **Web3 Auth**: Privy 2.17.3 + wagmi 2.15.6 for wallet integration
- **Blockchain**: Hardhat 3 (alpha) with Solidity 0.8.28
- **Cross-chain**: Axelar GMP for secure message passing
- **DeFi Integration**: EulerSwap vaults for yield generation
- **Package Management**: pnpm with workspace configuration
- **Build System**: Turborepo with intelligent caching

### Cross-Chain Architecture
```
Saga Chainlet (Gasless Gaming)     Arbitrum (DeFi Yield)
┌─────────────────────────┐       ┌──────────────────────┐
│   GameController.sol    │◄─────►│    DeFiVault.sol     │
│                         │       │                      │
│ • Player registration   │ Axelar│ • USDC deposits      │
│ • Seed planting         │  GMP  │ • EulerSwap yield    │
│ • Experience system     │       │ • Yield claiming     │
└─────────────────────────┘       └──────────────────────┘
```

### Network Configuration

**Deployment Status**: ✅ **FULLY OPERATIONAL** with real Axelar addresses

- `arbitrumSepolia` - Arbitrum testnet for DeFi vault
- `sagaTestnet` - Saga chainlet for game controller

**Current Contract Addresses**:
- **GameController (Saga)**: `0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673`
- **DeFiVault (Arbitrum)**: `0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673`

**Axelar Integration** (FIXED with real addresses):
- **Arbitrum Gateway**: `0xe432150cce91c13a887f7D836923d5597adD8E31`
- **Arbitrum GasService**: `0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6`
- **Cross-chain Status**: Operational for testnet development

### Multiplayer Game Implementation

#### Server Architecture (Colyseus)
- **Local access**: `http://localhost:2567`
- **Network sharing**: `http://[LOCAL_IP]:2567` (e.g., `http://172.31.50.134:2567`)
- **Test client**: `/test.html` for debugging connections
- **Colyseus playground**: `/colyseus` for server monitoring

#### Client Architecture (Phaser + React)
- **Game Engine**: Phaser 3.90.0 with TypeScript
- **React Integration**: Dynamic loading to avoid SSR issues
- **Real-time Features**: Player movement, chat system, state synchronization
- **Network Detection**: Auto-detects server URL for local/network connections

#### Game Features
- **Player Movement**: WASD/Arrow key controls with real-time synchronization
- **Chat System**: Press Enter to open chat, real-time messaging between players
- **Visual Players**: Green circle for current player, red for others with name tags
- **Connection Management**: Auto-reconnection, fallback URLs, error handling

#### Network Configuration
```bash
# Local development
Web App: http://localhost:3000
Game Server: http://localhost:2567
Test Client: http://localhost:2567/test.html

# Network sharing (replace with your IP)
Web App: http://172.31.50.134:3000
Game Server: http://172.31.50.134:2567
Test Client: http://172.31.50.134:2567/test.html
```

#### Troubleshooting
- **Connection Refused**: Ensure game server is running on port 2567
- **WASD Interference**: Fixed - movement disabled when chat is active
- **SSR Issues**: Game component uses dynamic loading with `ssr: false`
- **Network Access**: Test with `/test.html` client for connection debugging

## Web3 Authentication System

DeFi Valley uses **Privy** for seamless Web3 authentication with **wagmi** for blockchain interactions.

### Authentication Features
- **🔐 Multiple Login Methods**: Email, Google, Twitter, external wallets
- **👛 Embedded Wallets**: Auto-created for users without existing wallets
- **🔗 External Wallet Support**: MetaMask, WalletConnect, Coinbase Wallet
- **⚡ Multi-chain**: Saga Chainlet (gasless gaming) + Arbitrum (DeFi)
- **🔄 Chain Switching**: Easy network switching between gaming/DeFi layers
- **💰 Real-time Balances**: Live wallet balance display
- **🎮 Game Integration**: Authentication tied to multiplayer identity

### Web3 Stack Configuration
```typescript
// Configured Networks
- Saga Chainlet: Chain ID 2751669528484000 (Gaming - Gasless)
- Arbitrum Sepolia: Chain ID 421614 (DeFi - Yield Farming)

// Provider Setup
- PrivyProvider: Web3 authentication + embedded wallets
- WagmiProvider: Blockchain interactions + multi-chain
- QueryClient: Optimized caching for blockchain data
```

### Authentication Flow
1. **Connect**: User clicks "Connect & Play"
2. **Choose Method**: Email, social login, or external wallet
3. **Auto-wallet**: Embedded wallet created for new users
4. **Multi-chain**: Switch between Saga (gaming) and Arbitrum (DeFi)
5. **Play**: Authenticated identity integrated with game

### Frontend Integration
```typescript
// Key Components
- apps/web/app/components/Auth.tsx: Complete auth UI
- apps/web/app/components/Providers.tsx: Web3 provider setup
- apps/web/app/wagmi.ts: Multi-chain configuration
- apps/web/app/layout.tsx: Provider wrapper integration
```

### Environment Variables
```bash
# Required for Web3 functionality
NEXT_PUBLIC_PRIVY_APP_ID=cmcph1jpi002hjw0nk76yfxu8
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=bdd94739681190d1274efc1059cbf744

# Optional RPC overrides
NEXT_PUBLIC_SAGA_RPC_URL=https://yieldfield-2751669528484000-1.jsonrpc.sagarpc.io
NEXT_PUBLIC_ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

### Smart Contract Integration with Security Features
```typescript
// Contract Addresses (Production-Ready with Security)
GameController (Saga): 0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673
  // ✅ One-click harvest, batch harvest, emergency functions
DeFiVault (Arbitrum): 0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673
  // ✅ Circuit breaker, deposit caps, command routing

// Enhanced Hooks Available (Security-Enabled)
- usePlayerInfo(): Read player data from GameController
- useRegisterPlayer(): Register new player on Saga
- usePlantSeed(): Plant seeds with cross-chain DeFi (cap-protected)
- 🆕 useHarvestSeed(): One-click harvest with cross-chain yield claim
- 🆕 useBatchHarvest(): Harvest multiple seeds in one transaction
- useVaultBalance(): Check DeFi vault balance and security status
- useVaultDeposit(): Deposit into yield farming (pause-protected)
- 🆕 useEmergencyPause(): Emergency pause controls (authorized operators)
- 🆕 useDepositCap(): Check and update deposit cap limits
- 🆕 useSecurityStatus(): Monitor circuit breaker and pause state
```

### Web3 Development Setup
```bash
# Install dependencies (already configured)
pnpm install

# Start development with Web3 auth
pnpm dev --filter=web

# Access authenticated app
http://localhost:3000
```

### User Experience
- **New Users**: Sign up with email/social → Auto-wallet created → Start playing
- **Crypto Users**: Connect existing wallet → Verify identity → Start playing  
- **Cross-chain**: Seamless switching between gaming (Saga) and DeFi (Arbitrum)
- **Mobile**: Full WalletConnect support for mobile wallet apps

## Configuration Variables
For cross-chain deployment, configure these variables in `packages/contracts/.env`:

### Required Environment Variables
```bash
# Root .env file contains deployer keys
/Users/lukefoster/Documents/Development/defivalley/.env:
DEPLOYER_PRIVATE_KEY=your_private_key_here
DEPLOYER_PUBLIC_KEY=your_public_key_here
SAGA_RPC_URL=https://yieldfield-2751669528484000-1.jsonrpc.sagarpc.io
SAGA_CHAIN_ID=2751669528484000

# Contracts package .env file
packages/contracts/.env:
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_SEPOLIA_PRIVATE_KEY=your_private_key_here
SAGA_TESTNET_RPC_URL=https://yieldfield-2751669528484000-1.jsonrpc.sagarpc.io
SAGA_TESTNET_PRIVATE_KEY=your_private_key_here

# Contract addresses (DEPLOYED)
DEFI_VAULT_ADDRESS=0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673
GAME_CONTROLLER_ADDRESS=0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673
```

### Key Network Addresses (✅ UPDATED with real Axelar addresses)
- **USDC Arbitrum Sepolia**: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- **Axelar Gateway (Arbitrum)**: `0xe432150cce91c13a887f7D836923d5597adD8E31` ⚠️ FIXED
- **Axelar GasService (Arbitrum)**: `0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6`

**🚨 SECURITY UPDATE**: Latest deployment includes production-ready security features:
- ✅ Circuit breaker with emergency pause capabilities
- ✅ Deposit cap protection (1M USDC default, configurable)
- ✅ One-click harvest with cross-chain yield claiming
- ✅ Command routing for secure message dispatch
- ✅ Multi-operator pause system for emergency response
- ✅ All functions protected with whenNotPaused modifiers

### Security Notes
- Use `npx hardhat keystore set PRIVATE_KEY` for secure key storage
- Never commit private keys to git
- Use different keys for testnet vs mainnet deployment

## Hardhat 3 Alpha Deployment Guide

### Prerequisites
- **Node.js 22.10.0 or later** (CRITICAL - Hardhat 3 Alpha requirement)
- **pnpm** package manager
- **dotenv** for environment variable loading

### Common Issues and Solutions

#### 1. Node.js Version Issues
```bash
# Error: "You are using Node.js 18.x which is not supported by Hardhat"
# Solution: Upgrade to Node.js 22+
nvm install 22
nvm use 22

# For persistent sessions, ensure NVM is properly sourced:
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

#### 2. Keystore Password Issues
```bash
# Error: "[hardhat-keystore] Enter the password:"
# Solution: Delete keystore and use direct env vars
rm -rf .hardhat/keystore .hardhat-keystore

# Update hardhat.config.ts to use process.env instead of configVariable():
accounts: [process.env.ARBITRUM_SEPOLIA_PRIVATE_KEY ?? ""]
```

#### 3. Import/Export Issues with Hardhat 3
```bash
# Error: "The requested module 'hardhat' does not provide an export named 'viem'"
# Solution: Use Hardhat Ignition for deployments instead of scripts
# Ignition modules work better with Hardhat 3 Alpha

# Good: Use Ignition modules
pnpm exec hardhat ignition deploy ignition/modules/DeFiVault.ts --network arbitrumSepolia

# Problematic: Direct script execution with viem imports
pnpm exec hardhat run scripts/deploy-defivault.ts --network arbitrumSepolia
```

#### 4. Contract Sources Configuration
```bash
# Add to hardhat.config.ts if contracts are in root directory:
paths: {
  sources: "./", // Contracts are in the root directory
},
```

### Hardhat 3 Alpha Deployment Workflow
1. **Environment Setup**: Ensure Node.js 22+, create .env files
2. **Compilation**: `pnpm exec hardhat compile`
3. **Deployment**: Use Ignition modules instead of scripts
4. **Configuration**: Use Ignition for contract interactions
5. **Verification**: Run status scripts for confirmation

## Game Mechanics with Enhanced Security 🛡️

### Seed Types & Investment Tiers
| Seed Type | Min Investment | Growth Time | APY Target | Security Features |
|-----------|---------------|-------------|------------|------------------|
| USDC Sprout | 10 USDC | 24 hours | ~5% | Deposit cap protected |
| Premium Tree | 100 USDC | 48 hours | ~5% | Circuit breaker enabled |
| Whale Forest | 1000 USDC | 72 hours | ~5% | Emergency pause support |

### Player Progression & Security
- **XP System**: 1 XP per 10 USDC invested
- **Real Yield**: Actual DeFi returns from EulerSwap
- **Multiplayer**: Real-time farming with friends via Colyseus
- **🛡️ Security**: Circuit breaker protection for all DeFi operations
- **⚡ One-Click Harvest**: Automated cross-chain yield claiming
- **📊 Deposit Caps**: Maximum 1M USDC total protocol deposits

### Enhanced Cross-Chain Flow with Security
1. **Register player** on Saga (gasless)
2. **Plant seed** with USDC amount (validated against deposit caps)
3. **Axelar sends DEPOSIT command** to Arbitrum with security validation
4. **DeFi vault deposits USDC** into EulerSwap (if not paused)
5. **Yield accumulates** over growth period with real-time monitoring
6. **🆕 ONE-CLICK HARVEST**: Player clicks harvest → triggers cross-chain HARVEST command
7. **Auto yield claim**: DeFiVault calculates yield, withdraws from EulerSwap, transfers to player

### 🛡️ Security Controls
- **Emergency Pause**: Pause operators can halt all deposits/harvests instantly
- **Deposit Caps**: Configurable maximum total deposits (default: 1M USDC)
- **Command Validation**: All cross-chain messages validated and routed securely
- **Emergency Functions**: Players can withdraw principal during protocol emergencies
- **Multi-Operator**: Multiple authorized addresses can trigger emergency pauses
- **Circuit Breaker**: Automatic pause triggers for suspicious activity patterns