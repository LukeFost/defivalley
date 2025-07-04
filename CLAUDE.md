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