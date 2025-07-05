# DeFi Valley Frontend Action Plan - Saturday Sprint

## 🎯 **DEPLOYMENT FIXED**

Your Node.js/NVM issue is solved! Use these commands from the project root:

```bash
# Deploy everything with correct Axelar addresses
nvm use v22  # Only needed once per terminal session
pnpm run deploy:all
```

**What this does:**
1. Deploys DeFiVault to Arbitrum with real Axelar gateway
2. Deploys GameController to Saga with real Axelar addresses  
3. Configures cross-chain communication
4. Tests the complete flow

---

## 🚀 **SATURDAY GOAL: Complete Phase 1**

By end of today, you'll have a functional multiplayer farming game with wallet integration and on-chain player registration.

---

## 📋 **Phase 1: Must-Haves (Core Functional Loop)**

### **Task 1: Privy Wallet Integration** ⚡ `CRITICAL PATH`
**Owner**: Full-Stack Developer  
**Time**: 2-3 hours  
**Files**: `apps/web/app/layout.tsx`, `apps/web/components/Auth.tsx`

```bash
cd apps/web
pnpm add @privy-io/react-auth @privy-io/wagmi wagmi viem
```

**Implementation:**
1. **Setup PrivyProvider** in `layout.tsx`:
```typescript
import { PrivyProvider } from '@privy-io/react-auth';

const privyConfig = {
  appId: 'your-privy-app-id',
  config: {
    loginMethods: ['wallet'],
    appearance: { theme: 'light' }
  }
};

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PrivyProvider {...privyConfig}>
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
```

2. **Create Auth Component**:
```typescript
// components/Auth.tsx
import { usePrivy } from '@privy-io/react-auth';

export function Auth() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  
  if (!ready) return <div>Loading...</div>;
  
  return (
    <div className="auth-container">
      {!authenticated ? (
        <button onClick={login} className="connect-btn">
          🌱 Enter DeFi Valley
        </button>
      ) : (
        <div className="wallet-info">
          <p>Welcome, Farmer!</p>
          <p>Wallet: {user?.wallet?.address?.slice(0,6)}...</p>
          <button onClick={logout}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

**Success Criteria**: User can connect wallet and see their address displayed.

---

### **Task 2: Game Canvas Setup** 🎮 `CRITICAL PATH`
**Owner**: Full-Stack Developer + Designer  
**Time**: 3-4 hours  
**Files**: `apps/web/components/Game.tsx`, `apps/web/public/assets/`

**Designer Deliverables**:
- Player sprite (32x32px)
- Basic tileset (grass, dirt)
- Farm plot sprites

**Developer Implementation**:
```bash
cd apps/web
pnpm add phaser colyseus.js
```

```typescript
// components/Game.tsx
'use client';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { Client } from 'colyseus.js';

export function Game() {
  const gameRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      scene: {
        preload: function() {
          this.load.image('player', '/assets/player.png');
          this.load.image('tileset', '/assets/farm-tiles.png');
        },
        create: function() {
          // Create basic farm world
          this.player = this.add.sprite(400, 300, 'player');
          
          // Connect to multiplayer server
          const client = new Client('ws://localhost:2567');
          client.joinOrCreate('farm_room').then(room => {
            console.log('Connected to farm!');
          });
        }
      }
    };
    
    const game = new Phaser.Game(config);
    return () => game.destroy();
  }, []);
  
  return <div ref={gameRef} className="game-canvas" />;
}
```

**Success Criteria**: Player sprite appears on screen and can connect to Colyseus server.

---

### **Task 3: Player Registration** 🔗 `CRITICAL PATH`
**Owner**: Full-Stack Developer  
**Time**: 2-3 hours  
**Files**: `apps/web/components/PlayerRegistration.tsx`

```typescript
// components/PlayerRegistration.tsx
import { useWriteContract, useAccount } from 'wagmi';
import { gameControllerABI } from '../abi/GameController';

const GAME_CONTROLLER_ADDRESS = '0x2b2034AD5e2E0b4634002dDA83d1fd536cb4e673';
const SAGA_CHAIN_ID = 2751669528484000;

export function PlayerRegistration() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  
  const registerPlayer = async () => {
    writeContract({
      address: GAME_CONTROLLER_ADDRESS,
      abi: gameControllerABI,
      functionName: 'registerPlayer',
      chainId: SAGA_CHAIN_ID,
    });
  };
  
  return (
    <div className="registration">
      <h2>🏡 Create Your Farm</h2>
      <button 
        onClick={registerPlayer}
        disabled={isPending}
        className="register-btn"
      >
        {isPending ? 'Creating Farm...' : 'Begin Your Adventure!'}
      </button>
    </div>
  );
}
```

**Success Criteria**: New players can register on-chain and see transaction confirmation.

---

### **Task 4: Multiplayer Synchronization** 👥 `HIGH PRIORITY`
**Owner**: Full-Stack Developer  
**Time**: 2-3 hours  
**Files**: Update `Game.tsx` with real-time multiplayer

```typescript
// Enhanced Game.tsx with multiplayer
scene: {
  create: function() {
    this.players = {};
    
    // Connect to Colyseus
    const client = new Client('ws://localhost:2567');
    client.joinOrCreate('farm_room').then(room => {
      
      // When a new player joins
      room.state.players.onAdd = (player, sessionId) => {
        this.players[sessionId] = this.add.circle(
          player.x, player.y, 16, 
          sessionId === room.sessionId ? 0x00ff00 : 0xff0000
        );
      };
      
      // When player moves
      room.state.players.onChange = (player, sessionId) => {
        this.players[sessionId].setPosition(player.x, player.y);
      };
      
      // Keyboard controls
      this.cursors = this.input.keyboard.createCursorKeys();
    });
  },
  
  update: function() {
    // Send movement to server
    if (this.cursors.left.isDown) {
      room.send('move', { x: -1, y: 0 });
    }
    // ... other directions
  }
}
```

**Success Criteria**: Multiple players can see each other moving in real-time.

---

## 🎮 **Phase 2: Should-Haves (The DeFi Magic)**

### **Task 5: Seed Planting Modal** 💰 `HIGH PRIORITY`
**Owner**: Full-Stack Developer + Designer  
**Time**: 4-5 hours  

**Designer Deliverables**:
- Modal UI design
- Seed/crop lifecycle sprites (sprout → mature)

**Developer Implementation**:
```typescript
// components/SeedPlantingModal.tsx
export function SeedPlantingModal({ isOpen, onClose }) {
  const [amount, setAmount] = useState('');
  const [seedType, setSeedType] = useState(1);
  
  const plantSeed = async () => {
    // 1. Switch to Saga network
    await switchChain({ chainId: SAGA_CHAIN_ID });
    
    // 2. Plant seed (triggers cross-chain deposit)
    writeContract({
      address: GAME_CONTROLLER_ADDRESS,
      abi: gameControllerABI,
      functionName: 'plantSeed',
      args: [seedType, parseUnits(amount, 6), '0x0000000000000000000000000000000000000000'],
      value: parseEther('0.01'), // Gas payment
    });
  };
  
  return (
    <Modal isOpen={isOpen}>
      <h2>🌱 Plant Your Seed</h2>
      <input 
        type="number" 
        placeholder="USDC Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={plantSeed}>Plant Seed</button>
    </Modal>
  );
}
```

**Success Criteria**: Users can plant seeds with real USDC and see visual confirmation.

---

### **Task 6: Farm State Visualization** 🌾 `MEDIUM PRIORITY`
**Owner**: Full-Stack Developer  
**Time**: 2-3 hours  

```typescript
// Enhanced Game.tsx with farm state
useEffect(() => {
  // Poll contract for player's seeds
  const fetchSeeds = async () => {
    const playerState = await readContract({
      address: GAME_CONTROLLER_ADDRESS,
      abi: gameControllerABI,
      functionName: 'getPlayerState',
      args: [address],
    });
    
    // Update Phaser scene with seed sprites
    updateFarmVisuals(playerState);
  };
  
  fetchSeeds();
  const interval = setInterval(fetchSeeds, 30000);
  return () => clearInterval(interval);
}, []);
```

**Success Criteria**: Planted seeds appear visually on the farm and show growth progress.

---

## 📦 **Required Dependencies**

Add to `apps/web/package.json`:
```json
{
  "dependencies": {
    "@privy-io/react-auth": "^1.82.7",
    "@privy-io/wagmi": "^0.2.13",
    "wagmi": "^2.12.35",
    "viem": "^2.21.45",
    "phaser": "^3.90.0",
    "colyseus.js": "^0.16.0"
  }
}
```

---

## 🎯 **Success Metrics by End of Saturday**

### **Minimum Viable Demo**:
- ✅ Users can connect wallet via Privy
- ✅ Players appear in multiplayer game world
- ✅ New players can register on-chain
- ✅ Real-time movement synchronization works

### **Stretch Goals**:
- ✅ Seed planting modal functional
- ✅ Visual confirmation of planted seeds
- ✅ Cross-chain transaction tracking

---

## 🚨 **Critical Success Factors**

1. **Focus on Phase 1 First**: Don't start Phase 2 until Phase 1 is 100% working
2. **Test Early and Often**: Every task should be immediately testable
3. **Keep It Simple**: Use minimal UI to prove functionality first
4. **Real Data**: Connect to actual deployed contracts from the start

---

## 🔧 **Quick Setup Commands**

```bash
# 1. Deploy contracts (run once)
nvm use v22
pnpm run deploy:all

# 2. Start development servers
pnpm dev  # Starts web app + game server

# 3. Test connection
# Visit: http://localhost:3000 (web app)
# Visit: http://localhost:2567/test.html (server test)
```

---

**🎉 By Sunday morning, you'll have a fully functional multiplayer farming game with real DeFi integration!**

The backend is production-ready. Now it's time to build the beautiful frontend that brings your cozy farming + DeFi vision to life.