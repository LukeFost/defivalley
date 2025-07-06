import { Scene } from 'phaser';

export interface BuildingData {
  id: string;
  type: 'well' | 'corral' | 'orchard' | 'barn' | 'house';
  x: number;
  y: number;
  width: number;
  height: number;
  isInteractable: boolean;
  ownerId?: string;
}

export interface BuildingInteractionCallbacks {
  onBuildingClick: (buildingId: string, buildingType: string) => void;
  onBuildingHover: (buildingId: string, buildingType: string) => void;
  onBuildingLeave: (buildingId: string, buildingType: string) => void;
}

export class BuildingManager {
  private buildings = new Map<string, Phaser.GameObjects.Sprite>();
  private scene: Scene;
  private callbacks: BuildingInteractionCallbacks;

  constructor(scene: Scene, callbacks: BuildingInteractionCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
  }

  public addBuilding(buildingData: BuildingData): void {
    if (this.buildings.has(buildingData.id)) {
      this.updateBuilding(buildingData);
      return;
    }

    try {
      // Create building sprite based on type
      const textureKey = this.getBuildingTexture(buildingData.type);
      const building = this.scene.add.sprite(buildingData.x, buildingData.y, textureKey);
      
      // Set building properties
      building.setOrigin(0.5, 0.5);
      building.setDisplaySize(buildingData.width, buildingData.height);
      building.setDepth(5); // Buildings should be above ground but below UI
      
      // Make building interactive if specified
      if (buildingData.isInteractable) {
        building.setInteractive();
        
        // Add hover effects
        building.on('pointerover', () => {
          building.setTint(0xdddddd);
          this.callbacks.onBuildingHover(buildingData.id, buildingData.type);
        });
        
        building.on('pointerout', () => {
          building.clearTint();
          this.callbacks.onBuildingLeave(buildingData.id, buildingData.type);
        });
        
        // Add click handler
        building.on('pointerdown', () => {
          this.callbacks.onBuildingClick(buildingData.id, buildingData.type);
        });
      }

      // Store building reference
      this.buildings.set(buildingData.id, building);
      
      console.log(`🏠 Added building: ${buildingData.type} (${buildingData.id})`);
    } catch (error) {
      console.error('❌ Error adding building:', error);
    }
  }

  public removeBuilding(buildingId: string): void {
    const building = this.buildings.get(buildingId);
    if (building) {
      try {
        building.destroy();
        this.buildings.delete(buildingId);
        console.log(`🏠 Removed building: ${buildingId}`);
      } catch (error) {
        console.error('❌ Error removing building:', error);
      }
    }
  }

  public updateBuilding(buildingData: BuildingData): void {
    const building = this.buildings.get(buildingData.id);
    if (!building) return;

    try {
      // Update position
      building.setPosition(buildingData.x, buildingData.y);
      
      // Update size
      building.setDisplaySize(buildingData.width, buildingData.height);
      
      // Update texture if needed
      const textureKey = this.getBuildingTexture(buildingData.type);
      if (building.texture.key !== textureKey) {
        building.setTexture(textureKey);
      }
      
      // Update interactivity
      if (buildingData.isInteractable && !building.input) {
        building.setInteractive();
      } else if (!buildingData.isInteractable && building.input) {
        building.disableInteractive();
      }
    } catch (error) {
      console.error('❌ Error updating building:', error);
    }
  }

  public getBuilding(buildingId: string): Phaser.GameObjects.Sprite | undefined {
    return this.buildings.get(buildingId);
  }

  public getAllBuildings(): Map<string, Phaser.GameObjects.Sprite> {
    return new Map(this.buildings);
  }

  public getBuildingCount(): number {
    return this.buildings.size;
  }

  public getBuildingAt(x: number, y: number): string | null {
    for (const [id, building] of this.buildings) {
      const bounds = building.getBounds();
      if (bounds.contains(x, y)) {
        return id;
      }
    }
    return null;
  }

  public highlightBuilding(buildingId: string, highlight: boolean = true): void {
    const building = this.buildings.get(buildingId);
    if (building) {
      if (highlight) {
        building.setTint(0xffff00); // Yellow highlight
      } else {
        building.clearTint();
      }
    }
  }

  public cleanup(): void {
    this.buildings.forEach((building, id) => {
      try {
        building.destroy();
      } catch (error) {
        console.error(`❌ Error cleaning up building ${id}:`, error);
      }
    });
    this.buildings.clear();
  }

  private getBuildingTexture(type: string): string {
    const textureMap: Record<string, string> = {
      well: 'well',
      corral: 'corral',
      orchard: 'orchard',
      barn: 'barn',
      house: 'house',
    };
    
    return textureMap[type] || 'house'; // Default to house if unknown type
  }

  // Debug methods
  public logBuildingStats(): void {
    console.log(`🏠 BuildingManager Stats:`);
    console.log(`  - Total buildings: ${this.buildings.size}`);
    this.buildings.forEach((building, id) => {
      console.log(`  - ${id}: ${building.texture.key} at (${building.x}, ${building.y})`);
    });
  }
}