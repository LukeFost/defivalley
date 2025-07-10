/**
 * Example: Adding a new building type using BuildingInteractionManager
 * 
 * This example shows how to add a new "Treasury" building to the game
 */

import { BaseInteractiveBuilding } from './BaseInteractiveBuilding';
import type { BuildingInteractionManager } from './BuildingInteractionManager';

// Step 1: Create your building class extending BaseInteractiveBuilding
export class TreasuryBuilding extends BaseInteractiveBuilding {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
  }

  // Implement required abstract methods
  protected getSpriteTexture(): string {
    return 'treasury'; // Your sprite texture key
  }

  protected getGlowColor(): number {
    return 0xFFD700; // Gold color for treasury
  }

  protected getPromptText(): string {
    return 'Press E to enter treasury';
  }

  protected getEventName(): string {
    return 'treasuryInteraction'; // Unique event name
  }

  protected getBuildingName(): string {
    return '💰 Treasury';
  }

  // Optional: Override scale if needed
  protected getSpriteScale(): number {
    return 0.5; // Larger building
  }
}

// Step 2: In your scene, create and register the building
export function addTreasuryBuilding(
  scene: Phaser.Scene,
  manager: BuildingInteractionManager,
  x: number,
  y: number
) {
  // Create the building
  const treasury = new TreasuryBuilding(scene, x, y);
  
  // Register with the manager
  manager.registerBuilding('treasury', treasury);
  
  // Register the interaction configuration
  manager.registerInteraction({
    eventName: 'treasuryInteraction',
    characterName: 'Treasurer',
    dialogueContent: 'Welcome to the Royal Treasury! Here you can manage your wealth and view your earnings. Would you like to enter?',
    modalSetter: (show) => {
      // Your modal setter function
      console.log('Opening treasury modal:', show);
    }
  });
}

// Step 3: Alternative method - Add building type dynamically
export function addCustomBuildingType(
  scene: Phaser.Scene,
  manager: BuildingInteractionManager
) {
  const building = new TreasuryBuilding(scene, 500, 500);
  
  manager.addBuildingType(
    'treasury',
    building,
    {
      characterName: 'Treasurer',
      dialogueContent: 'Welcome to the Royal Treasury!',
      onInteraction: () => {
        console.log('Treasury interaction triggered!');
        // Open your custom UI here
      }
    }
  );
}

// Step 4: Using the manager's features
export function demonstrateManagerFeatures(manager: BuildingInteractionManager) {
  // Get all buildings
  const allBuildings = manager.getBuildings();
  console.log('Total buildings:', allBuildings.size);
  
  // Get a specific building
  const treasury = manager.getBuilding('treasury');
  if (treasury) {
    console.log('Treasury found at:', treasury.x, treasury.y);
  }
  
  // Check collision at a specific point
  const hasCollision = manager.checkCollision(500, 500);
  console.log('Collision at (500, 500):', hasCollision);
  
  // Get all collision bounds for physics calculations
  const bounds = manager.getCollisionBounds();
  console.log('Total collision areas:', bounds.length);
}

// Step 5: Custom interaction without modal
export function addNPCBuilding(
  scene: Phaser.Scene,
  manager: BuildingInteractionManager
) {
  // Create a simple NPC hut
  class NPCHut extends BaseInteractiveBuilding {
    protected getSpriteTexture(): string { return 'hut'; }
    protected getGlowColor(): number { return 0x00FFFF; }
    protected getPromptText(): string { return 'Press E to talk'; }
    protected getEventName(): string { return 'npcInteraction'; }
    protected getBuildingName(): string { return '🏚️ NPC Hut'; }
  }
  
  const npcHut = new NPCHut(scene, 300, 300);
  
  manager.addBuildingType('npcHut', npcHut, {
    characterName: 'Wise Elder',
    dialogueContent: 'I have been waiting for you, young farmer...',
    onInteraction: () => {
      // Just dialogue, no modal
      console.log('NPC interaction complete');
    }
  });
}