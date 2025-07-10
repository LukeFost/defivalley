import { Crop } from '../../domain/entities/Crop';
import { IRepository } from './IRepository';

export interface ICropRepository extends IRepository<Crop, string> {
  findByPlayerId(playerId: string): Crop[];
  findUnharvestedByPlayerId(playerId: string): Crop[];
  findInArea(minX: number, minY: number, maxX: number, maxY: number, playerId?: string): Crop[];
  findAtPosition(x: number, y: number, radius: number): Crop[];
  markAsHarvested(cropId: string): void;
  countByPlayerId(playerId: string, harvested?: boolean): number;
}