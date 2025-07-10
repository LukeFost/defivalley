import { SeedType } from '../../types/game.types';

export class Crop {
  public readonly gridX: number;
  public readonly gridY: number;

  constructor(
    public readonly id: string,
    public readonly playerId: string,
    public readonly seedType: SeedType,
    public readonly x: number,
    public readonly y: number,
    public readonly plantedAt: Date,
    public readonly growthTime: number,
    public readonly investmentAmount: number,
    public harvested: boolean,
    public yieldAmount: number | null,
    public harvestedAt: Date | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
    gridX?: number,
    gridY?: number
  ) {
    // Calculate grid coordinates if not provided
    const GRID_SIZE = 100;
    this.gridX = gridX ?? Math.floor(x / GRID_SIZE);
    this.gridY = gridY ?? Math.floor(y / GRID_SIZE);
  }

  static create(
    playerId: string,
    seedType: SeedType,
    x: number,
    y: number,
    growthTime: number,
    investmentAmount: number
  ): Crop {
    const now = new Date();
    const id = `crop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Crop(
      id,
      playerId,
      seedType,
      x,
      y,
      now,
      growthTime,
      investmentAmount,
      false,
      null,
      null,
      now,
      now
    );
  }

  isReady(): boolean {
    if (this.harvested) return false;
    const now = Date.now();
    const plantedTime = this.plantedAt.getTime();
    return (now - plantedTime) >= this.growthTime;
  }

  getProgress(): number {
    if (this.harvested) return 100;
    const now = Date.now();
    const plantedTime = this.plantedAt.getTime();
    const elapsed = now - plantedTime;
    const progress = Math.min((elapsed / this.growthTime) * 100, 100);
    return Math.round(progress);
  }

  harvest(yieldAmount: number): void {
    if (this.harvested) {
      throw new Error('Crop already harvested');
    }
    if (!this.isReady()) {
      throw new Error('Crop is not ready for harvest');
    }
    
    this.harvested = true;
    this.yieldAmount = yieldAmount;
    this.harvestedAt = new Date();
    this.updatedAt = new Date();
  }

  getTimeRemaining(): number {
    if (this.harvested || this.isReady()) return 0;
    const now = Date.now();
    const plantedTime = this.plantedAt.getTime();
    const elapsed = now - plantedTime;
    return Math.max(this.growthTime - elapsed, 0);
  }
}