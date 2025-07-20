# DeFi Valley 🏕️

A cozy farming game where your crops are powered by real DeFi protocols. Plant seeds, earn yield, and watch your digital farm grow with actual blockchain value.

## 📋 Current Status

**Version**: 2.0 - Refactored Local-Only Visualizer  
**State**: Stable single-player farming game without blockchain dependencies

### Recent Changes (v2.0)
- ✅ **Removed broken components**: WorldBrowser, TransactionTracker, and multiplayer features
- ✅ **Simplified planting UI**: Removed blockchain/USDC references, now uses local storage
- ✅ **Removed chat system**: No longer includes multiplayer chat functionality  
- ✅ **Local-only game loop**: Plant, grow, and harvest crops without any blockchain transactions
- ✅ **Clean architecture**: Removed dead code and unused manager classes

### Working Features
- 🌱 **Local Farming**: Plant seeds via dialog, crops grow over time, harvest when ready
- 🎮 **Player Movement**: WASD/Arrow keys for movement with collision detection
- 🏗️ **Tilemap World**: Procedurally generated terrain with cliffs and grass
- 🎨 **Character System**: Multiple character sprites with animations
- 📊 **Crop Statistics**: Real-time counters for total, growing, and ready crops
- 💰 **Gold System**: Earn gold by harvesting crops (local currency)

### Known Limitations
- No blockchain integration (removed for stability)
- No multiplayer support (server components removed)
- No DeFi yield generation (local-only game)
- No cross-chain features (simplified to single-player)

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
- **Game Server**: Colyseus multiplayer framework with secure authentication
- **Auth**: Privy Web3 authentication with embedded wallets + secure session management
- **Smart Contracts**: Hardhat 3 Alpha + Solidity 0.8.28
- **Cross-Chain**: Axelar General Message Passing (GMP)
- **DeFi Integration**: EulerSwap yield farming on Arbitrum
- **Security**: OpenZeppelin + custom circuit breakers + rate limiting + input validation

### Live Demo
🚀 **Try it now**: [Insert your deployed URL here]
- **Beautiful Cozy Farming World**: Professional 2D farming environment with animations
- **Real-Time Multiplayer**: See other players farming, moving, and chatting in real-time
- **Cross-Chain DeFi Integration**: Plant USDC seeds that generate real yield on Arbitrum
- **Professional Game Experience**: Polished visuals, farming plots, animated trees, and elegant UI

### Key Features

- **🌾 Beautiful Farming World**: Professional cozy farming environment with layered backgrounds, animated trees, and organized farm plots
- **🎮 Real-Time Multiplayer**: Live player movement, chat, and farming with smooth character animations and directional sprites
- **🏠 Personal Farm Worlds**: Each player has their own persistent farm world with visitor system
- **🌍 World Browser**: Discover and visit other players' farms with search and pagination
- **🌱 Visual Seed Planting**: Interactive farming plots where USDC deposits become visual crops that grow over time
- **⚡ Gas-Free Gaming**: Built on Saga Chainlets for seamless, zero-cost gameplay interactions
- **🔗 Cross-Chain Magic**: Invisible Axelar GMP integration - plant on Saga, earn yield on Arbitrum
- **💬 Elegant Chat System**: Real-time messaging with farming-themed UI and proper input handling
- **🎨 Professional Polish**: Smooth animations, proper sprite scaling, farming badges, and cozy atmosphere
- **🔒 Enterprise Security**: Rate limiting, input validation, secure authentication, and permission-based actions

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

#### Beautiful Farming Experience
1. **Start the farm**: `pnpm dev`
2. **Enter DeFi Valley**: http://localhost:3000
3. **Connect wallet**: Use email, social login, or crypto wallet
4. **Explore the farm**: Beautiful layered world with sky, grass, soil, and 32 organized farming plots
5. **Meet other farmers**: See real players with unique character sprites and farming badges

#### Game Controls & Features
- **Movement**: WASD or Arrow keys (with directional sprite animations)
- **Chat**: Press Enter to open elegant chat interface
- **Farming**: Click plots to plant USDC seeds (connects to real DeFi)
- **Visual Elements**: Animated trees, swaying plants, farming paths, and cozy atmosphere
- **Multiplayer**: Real-time player synchronization with deterministic character selection
- **Character System**: 8 unique character types with persistent identity (see [Character System Docs](docs/CHARACTER_SYSTEM.md))

#### Network Multiplayer
1. **Local farming**: Multiple browser tabs for testing
2. **Share the farm**: Use your IP address (e.g., `http://192.168.1.100:3000`)
3. **Debug tools**: Test client at `http://[YOUR_IP]:2567/test.html`
4. **Professional experience**: Polished visuals ready for public demonstration

## 🛠️ Development

### Project Structure

```
defivalley/
├── apps/
│   ├── web/           # Next.js frontend + Phaser game
│   │   ├── app/       # Next.js app router
│   │   ├── lib/       # Game architecture (Player class, character config)
│   │   └── components/# React components and Phaser scenes
│   └── server/        # Colyseus multiplayer server
├── packages/
│   └── contracts/     # Hardhat 3 Alpha smart contracts
├── docs/              # Technical documentation
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

### Game Architecture

#### Character System
- **Configuration-driven**: Centralized sprite metadata in `lib/character.config.ts`
- **Object-oriented**: Player class encapsulates visual elements and behavior
- **Type-safe**: Full TypeScript coverage for character types and directions
- **Performance optimized**: Eliminated runtime image processing for faster loading
- **Secure Authentication**: Player IDs tied to wallet addresses, not session IDs

See [Character System Documentation](docs/CHARACTER_SYSTEM.md) for detailed architecture.

### API Endpoints

#### Get Active Worlds
```http
GET /api/worlds?page=1&limit=20&search=player_name
```
Returns paginated list of active farm worlds with search functionality.

**Response:**
```json
{
  "worlds": [
    {
      "playerId": "0x123...",
      "playerName": "FarmOwner",
      "cropCount": 5,
      "lastActivity": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### Check World Exists
```http
GET /api/worlds/:worldId/exists
```
Validates if a world exists. Input validation prevents SQL injection.

**Response:**
```json
{
  "exists": true,
  "worldId": "validated_world_id"
}
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

## 🎨 Game Experience & Visual Features

### Beautiful Farming World
- **🌤️ Layered Backgrounds**: Sky blue gradients, lush green grass, and rich brown soil
- **🌾 32 Farming Plots**: Organized 8x4 grid ready for planting USDC seeds
- **🌳 Animated Nature**: 8 trees with gentle swaying animations for organic feeling
- **🛤️ Pathways**: Sandy walkways connecting different farm areas
- **🎭 Professional Character System**: Full sprite sheet utilization with directional animations

### Advanced Multiplayer Features
- **👥 Real Player Characters**: Each player gets unique character from 252-sprite collection
- **🌱 Farming Badges**: Current player displays special farming indicator
- **💬 Elegant Chat Interface**: Farming-themed messaging with proper focus handling
- **📍 Directional Movement**: Characters face the direction they're moving
- **🎯 Professional Polish**: 2x sprite scaling, smooth animations, proper UI layouts

### Technical Innovation
- **🔄 Dynamic Sprite Processing**: Automatic magenta background removal for clean sprites
- **⚡ Optimized Animations**: Staggered tree swaying and plant movements for performance
- **📱 Responsive Design**: Beautiful experience on desktop and mobile devices
- **🎮 Game Engine**: Phaser 3.90.0 with TypeScript for robust game development

### 🚨 Troubleshooting

#### Common Issues

**Beautiful Game Not Loading**
- Ensure both frontend and game server are running: `pnpm dev`
- Check browser console for sprite loading errors
- Try refreshing if character animations don't appear

**Movement or Chat Issues**
- Movement automatically disabled during chat - press Escape to close
- Characters should show directional sprites when moving
- Check network tab for WebSocket connection issues

**Multiplayer Connection Problems**
1. Verify game server is running on port 2567
2. Test with multiple browser tabs locally first
3. For network play, share your IP address (check server logs)
4. Use debug client: http://[YOUR_IP]:2567/test.html

**Permission Errors**
- Only farm owners can plant/harvest crops in their world
- Visitors have read-only access to other players' farms
- Check console for authentication errors

**API Rate Limiting**
- API endpoints limited to 100 requests per 15 minutes per IP
- If rate limited, wait before retrying

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
- ✅ **Proper .gitignore** - All sensitive files and database files excluded
- ✅ **Safe for public viewing** - Ready for hackathon judges and community

### Security Features Implemented
- **Input Validation**: All user inputs validated to prevent SQL injection
- **Rate Limiting**: API endpoints protected against DoS attacks (100 req/15min)
- **Authentication**: Secure player ID system based on wallet addresses
- **Permission System**: Only farm owners can modify their own farms
- **Session Management**: Secure token-based sessions with expiration
- **Database Security**: Parameterized queries and transaction safety
- **Error Handling**: Proper error propagation without exposing internals

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
