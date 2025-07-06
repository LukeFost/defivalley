# DeFi Valley Architecture

## System Overview

DeFi Valley is a cross-chain multiplayer farming game that combines real-time gameplay with DeFi yield farming. The architecture is designed for scalability, security, and seamless user experience.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend (Next.js)                          │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐ │
│  │   Phaser   │  │    React    │  │    Privy    │  │     Wagmi      │ │
│  │ Game Engine│  │ Components  │  │  Web3 Auth  │  │ Blockchain SDK │ │
│  └────────────┘  └─────────────┘  └─────────────┘  └────────────────┘ │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                    ┌─────────────────┴───────────────────┐
                    │                                     │
        ┌───────────▼────────────┐         ┌─────────────▼──────────────┐
        │   Game Server          │         │    API Server              │
        │   (Colyseus)           │         │    (Express)               │
        │                        │         │                            │
        │ • Real-time sync       │         │ • World discovery          │
        │ • Player management    │         │ • Rate limiting            │
        │ • Game state           │         │ • Input validation         │
        │ • Authentication       │         │ • Pagination               │
        └───────────┬────────────┘         └─────────────┬──────────────┘
                    │                                     │
                    └─────────────────┬───────────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │   Database (SQLite)    │
                          │                        │
                          │ • Player data          │
                          │ • Crop information     │
                          │ • World state          │
                          │ • Optimized indexes    │
                          └────────────────────────┘
                                      
        ┌─────────────────────────────┴───────────────────────────────┐
        │                    Smart Contracts                           │
        │                                                              │
        │  ┌─────────────────────┐         ┌─────────────────────┐   │
        │  │   GameController    │ Axelar  │     DeFiVault       │   │
        │  │   (Saga Chainlet)   │◄────────►  (Arbitrum Sepolia) │   │
        │  │                     │   GMP   │                     │   │
        │  │ • Player registry   │         │ • USDC deposits      │   │
        │  │ • Seed planting     │         │ • Yield farming      │   │
        │  │ • Harvest tracking  │         │ • Circuit breaker    │   │
        │  │ • XP system         │         │ • Deposit caps       │   │
        │  └─────────────────────┘         └─────────────────────┘   │
        └──────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend (Next.js + Phaser)

**Technology Stack:**
- Next.js 15 with App Router
- Phaser 3.90.0 for game rendering
- TypeScript for type safety
- Tailwind CSS for UI styling

**Key Features:**
- Server-side rendering for SEO
- Dynamic game loading (no SSR for Phaser)
- Responsive design
- Real-time WebSocket communication

**Authentication Flow:**
```typescript
1. User connects wallet/email via Privy
2. Frontend obtains user ID/wallet address
3. Player ID sent with game room join request
4. Server validates and stores authentication
```

### Game Server (Colyseus)

**Technology Stack:**
- Colyseus 0.16 framework
- Node.js runtime
- WebSocket for real-time communication

**Room Architecture:**
```typescript
// Dynamic room creation based on world owner
gameServer.define('world', GameRoom).filterBy(['worldOwnerId']);

// Room stores authenticated clients
private authenticatedClients = new Map<string, AuthenticatedClient>();
```

**Security Features:**
- Player ID validation
- Permission-based actions
- Secure session management
- Memory cleanup on disconnect

### API Server (Express)

**Endpoints:**
```
GET /api/worlds
  Query params: page, limit, search
  Returns: Paginated world list with metadata

GET /api/worlds/:worldId/exists
  Validates world ID format
  Returns: World existence status
```

**Security Middleware:**
- Rate limiting (100 req/15min)
- Input validation
- JSON size limits (10MB)
- CORS configuration

### Database Layer (SQLite)

**Schema Design:**
```sql
-- Players table
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  xp INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Crops table
CREATE TABLE crops (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  seed_type TEXT,
  x REAL,
  y REAL,
  planted_at TIMESTAMP,
  growth_time INTEGER,
  investment_amount REAL,
  harvested BOOLEAN DEFAULT FALSE,
  yield_amount REAL,
  harvested_at TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_crops_player_harvested ON crops(player_id, harvested);
CREATE INDEX idx_players_updated_at ON players(updated_at DESC);
```

**Query Optimization:**
- Transactions for atomic operations
- Parameterized queries for security
- Optimized indexes for common queries
- Connection pooling via WAL mode

### Smart Contract Architecture

**Cross-Chain Communication:**
```
Saga Chainlet          Axelar Network         Arbitrum Sepolia
     │                      │                        │
     ├─plantSeed()─────────►│                        │
     │                      ├─────DEPOSIT msg───────►│
     │                      │                        ├─depositToVault()
     │                      │                        │
     ├─harvestSeed()───────►│                        │
     │                      ├─────HARVEST msg───────►│
     │                      │                        ├─claimYield()
     │                      │◄────UPDATE msg─────────┤
     │◄─────────────────────┤                        │
```

**Security Features:**
- Circuit breaker pattern
- Deposit cap validation
- Command routing validation
- Emergency pause functionality
- Multi-operator system

## Data Flow

### Game State Synchronization
```
1. Player performs action (move/plant/harvest)
2. Client sends message to Colyseus server
3. Server validates permissions
4. Server updates game state
5. State changes broadcast to all clients
6. Clients update local rendering
```

### Farm World System
```
1. Player requests world browser
2. API queries active worlds with pagination
3. Player selects a world to visit
4. Game client connects to specific world room
5. Server loads world-specific data
6. Permissions set based on ownership
```

### Cross-Chain Transaction Flow
```
1. Player initiates plant/harvest in game
2. Frontend calls smart contract on Saga
3. Contract sends cross-chain message via Axelar
4. DeFiVault on Arbitrum processes request
5. Transaction status tracked in frontend
6. Game state updated on completion
```

## Performance Considerations

### Database Performance
- SQLite with WAL mode for concurrency
- Optimized indexes on frequently queried columns
- Transactions for batch operations
- Query result caching where appropriate

### Network Optimization
- WebSocket connection pooling
- Message batching for state updates
- Compression for large payloads
- Reconnection logic with exponential backoff

### Frontend Performance
- Lazy loading of game assets
- Sprite sheet optimization
- Efficient animation management
- React component memoization

## Deployment Architecture

### Development Environment
```
Frontend: http://localhost:3000
Game Server: http://localhost:2567
API Server: http://localhost:2567/api
```

### Production Considerations
- Frontend: Vercel/Netlify with CDN
- Game Server: Node.js on cloud VPS
- Database: PostgreSQL for production
- Smart Contracts: Mainnet deployment
- Monitoring: OpenTelemetry integration

## Security Architecture

See [SECURITY.md](./SECURITY.md) for detailed security implementation.

### Key Security Features
- Input validation on all endpoints
- Rate limiting for API protection
- Secure authentication system
- Permission-based access control
- Smart contract security patterns

## Scalability Roadmap

### Horizontal Scaling
- Multiple game server instances
- Load balancer for distribution
- Redis for shared state
- Database read replicas

### Vertical Scaling
- Optimized database queries
- Caching layer (Redis)
- CDN for static assets
- Worker threads for heavy computation

## Monitoring & Observability

### Metrics Collection
- Request latency tracking
- Error rate monitoring
- Player activity analytics
- Smart contract event logs

### Logging Strategy
- Structured logging (JSON)
- Log aggregation service
- Error tracking (Sentry)
- Performance monitoring (APM)