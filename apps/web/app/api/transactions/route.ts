import { NextRequest, NextResponse } from 'next/server';

interface TransactionData {
  id: string;
  player_id: string;
  type: 'plant_seed' | 'harvest_seed' | 'claim_yield';
  status: 'preparing' | 'wallet_confirm' | 'saga_pending' | 'axelar_processing' | 'arbitrum_pending' | 'completed' | 'failed';
  saga_tx_hash?: string;
  arbitrum_tx_hash?: string;
  axelar_tx_id?: string;
  axelar_tx_hash?: string;
  start_time: number;
  last_updated: number;
  estimated_completion_time?: number;
  error_message?: string;
  retry_count: number;
  seed_type?: number;
  seed_id?: number;
  amount?: string;
  gas_estimate?: string;
}

// GET /api/transactions - Get player transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

    // Validate input
    if (!/^[a-zA-Z0-9_-]+$/.test(playerId)) {
      return NextResponse.json({ error: 'Invalid player ID format' }, { status: 400 });
    }

    // Mock response for now - replace with actual database call
    const mockTransactions: TransactionData[] = [
      {
        id: 'tx_001',
        player_id: playerId,
        type: 'plant_seed',
        status: 'completed',
        saga_tx_hash: '0x123...',
        arbitrum_tx_hash: '0x456...',
        start_time: Date.now() - 300000,
        last_updated: Date.now() - 60000,
        retry_count: 0,
        seed_type: 0,
        amount: '100000000',
      },
      {
        id: 'tx_002',
        player_id: playerId,
        type: 'harvest_seed',
        status: 'saga_pending',
        saga_tx_hash: '0x789...',
        start_time: Date.now() - 120000,
        last_updated: Date.now() - 30000,
        retry_count: 0,
        seed_id: 1,
      }
    ];

    const filteredTransactions = activeOnly 
      ? mockTransactions.filter(tx => !['completed', 'failed'].includes(tx.status))
      : mockTransactions;

    return NextResponse.json({
      transactions: filteredTransactions.slice(offset, offset + limit),
      total: filteredTransactions.length,
      hasMore: offset + limit < filteredTransactions.length
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/transactions - Save/update transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction, action = 'save' } = body;

    if (!transaction || !transaction.id || !transaction.player_id) {
      return NextResponse.json({ error: 'Invalid transaction data' }, { status: 400 });
    }

    // Validate transaction data
    if (!/^[a-zA-Z0-9_-]+$/.test(transaction.player_id)) {
      return NextResponse.json({ error: 'Invalid player ID format' }, { status: 400 });
    }

    if (!['plant_seed', 'harvest_seed', 'claim_yield'].includes(transaction.type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    const validStatuses = ['preparing', 'wallet_confirm', 'saga_pending', 'axelar_processing', 'arbitrum_pending', 'completed', 'failed'];
    if (!validStatuses.includes(transaction.status)) {
      return NextResponse.json({ error: 'Invalid transaction status' }, { status: 400 });
    }

    // For now, just return the transaction as saved
    // In real implementation, save to database
    const savedTransaction = {
      ...transaction,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({ 
      transaction: savedTransaction,
      success: true 
    });

  } catch (error) {
    console.error('Error saving transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/transactions - Update transaction
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({ error: 'Transaction ID and updates are required' }, { status: 400 });
    }

    // Validate updates
    if (updates.status && !['preparing', 'wallet_confirm', 'saga_pending', 'axelar_processing', 'arbitrum_pending', 'completed', 'failed'].includes(updates.status)) {
      return NextResponse.json({ error: 'Invalid transaction status' }, { status: 400 });
    }

    // For now, just return the updated transaction
    // In real implementation, update in database
    const updatedTransaction = {
      id,
      ...updates,
      updated_at: new Date().toISOString()
    };

    return NextResponse.json({ 
      transaction: updatedTransaction,
      success: true 
    });

  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}