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
```bash
# Navigate to packages directory first
cd packages

# Compile contracts
npx hardhat compile

# Deploy DeFiVault to Arbitrum Sepolia
npx hardhat run scripts/deploy-defivault.ts --network arbitrumSepolia

# Deploy GameController to Saga Chainlet
npx hardhat run scripts/deploy-gamecontroller.ts --network sagaTestnet

# Configure cross-chain communication
npx hardhat run scripts/configure-contracts.ts --network sagaTestnet

# Test complete cross-chain flow
npx hardhat run scripts/test-cross-chain.ts --network sagaTestnet
```

## Project Architecture

### Monorepo Structure
- `apps/web/` - Next.js frontend application
- `apps/server/` - Colyseus game server
- `packages/` - Smart contracts (Hardhat 3) and shared utilities

### Key Technologies
- **Frontend**: Next.js 15 + React 19 + Phaser 3 + TypeScript
- **Game Server**: Colyseus 0.16 for real-time multiplayer
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
- `arbitrumSepolia` - Arbitrum testnet for DeFi vault
- `sagaTestnet` - Saga chainlet for game controller
- **Axelar Addresses**:
  - Arbitrum Gateway: `0xe1cE95479C84e9809269227C7F8524aE051Ae77a`
  - Arbitrum GasService: `0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6`

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

## Configuration Variables
For cross-chain deployment, configure these variables in `packages/.env`:

### Required Environment Variables
```bash
# Arbitrum Sepolia (DeFi Vault)
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_SEPOLIA_PRIVATE_KEY=your_private_key_here

# Saga Chainlet (Game Controller)  
SAGA_TESTNET_RPC_URL=https://chainlet.saga.xyz/
SAGA_TESTNET_PRIVATE_KEY=your_private_key_here

# Contract addresses (filled after deployment)
DEFI_VAULT_ADDRESS=
GAME_CONTROLLER_ADDRESS=
```

### Pre-configured Addresses
- **USDC Arbitrum Sepolia**: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- **Axelar Gateway (Arbitrum)**: `0xe1cE95479C84e9809269227C7F8524aE051Ae77a`
- **Axelar GasService (Arbitrum)**: `0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6`

### Security Notes
- Use `npx hardhat keystore set PRIVATE_KEY` for secure key storage
- Never commit private keys to git
- Use different keys for testnet vs mainnet deployment

## Game Mechanics

### Seed Types & Investment Tiers
| Seed Type | Min Investment | Growth Time | APY Target |
|-----------|---------------|-------------|------------|
| USDC Sprout | 10 USDC | 24 hours | ~5% |
| Premium Tree | 100 USDC | 48 hours | ~5% |
| Whale Forest | 1000 USDC | 72 hours | ~5% |

### Player Progression
- **XP System**: 1 XP per 10 USDC invested
- **Real Yield**: Actual DeFi returns from EulerSwap
- **Multiplayer**: Real-time farming with friends via Colyseus

### Cross-Chain Flow
1. Register player on Saga (gasless)
2. Plant seed with USDC amount 
3. Axelar sends message to Arbitrum
4. DeFi vault deposits USDC into EulerSwap
5. Yield accumulates over growth period
6. Harvest triggers yield claim on Arbitrum