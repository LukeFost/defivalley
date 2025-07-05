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

## 🎯 **CURRENT PROJECT STATUS: CONSOLIDATED ARCHITECTURE**

**Current Branch**: `develop` - Single stable branch containing all integrated features

### ✅ **Integrated Feature Set (v2.0)**
All features have been successfully consolidated into the develop branch:

1. **🎨 Enhanced UI System** - Clean, minimal interface with improved user experience
2. **🗺️ World Decoration & Tilemap** - Natural terrain generation with cliff collision detection
3. **⚔️ Advanced Character System** - Multi-character support with knight animations and refactored architecture
4. **🌾 Comprehensive Crop System** - Context menus, planting, harvesting, and real-time statistics
5. **🌉 Auto-Bridge Integration** - Squid Router for seamless cross-chain asset transfers

### 🏗️ **Current Architecture Status**
- **Repository State**: Clean single-branch architecture (worktrees removed)
- **Feature Integration**: All systems working together in unified codebase
- **Code Quality**: TypeScript errors identified and ready for resolution
- **Development Ready**: Dependencies installed, foundation stable

## 📋 **IMMEDIATE TODOs & NEXT STEPS**

### 🚨 **High Priority (Must Fix)**
1. **Fix TypeScript Errors in Auto-Bridge Components**
   - Missing `useSquidRouter` export in `useCrossChainTx` hook
   - Type annotations needed for Auto-Bridge component parameters
   - Components: `AutoBridgeSelector.tsx`, `ChainTokenSelector.tsx`, `SquidRouterDemo.tsx`

2. **Add Missing UI Components**
   - Install/create `@/components/ui/context-menu` for crop system
   - Fix import errors in `CropContextMenu.tsx`

3. **Fix Character Config Type Safety**
   - Update `SettingsDialog.tsx` to use new `CharacterDefinitions` type system
   - Replace legacy `CharacterConfig.player.characters` indexing

### 🔧 **Medium Priority (Should Fix)**
4. **Complete Auto-Bridge Integration**
   - Add `axelarTxHash` property to `CrossChainTx` type definition
   - Add Squid Router dependencies to `package.json`
   - Test cross-chain bridge functionality

5. **System Integration Testing**
   - Test all five integrated features working together
   - Verify character system with knight animations
   - Test crop system with context menus and statistics
   - Validate tilemap collision detection

6. **Performance Optimization**
   - Monitor performance with multiple systems running
   - Optimize Phaser rendering with all features active

### 📚 **Documentation & Long-term**
7. **Update Architecture Documentation**
   - Document new character configuration system
   - Create integration guides for each feature
   - Update API documentation for crop and tilemap systems

8. **Create Integration Tests**
   - Test multi-feature interactions (e.g., crops on tilemap)
   - Verify character system works with all game features
   - Cross-chain integration testing

### 🔍 **Quick Fix Checklist**
```bash
# 1. Fix missing context-menu component
pnpm add @radix-ui/react-context-menu

# 2. Add Squid Router dependencies  
pnpm add @0xsquid/sdk

# 3. Run type checking to verify fixes
pnpm check-types

# 4. Test development server
pnpm dev
```

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
  - `app/` - Next.js app router and React components
  - `lib/` - Game architecture (Player class, character configuration)
- `apps/server/` - Colyseus game server
- `packages/contracts/` - Smart contracts (Hardhat 3) and deployment scripts
- `docs/` - Technical documentation and architectural guides

### Key Technologies
- **Frontend**: Next.js 15 + React 19 + Phaser 3 + TypeScript
- **Game Engine**: Phaser 3.90.0 with enhanced character animations and tilemap system
- **Game Server**: Colyseus 0.16 for real-time multiplayer synchronization
- **UI Framework**: Radix UI components with Tailwind CSS styling
- **Character System**: Multi-character support with knight animations and deterministic selection
- **Crop System**: Context-menu driven farming with real-time statistics
- **Tilemap Engine**: LPC tileset integration with collision detection and debug tools
- **Cross-chain Bridge**: Squid Router integration for seamless asset transfers
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

#### Game Features (✅ FULLY INTEGRATED)
- **Enhanced Player Movement**: WASD/Arrow key controls with collision detection against tilemap terrain
- **Advanced Character System**: 9 character types including animated knight with idle/walk/run states
- **Dynamic Tilemap World**: Procedurally generated terrain with cliffs, grass, and collision detection
- **Comprehensive Crop System**: Right-click context menu for planting, harvesting, and crop management
- **Real-time Statistics**: Live crop counters and growth status monitoring
- **Interactive Chat System**: Press Enter to open chat, real-time messaging between players
- **Visual Players**: Character sprites with nameplates, level badges, and current player highlighting
- **Debug Tools**: Console commands for terrain editing, character management, and debug visualization
- **Cross-chain Integration**: Auto-bridge system for seamless asset transfers
- **Connection Management**: Auto-reconnection, fallback URLs, error handling

#### Enhanced Character System Architecture (v2.0)

**Unified Configuration System (`/lib/character.config.ts`)**:
- **CharacterDefinitions**: Type-safe configuration for all character types
- **Dual System Support**: Both spritesheet (RPG) and animation sheet (knight) characters
- **Animation Support**: Idle, walk, run states for animated characters
- **Backward Compatibility**: Legacy CharacterConfig preserved for smooth migration

**Advanced Player Class (`/lib/Player.ts`)**:
- **Polymorphic Sprite Handling**: Automatically detects and handles different character types
- **Animation Management**: Seamless switching between static and animated sprites
- **Enhanced API**: `updateAnimationState()`, `updateMovementState()`, `changeCharacter()`
- **Container-based Architecture**: Clean encapsulation with sprite, nameplate, and level badge

**Intelligent Character Selection**:
- **Global Override**: Current player can set preferred character globally
- **Deterministic Fallback**: Persistent identity based on wallet address/session ID hash
- **Cross-session Persistence**: Character choices saved in localStorage
- **Type Safety**: Full TypeScript support with CharacterType enum

**Performance & Architecture Improvements**:
- ✅ **Unified Character System**: Single codebase handles all character types
- ✅ **Animation Engine**: Efficient Phaser animation management
- ✅ **Memory Optimization**: Smart sprite creation and destruction
- ✅ **Developer Tools**: Console commands for character testing and debugging

See [Character System Documentation](docs/CHARACTER_SYSTEM.md) for complete architecture details.

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

#### 🚨 **Web Server Management Policy**
**IMPORTANT**: Luke will have the web server running manually and manage it himself.

**Claude Instructions**:
- **DO NOT** attempt to start the web server with `pnpm dev` or `npm start`
- **WAIT** for Luke to manually boot up the web server if it's not running
- **IF PORT 3000 IS BUSY**: Use tmux to run on alternative ports (3005-3300)
- **Alternative Port Command**: `cd apps/web && pnpm dev --port 3005` (or any port 3005-3300)
- **Check Status**: Use `curl -s http://localhost:3000 > /dev/null && echo "Server running" || echo "Server not running"`

**Tmux Usage for Alternative Ports**:
```bash
# Create new tmux session with alternative port
tmux new-session -d -s defivalley-web-3005 'cd apps/web && pnpm dev --port 3005'

# List available ports
for port in {3005..3010}; do curl -s "http://localhost:$port" > /dev/null && echo "Port $port: IN USE" || echo "Port $port: Available"; done
```

#### Troubleshooting
- **Connection Refused**: Ensure game server is running on port 2567
- **WASD Interference**: Fixed - movement disabled when chat is active
- **SSR Issues**: Game component uses dynamic loading with `ssr: false`
- **Network Access**: Test with `/test.html` client for connection debugging
- **Dialog Visibility**: Fixed z-index stacking context - dialogs now use `z-[1000]`

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

**Prerequisites:**
- Node.js 22+ (required for Hardhat 3 Alpha)
- Set default Node version: `nvm alias default 22`

```bash
# Install dependencies (already configured)
pnpm install

# Start frontend only (recommended for testing)
cd apps/web
pnpm dev

# Or start all services
pnpm dev

# Access authenticated app
http://localhost:3000
```

**If Turbopack fails:** Remove `--turbopack` from `apps/web/package.json` dev script.

### Frontend Architecture
- **Contract ABIs**: Updated with latest deployment artifacts  
- **Store Management**: Zustand with proper initialization safeguards
- **Error Handling**: Protected against undefined state during hydration
- **Input Controls**: Proper controlled component patterns

### Common Development Issues & Solutions

**🔧 Dialog Visibility Issues**
```bash
# Issue: Dialogs open but are not visible
# Root Cause: Z-index stacking context conflicts
# Solution: Updated z-index hierarchy:
# - Notifications: z-index: 10000 (highest)
# - All Dialogs: z-index: 1000 (above game content)
# - Phaser Canvas: z-index: 0/auto (default)
```

**🔧 BigInt Render Loops**
```bash
# Issue: BigInt serialization errors causing render loops
# Solution: Added to QueryClient configuration:
structuralSharing: false  # Prevents BigInt comparison loops
```

**🔧 Turbopack Error ("Next.js package not found")**
```bash
# Solution: Disable Turbopack temporarily
# Edit apps/web/package.json:
"dev": "next dev --port 3000"  # Remove --turbopack flag
```

**🔧 Node Version Conflicts**
```bash
# Ensure Node 22+ for all dependencies
nvm use 22
nvm alias default 22  # Make it permanent
```

**🔧 Runtime Errors Fixed**
- ✅ `notifications.length` undefined → Added null checks
- ✅ `useUI.getState()` error → Use hook results directly  
- ✅ Controlled input warnings → Ensured `plantAmount || ''` fallbacks
- ✅ Dialog visibility issues → Fixed z-index stacking context
- ✅ BigInt render loops → Added `structuralSharing: false` to QueryClient

### User Experience
- **New Users**: Sign up with email/social → Auto-wallet created → Start playing
- **Crypto Users**: Connect existing wallet → Verify identity → Start playing  
- **Cross-chain**: Seamless switching between gaming (Saga) and DeFi (Arbitrum)
- **Mobile**: Full WalletConnect support for mobile wallet apps

## Transaction Tracker & Block Explorer Integration

The DeFi Valley transaction tracker provides real-time monitoring of cross-chain transactions with direct links to blockchain explorers.

### Explorer Integration Features
- **🔗 Clickable Transaction Hashes**: All transaction hashes are clickable links to their respective block explorers
- **🌐 Multi-Chain Support**: Integrates with Saga Chainlet, Arbitrum Sepolia, and Axelar Network explorers
- **📱 New Tab Opening**: All explorer links open in new tabs for seamless navigation
- **🎯 Smart Chain Detection**: Automatically routes to the correct explorer based on transaction type

### Supported Block Explorers
```typescript
// Explorer URLs for each network
Saga Chainlet: https://yieldfield-2751669528484000-1.sagaexplorer.io/tx/{hash}
Arbitrum Sepolia: https://sepolia.arbiscan.io/tx/{hash}
Axelar Network: https://testnet.axelarscan.io/gmp/{hash}
```

### Transaction Tracking Features
- **📊 Real-time Status Updates**: Live progress tracking through transaction lifecycle
- **🔄 Cross-chain Flow Visualization**: Visual progress through Saga → Axelar → Arbitrum
- **❌ Failed Transaction Analysis**: Direct links to failed transactions for debugging
- **⚡ Retry Functionality**: One-click retry for failed transactions
- **📝 Transaction History**: Persistent history with explorer link access

### Transaction Status Indicators
```typescript
// Transaction lifecycle with explorer access
1. Preparing → Validation and parameter checking
2. Wallet Confirmation → User wallet interaction
3. Saga Transaction → [Clickable: Saga Explorer Link]
4. Cross-chain Bridge → [Clickable: Axelar Explorer Link]  
5. DeFi Deposit/Harvest → [Clickable: Arbitrum Explorer Link]
6. Completed → Full cross-chain flow success
```

### Developer Usage
```typescript
// Transaction tracker automatically handles explorer links
import TransactionTracker from '@/components/TransactionTracker';

// Explorer URL generation (built-in)
const getExplorerUrl = (txHash: string, chain: 'saga' | 'arbitrum' | 'axelar') => {
  // Automatically routes to correct explorer
};

// Usage in components
<TransactionTracker /> // Includes all explorer integration
```

### Debugging Failed Transactions
When transactions fail (like gas issues), users can:
1. **Click the transaction hash** in the tracker
2. **View detailed error information** in the block explorer
3. **Analyze gas usage and failure reasons**
4. **Use the retry button** for automatic retry with adjusted parameters

**Example**: Failed Saga transaction due to low gas
- Transaction Hash: `0xf2802f37...d7efe` 
- Explorer Link: [Saga Explorer](https://yieldfield-2751669528484000-1.sagaexplorer.io/tx/0xf2802f3782eb191486f4d047c7c470f1b2937f15e34f0f4ed4ed8bf0d2ad7efe)
- Status: Gas < 0.1 Gwei → User can see exact failure reason

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
5. **Security Setup**: Configure pause operators and deposit caps
6. **Verification**: Run status scripts for confirmation

## 🛡️ Security Architecture (PRODUCTION-READY)

### Circuit Breaker System
**DeFiVault.sol** includes OpenZeppelin Pausable with enhanced controls:

```solidity
// Emergency pause controls
function emergencyPause(string reason) external onlyPauseOperator
function emergencyUnpause() external onlyOwner
function addPauseOperator(address operator) external onlyOwner
function removePauseOperator(address operator) external onlyOwner
```

**Protected Functions:**
- `claimYield()` - ✅ `whenNotPaused` 
- `_processDeposit()` - ✅ `whenNotPaused`
- `_processHarvest()` - ✅ `whenNotPaused`
- `_execute()` - ✅ `whenNotPaused`

**Emergency Functions (work when paused):**
- `emergencyWithdraw()` - ✅ `whenPaused` (players can withdraw principal)

### Deposit Cap Protection
```solidity
// Deposit cap validation
uint256 public totalDepositCap; // Default: 1M USDC
uint256 public totalDeposited;  // Running counter

function setDepositCap(uint256 newCap) external onlyOwner {
    require(newCap >= totalDeposited, "cap < current deposits");
    totalDepositCap = newCap;
}
```

### Command Routing Security
**Enhanced cross-chain message routing:**
```solidity
enum Command { INVALID, DEPOSIT, HARVEST, EMERGENCY_WITHDRAW, UPDATE_PLAYER_STATE }

function _execute(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload) 
    internal override whenNotPaused {
    // Command validation and routing
    (Command command, address player, uint256 amount, bytes32 txId) = abi.decode(payload, (...));
    
    if (command == Command.DEPOSIT) _processDeposit(...);
    else if (command == Command.HARVEST) _processHarvest(...);
    else if (command == Command.EMERGENCY_WITHDRAW) _processEmergencyWithdraw(...);
    else revert InvalidCommand();
}
```

### One-Click Harvest Implementation
**GameController.sol** enhanced harvest functions:
```solidity
// Single seed harvest with cross-chain yield claim
function harvestSeed(uint256 seedId, address gasToken) external payable nonReentrant

// Batch harvest multiple seeds
function batchHarvestSeeds(uint256[] seedIds, address gasToken) external payable nonReentrant

// Emergency harvest (local only, no cross-chain)
function emergencyHarvestSeed(uint256 seedId) external

// Utility: Get all harvestable seeds for a player
function getHarvestableSeeds(address player) external view returns (...)
```

### Security Monitoring & Controls
```bash
# Emergency pause (multiple operators can trigger)
cast send $DEFI_VAULT "emergencyPause(string)" "Suspicious activity detected" --rpc-url $ARBITRUM_RPC

# Owner-only unpause
cast send $DEFI_VAULT "emergencyUnpause()" --rpc-url $ARBITRUM_RPC

# Update deposit cap
cast send $DEFI_VAULT "setDepositCap(uint256)" "2000000000000" --rpc-url $ARBITRUM_RPC

# Check security status
cast call $DEFI_VAULT "getEmergencyState()" --rpc-url $ARBITRUM_RPC
cast call $DEFI_VAULT "paused()" --rpc-url $ARBITRUM_RPC
cast call $DEFI_VAULT "totalDeposited()" --rpc-url $ARBITRUM_RPC
cast call $DEFI_VAULT "totalDepositCap()" --rpc-url $ARBITRUM_RPC
```

### Security Best Practices Implemented
✅ **Replay Protection**: Command tracking with `processedCommands` mapping  
✅ **Circuit Breaker**: Multi-operator pause system with owner-only unpause  
✅ **Deposit Caps**: Real-time validation with configurable limits  
✅ **Command Validation**: Enum-based routing with invalid command rejection  
✅ **Emergency Functions**: Principal withdrawal when protocol is paused  
✅ **Access Control**: Role-based permissions for critical functions  
✅ **Gas Optimization**: Nested-if command routing for efficiency  
✅ **Event Emission**: Comprehensive logging for monitoring and alerts

## 🔒 Repository Security & Public Release Guidelines

### CRITICAL: This repository is PUBLIC and hackathon-ready
- **✅ NO SENSITIVE FILES COMMITTED**: Private keys, API keys, and secrets are properly excluded
- **✅ CLAUDE DIRECTORIES PROTECTED**: Both `.claude/` and `claude/` are gitignored but preserved locally
- **✅ ENVIRONMENT SECURITY**: All `.env` files are gitignored and contain only local development data
- **✅ CLEAN GIT HISTORY**: No sensitive data has ever been committed to version control

### Files That Must NEVER Be Committed:
- `.env` files (contain private keys and API credentials)
- `.mcp.json` (contains OpenAI API keys)
- `.claude/` and `claude/` directories (AI development brain)
- `.vscode/` (IDE settings)
- `.npmrc` (package registry credentials)
- `temp_*.json` (temporary build artifacts)

### Safe for Public Viewing:
- All source code in `apps/` and `packages/`
- Configuration files (hardhat.config.ts, package.json, etc.)
- Documentation and README files
- Smart contract code and deployment scripts
- `.env.example` files (templates without real values)

### Local Development Security:
- Private keys exist only in local `.env` files
- API keys stored locally in `.mcp.json`
- AI documentation in `claude/` directories (local only)
- Use `npx hardhat keystore set` for secure key management
- Never commit real credentials - only use placeholders in public files

### If Sensitive Data is Accidentally Committed:
1. **STOP** - Do not push to remote
2. **Rotate keys immediately** - Generate new private keys and API keys
3. **Rewrite git history** - Use git filter-branch or BFG to remove
4. **Update .gitignore** - Ensure patterns catch the sensitive files
5. **Verify clean** - Double-check no secrets remain in history

This repository is configured for safe public sharing while preserving local development capabilities.

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