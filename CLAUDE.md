# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo project called "defivalley" built with Turborepo that combines:
- **Web frontend**: Next.js 15 app with React 19 (port 3000)
- **Game server**: Colyseus multiplayer game server 
- **Smart contracts**: Hardhat 3 (alpha) with Solidity contracts for blockchain integration

## Common Commands

### Development
```bash
# Start all services in development mode
pnpm dev

# Start specific service
pnpm dev --filter=web    # Frontend only
pnpm dev --filter=server # Game server only

# Web app runs on port 3000 with Turbopack
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

# Run all tests (both Solidity and Node.js)
npx hardhat test

# Run specific test types
npx hardhat test solidity
npx hardhat test nodejs

# Deploy to local chain
npx hardhat ignition deploy ignition/modules/Counter.ts

# Deploy to Sepolia (requires SEPOLIA_PRIVATE_KEY config)
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```

## Project Architecture

### Monorepo Structure
- `apps/web/` - Next.js frontend application
- `apps/server/` - Colyseus game server
- `packages/` - Smart contracts (Hardhat 3) and shared utilities

### Key Technologies
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Game Server**: Colyseus for real-time multiplayer
- **Blockchain**: Hardhat 3 (alpha) with Solidity 0.8.28
- **Package Management**: pnpm with workspace configuration
- **Build System**: Turborepo with intelligent caching

### Smart Contract Setup
- Uses Hardhat 3 alpha with viem integration
- Configured for Ethereum L1 and Optimism networks
- Includes Foundry-compatible Solidity tests
- Node.js integration tests using native `node:test` runner

### Development Notes
- The project uses Hardhat 3 alpha (not production-ready)
- Web app uses Turbopack for faster development builds
- All packages are written in TypeScript
- Turborepo handles task orchestration and caching

### Network Configuration
- `hardhatMainnet` - Local L1 simulation
- `hardhatOp` - Local Optimism simulation  
- `sepolia` - Ethereum Sepolia testnet (requires private key config)

## Configuration Variables
For blockchain deployment, configure these variables:
- `SEPOLIA_RPC_URL` - Sepolia network RPC endpoint
- `SEPOLIA_PRIVATE_KEY` - Private key for deployment account

Use `npx hardhat keystore set SEPOLIA_PRIVATE_KEY` to securely store the private key.