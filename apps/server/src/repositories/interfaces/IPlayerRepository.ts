import { Player } from '../../domain/entities/Player';
import { IRepository } from './IRepository';

export interface IPlayerRepository extends IRepository<Player, string> {
  findByIdOrCreate(id: string, name: string): Player;
  updateXP(playerId: string, xp: number): void;
}