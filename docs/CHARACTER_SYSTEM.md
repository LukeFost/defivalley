# Character System Architecture

## Overview

DeFi Valley features a robust character system with deterministic character selection, visual customization, and clean object-oriented architecture. The system provides unique character identities for players while maintaining performance and simplicity.

## Architecture Components

### 1. Character Configuration (`/lib/character.config.ts`)

Centralized configuration for all sprite sheet metadata:

```typescript
export const CharacterConfig = {
  player: {
    key: 'player_characters',
    path: '/sprites/RPGCharacterSprites32x32.png',
    frameWidth: 32,
    frameHeight: 32,
    directions: {
      down: 0,
      left: 1, 
      right: 2,
      up: 3,
    },
    framesPerCharacter: 4,
    characters: {
      warrior: 0,
      mage: 1,
      archer: 2,
      rogue: 3,
      paladin: 4,
      priest: 5,
      necromancer: 6,
      berserker: 7,
    },
  },
} as const;
```

**Benefits:**
- ✅ No hardcoded "magic numbers" in game logic
- ✅ Easy to add new character types
- ✅ Type-safe character and direction references
- ✅ Single source of truth for sprite configuration

### 2. Player Class (`/lib/Player.ts`)

Object-oriented player representation extending `Phaser.GameObjects.Container`:

```typescript
export class Player extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Sprite;
  private nameplate: Phaser.GameObjects.Text;
  private badge: Phaser.GameObjects.Text;
  private playerInfo: PlayerInfo;

  // Key Methods:
  updatePosition(x: number, y: number): void
  updateDirection(direction: Direction): void
  updateLevel(level: number): void
  changeCharacter(newCharacter: CharacterType): void
  highlight(isCurrentPlayer: boolean): void
}
```

**Features:**
- 🎭 **Self-contained**: Manages sprite, nameplate, and level badge
- 🎯 **Clean API**: Simple methods for updates and interactions
- 🔄 **Direction Handling**: Automatic sprite frame updates
- 💾 **State Management**: Encapsulated player information
- 🎨 **Visual Effects**: Current player highlighting

### 3. Character Selection System

#### Deterministic Selection
Players get consistent characters based on wallet address/session ID:

```typescript
// Character selection algorithm
const characterTypes = Object.keys(CharacterConfig.player.characters);
const characterIndex = Math.abs(
  playerAddress.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)
) % characterTypes.length;
```

#### Storage Hierarchy
1. **Global Selection** (current player only): `localStorage['character-selection']`
2. **Player-specific**: `localStorage['defi-valley-character-${playerAddress}']`
3. **Generated**: Deterministic based on address hash

#### Character Types
- **warrior** - Strong melee fighter
- **mage** - Magical spellcaster  
- **archer** - Ranged specialist
- **rogue** - Stealthy assassin
- **paladin** - Holy knight
- **priest** - Divine healer
- **necromancer** - Dark magic user
- **berserker** - Fierce warrior

## Visual System

### Sprite Sheet Format
- **Dimensions**: 32x32 pixels per character frame
- **Layout**: 8 characters × 4 directions each = 32 total frames
- **Directions**: Down(0), Left(1), Right(2), Up(3)
- **Background**: Transparent (no magenta processing needed)

### Frame Calculation
```typescript
const frameIndex = characterIndex * config.framesPerCharacter + directionIndex;
```

### Visual Elements
- **Player Sprite**: 2x scale for visibility
- **Nameplate**: Color-coded (green=current player, white=others)
- **Level Badge**: Blue background with level number
- **Positioning**: Relative to sprite center in container

## Game Integration

### MainScene Integration
```typescript
// Old way (complex, tightly coupled)
const playerSprite = this.add.sprite(x, y, 'characterFrames', frame);
// + manual nameplate creation
// + manual badge creation
// + complex update logic

// New way (simple, encapsulated)
const player = new Player(this, x, y, playerInfo);
this.players.set(sessionId, player);
```

### Movement and Direction
```typescript
// Automatic direction updates
if (moved && this.currentPlayer) {
  this.updatePlayerDirection(this.currentPlayer, this.lastDirection);
}

// Inside updatePlayerDirection
player.updateDirection(direction); // Handles sprite frame changes automatically
```

## Performance Optimizations

### Eliminated Runtime Processing
- ❌ **Removed**: `processCharacterTexture()` function (95 lines)
- ❌ **Removed**: Canvas-based magenta background removal
- ❌ **Removed**: Pixel-by-pixel color processing
- ✅ **Added**: Direct spritesheet loading with transparency

### Memory Efficiency
- **Container Pattern**: Grouped related objects reduce individual tracking
- **Centralized Config**: Single configuration object vs scattered constants
- **Type Safety**: Compile-time checking prevents runtime errors

## Development Tools

### Character Management
```javascript
// Console commands (available in dev mode)
resetMyCharacter() // Reset current player's character selection
```

### Adding New Characters
1. **Update sprite sheet**: Add new character frames
2. **Update config**: Add entry to `CharacterConfig.player.characters`
3. **TypeScript**: Automatic type inference for new character

```typescript
// Example: Adding a new character
characters: {
  // ... existing characters
  wizard: 8,     // New character at index 8
  druid: 9,      // Another new character at index 9
}
```

## Error Handling

### Graceful Degradation
- **Invalid character type**: Falls back to deterministic generation
- **Missing localStorage**: Uses session ID as fallback
- **Sprite load failure**: Scene continues with error logging
- **Container destruction**: Proper cleanup of all child objects

### Debug Information
```typescript
console.log(`🎭 Player ${player.name} using character ${characterType}`);
console.log(`🧭 Updated player direction: ${direction}`);
```

## Migration Benefits

### Code Quality Improvements
- **-95 lines**: Removed complex image processing
- **+Type Safety**: Full TypeScript coverage
- **+Maintainability**: Clean separation of concerns
- **+Extensibility**: Easy to add features

### Performance Gains
- **Faster Loading**: No runtime image processing
- **Better FPS**: Reduced per-frame calculations  
- **Memory Efficient**: Container-based object management
- **Network Optimized**: Smaller bundle without processing code

### Developer Experience
- **IntelliSense**: Full IDE support for character types
- **Debugging**: Clear object hierarchy and methods
- **Testing**: Isolated, testable components
- **Documentation**: Self-documenting configuration

## Future Enhancements

### Planned Features
- **Character Customization**: Skins, colors, accessories
- **Animation System**: Walking, idle, farming animations
- **Visual Effects**: Particles, trails, emotes
- **Achievement Badges**: Farming milestones, DeFi achievements

### Technical Roadmap
- **Animation Config**: Extend configuration for animation sequences
- **Asset Pipeline**: Hot-reload character assets in development
- **Compression**: Optimized sprite atlases for production
- **Accessibility**: High contrast modes, text scaling

This architecture provides a solid foundation for the game's visual identity while maintaining clean, maintainable, and performant code.