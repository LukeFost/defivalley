import { NextRequest, NextResponse } from 'next/server';
import { databaseService, Transaction } from '../../../lib/db';

// Use the Transaction type from DatabaseService directly
type TransactionData = Transaction;

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

    // Get transactions from database based on activeOnly flag
    let transactions: TransactionData[];
    
    if (activeOnly) {
      transactions = databaseService.getActiveTransactions(playerId);
    } else {
      transactions = databaseService.getPlayerTransactions(playerId, limit, offset);
    }

    // For activeOnly, we still need to apply pagination
    const paginatedTransactions = activeOnly 
      ? transactions.slice(offset, offset + limit)
      : transactions;

    // Get total count for pagination info
    const totalTransactions = activeOnly 
      ? databaseService.getActiveTransactions(playerId).length
      : databaseService.getPlayerTransactions(playerId, 10000, 0).length; // Large limit to get total

    return NextResponse.json({
      transactions: paginatedTransactions,
      total: totalTransactions,
      hasMore: offset + limit < totalTransactions
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

    // Save transaction to database
    const savedTransaction = databaseService.saveTransaction(transaction);

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

    // Update transaction in database
    const updatedTransaction = databaseService.updateTransaction(id, updates);

    if (!updatedTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      transaction: updatedTransaction,
      success: true 
    });

  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}