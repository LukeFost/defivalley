import { IPlayerRepository } from './IPlayerRepository';
import { ICropRepository } from './ICropRepository';
import { IWorldRepository } from './IWorldRepository';

export interface IUnitOfWork {
  players: IPlayerRepository;
  crops: ICropRepository;
  worlds: IWorldRepository;
  
  beginTransaction(): void;
  commit(): void;
  rollback(): void;
  
  // Execute a function within a transaction
  transaction<T>(fn: () => T): T;
}