import Database from 'better-sqlite3';
import { join } from 'path';
import { readFileSync, readdirSync, existsSync } from 'fs';

export interface Migration {
  id: number;
  name: string;
  applied_at?: string;
}

export class MigrationService {
  private db: Database.Database;
  private migrationsPath: string;

  constructor(db: Database.Database) {
    this.db = db;
    this.migrationsPath = join(__dirname, '..', 'migrations');
    this.init();
  }

  private init() {
    // Create migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Run all pending migrations
   */
  runMigrations() {
    console.log('🔄 Running database migrations...');
    
    try {
      // Check if migrations directory exists
      if (!existsSync(this.migrationsPath)) {
        console.log('📁 No migrations directory found, skipping migrations');
        return;
      }

      // Get list of migration files
      const migrationFiles = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Ensure migrations run in order

      // Get list of applied migrations
      const appliedMigrations = this.db.prepare('SELECT name FROM migrations').all() as { name: string }[];
      const appliedNames = new Set(appliedMigrations.map(m => m.name));

      // Run pending migrations
      let migrationsRun = 0;
      for (const file of migrationFiles) {
        if (appliedNames.has(file)) {
          continue; // Skip already applied migrations
        }

        console.log(`  ▶️  Running migration: ${file}`);
        
        const migrationSql = readFileSync(join(this.migrationsPath, file), 'utf-8');
        
        // Run migration in a transaction
        this.db.transaction(() => {
          this.db.exec(migrationSql);
          
          // Record that migration was applied
          const stmt = this.db.prepare('INSERT INTO migrations (name) VALUES (?)');
          stmt.run(file);
        })();

        console.log(`  ✅ Applied migration: ${file}`);
        migrationsRun++;
      }

      if (migrationsRun === 0) {
        console.log('✅ All migrations are up to date');
      } else {
        console.log(`✅ Applied ${migrationsRun} migration(s)`);
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Get list of all migrations and their status
   */
  getMigrationStatus(): { name: string; applied: boolean; applied_at?: string }[] {
    const migrationFiles = readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const appliedMigrations = this.db.prepare('SELECT name, applied_at FROM migrations').all() as Migration[];
    const appliedMap = new Map(appliedMigrations.map(m => [m.name, m.applied_at]));

    return migrationFiles.map(name => ({
      name,
      applied: appliedMap.has(name),
      applied_at: appliedMap.get(name)
    }));
  }
}