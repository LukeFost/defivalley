# DeFi Valley Documentation

## Technical Documentation

### Game Architecture
- **[Architecture Overview](ARCHITECTURE.md)** - System design and component interactions
- **[Character System](CHARACTER_SYSTEM.md)** - Player visual system, sprite management, and character selection
- **[Security Guide](SECURITY.md)** - Security best practices and implementation

### Development Guides
- **[Getting Started](../README.md)** - Quick setup and development environment
- **[Build System](../README.md#build-commands)** - Turborepo configuration and build optimization

### Features
- **[Web3 Authentication](../README.md#web3-authentication-system)** - Privy integration and wallet management
- **[Local Game Loop](../README.md#current-status)** - Single-player farming mechanics

## Code Quality

### Architecture Principles
- **DRY (Don't Repeat Yourself)**: Centralized configuration and shared utilities
- **KISS (Keep It Simple, Stupid)**: Clean abstractions without over-engineering
- **Separation of Concerns**: Clear boundaries between game logic and UI
- **Type Safety**: Full TypeScript coverage across the monorepo

### Performance Optimizations
- **Eliminated Runtime Processing**: No more image manipulation during game startup
- **Container Architecture**: Phaser containers for efficient object management
- **Build Optimization**: Turborepo caching and parallel execution
- **Bundle Optimization**: Tree-shaking and code splitting

### Maintainability
- **Configuration-driven**: Easy to modify game parameters
- **Modular Components**: Self-contained, testable game objects
- **Clear Documentation**: Comprehensive guides and inline comments
- **Development Tools**: Console commands and debugging utilities

## Contributing

### Code Style
- Follow existing TypeScript patterns
- Use configuration objects instead of hardcoded values
- Implement proper error handling and logging
- Keep components focused and single-purpose

### Adding Features
1. **Update Configuration**: Modify relevant config files
2. **Implement Logic**: Follow existing patterns and abstractions
3. **Test Thoroughly**: Ensure no regressions
4. **Document Changes**: Update relevant documentation

### Development Workflow
1. **Branch Naming**: Use descriptive branch names (e.g., `feature/crop-variety`)
2. **Commit Messages**: Follow conventional commit format
3. **Pull Requests**: Include clear descriptions and testing notes
4. **Code Review**: Address feedback before merging

## Project Structure

```
defivalley/
├── apps/
│   └── web/              # Next.js frontend application
│       ├── app/          # App router and pages
│       ├── components/   # React components
│       ├── lib/          # Game engine and utilities
│       └── game/         # Game-specific modules
├── docs/                 # Technical documentation
└── packages/            # Shared packages (if any)
```

## Key Concepts

### EventBus Pattern
The game uses an event-driven architecture for React-Phaser communication:
- React components emit events via EventBus
- Phaser scenes listen and respond to events
- Maintains clean separation between UI and game logic

### Local-First Design
- All game state is managed locally
- No server dependencies for core gameplay
- Instant response to player actions
- Optional authentication for future features