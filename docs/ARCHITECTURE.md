# DeFi Valley Architecture

## System Overview

DeFi Valley is a single-player farming visualization game built with modern web technologies. The architecture focuses on simplicity, performance, and a delightful user experience.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Application                          │
│  ┌─────────────────┐      ┌────────────────────────────┐   │
│  │   Next.js App   │      │    Phaser Game Engine     │   │
│  │                 │◄─────►│                           │   │
│  │  - React UI     │      │  - Player Movement       │   │
│  │  - Dialogs      │      │  - Crop System           │   │
│  │  - Auth (Privy) │      │  - Tilemap World         │   │
│  │                 │      │  - Character Animation   │   │
│  └─────────────────┘      └────────────────────────────┘   │
│           ▲                           ▲                      │
│           │                           │                      │
│           └───────────┬───────────────┘                     │
│                       │                                      │
│                   EventBus                                   │
│              (Communication Layer)                           │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Next.js Application (`apps/web`)
- **Pages**: Single-page application with game view
- **Components**: React components for UI elements
- **Hooks**: Custom hooks for game integration
- **Store**: Zustand store for application state

### 2. Phaser Game Engine
- **MainScene**: Core game scene managing the world
- **Player System**: Character movement and animations
- **Crop System**: Local farming mechanics
- **Tilemap System**: Procedural world generation
- **Building System**: Interactive farm buildings

### 3. Communication Layer
- **EventBus**: Clean event-driven communication between React and Phaser
- **Type-safe Events**: Defined event types for all game actions

## Key Systems

### Player System
- Single local player with customizable character
- Smooth movement with WASD/Arrow keys
- Character animations (idle, walk, run)
- Collision detection with world boundaries

### Crop System
- Local crop planting and harvesting
- Multiple crop types with growth timers
- Visual growth stages
- Context menu interactions

### UI System
- Modal dialogs for seed selection
- Real-time notifications
- Crop statistics display
- Settings and configuration

## Data Flow

### Planting Flow
1. User opens plant seed dialog (React)
2. User selects seed type
3. EventBus emits `seedSelected` event
4. MainScene queues the crop type
5. User clicks on farm plot
6. Crop is planted locally

### Game State
- Player position and character stored in Phaser
- UI state managed by Zustand
- No server persistence (local-only)

## Security Considerations

### Input Validation
- All user inputs validated on the client
- Safe string handling for player names
- Sanitized event payloads

### Performance
- Efficient sprite batching
- Viewport culling for off-screen objects
- Optimized tilemap rendering
- Frame-rate independent movement

## Development Workflow

### Local Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

### Project Structure
```
apps/
  web/              # Next.js application
    app/            # App router pages
    components/     # React components
    lib/            # Game engine code
    hooks/          # Custom React hooks
    game/           # Game-specific modules (EventBus)
```

## Technical Stack

### Frontend
- **Framework**: Next.js 15 with React 19
- **Game Engine**: Phaser 3.90.0
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **TypeScript**: For type safety

### Authentication
- **Privy**: Web3 authentication with email/social login support
- **Wagmi**: Ethereum library for wallet connections (optional)

### Build Tools
- **Turbo**: Monorepo management
- **pnpm**: Package management
- **ESBuild**: Fast bundling

## Performance Optimizations

### Rendering
- WebGL acceleration via Phaser
- Texture atlases for sprites
- Batch rendering for similar objects
- Depth sorting for 2.5D effect

### Memory Management
- Object pooling for frequently created objects
- Texture cleanup on scene transitions
- Event listener cleanup on unmount

### Network
- No network requests during gameplay
- All assets loaded upfront
- Local-only game state

## Future Considerations

While the current architecture is focused on single-player local gameplay, the modular design allows for future enhancements:

- Save/Load game state to localStorage
- Export farm layouts as images
- Additional crop types and buildings
- Achievement system
- Seasonal events

The architecture prioritizes maintainability and user experience over complexity, making it easy to understand and extend.