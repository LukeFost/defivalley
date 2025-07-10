import Database from 'better-sqlite3';
import { IUnitOfWork } from './interfaces/IUnitOfWork';
import { IPlayerRepository } from './interfaces/IPlayerRepository';
import { ICropRepository } from './interfaces/ICropRepository';
import { IWorldRepository } from './interfaces/IWorldRepository';
import { PlayerRepository } from './PlayerRepository';
import { CropRepository } from './CropRepository';
import { WorldRepository } from './WorldRepository';

export class UnitOfWork implements IUnitOfWork {
  public readonly players: IPlayerRepository;
  public readonly crops: ICropRepository;
  public readonly worlds: IWorldRepository;
  
  private transactionInProgress = false;

  constructor(private db: Database.Database) {
    this.players = new PlayerRepository(db);
    this.crops = new CropRepository(db);
    this.worlds = new WorldRepository(db);
  }

  beginTransaction(): void {
    if (this.transactionInProgress) {
      throw new Error('Transaction already in progress');
    }
    this.db.exec('BEGIN');
    this.transactionInProgress = true;
  }

  commit(): void {
    if (!this.transactionInProgress) {
      throw new Error('No transaction in progress');
    }
    this.db.exec('COMMIT');
    this.transactionInProgress = false;
  }

  rollback(): void {
    if (!this.transactionInProgress) {
      throw new Error('No transaction in progress');
    }
    this.db.exec('ROLLBACK');
    this.transactionInProgress = false;
  }

  transaction<T>(fn: () => T): T {
    // Use better-sqlite3's built-in transaction support
    return this.db.transaction(fn)();
  }
}