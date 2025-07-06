-- Add transactions table for persistent cross-chain transaction tracking
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('plant_seed', 'harvest_seed', 'claim_yield')),
  status TEXT NOT NULL CHECK (status IN ('preparing', 'wallet_confirm', 'saga_pending', 'axelar_processing', 'arbitrum_pending', 'completed', 'failed')),
  
  -- Transaction hashes for each chain
  saga_tx_hash TEXT,
  arbitrum_tx_hash TEXT,
  axelar_tx_id TEXT,
  axelar_tx_hash TEXT,
  
  -- Timing information
  start_time INTEGER NOT NULL,
  last_updated INTEGER NOT NULL,
  estimated_completion_time INTEGER,
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Seed-specific data (JSON)
  seed_type INTEGER,
  seed_id INTEGER,
  amount TEXT, -- Store as string to handle BigInt values
  gas_estimate TEXT,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX idx_transactions_player_id ON transactions (player_id);
CREATE INDEX idx_transactions_status ON transactions (status);
CREATE INDEX idx_transactions_type ON transactions (type);
CREATE INDEX idx_transactions_player_status ON transactions (player_id, status);
CREATE INDEX idx_transactions_start_time ON transactions (start_time DESC);
CREATE INDEX idx_transactions_updated_at ON transactions (updated_at DESC);