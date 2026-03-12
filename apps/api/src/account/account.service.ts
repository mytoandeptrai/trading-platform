import { Injectable } from '@nestjs/common';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import {
  InsufficientBalanceException,
  AccountFrozenException,
  BusinessException,
} from '../common/exceptions/business.exception';
import { LoggerService } from '../common/logger/logger.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AccountService {
  constructor(
    private readonly logger: LoggerService,
    private readonly db: DatabaseService,
  ) {
    this.logger.setContext('AccountService');
  }

  async getOrCreateAccount(userId: number): Promise<any> {
    const client = await this.getDbClient();

    try {
      // Check if account exists
      let result = await client.query(
        'SELECT * FROM account WHERE user_id = $1',
        [userId],
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Create account
      result = await client.query(
        `INSERT INTO account (user_id, account_type, trading_status, kyc_level, total_balance, available_balance, locked_balance)
         VALUES ($1, 'INDIVIDUAL', 'ACTIVE', 1, 0, 0, 0)
         RETURNING *`,
        [userId],
      );

      const account = result.rows[0];

      // Create default cash balance (USD)
      await client.query(
        `INSERT INTO account_cash (account_id, currency_name, available, locked, total)
         VALUES ($1, 'USD', 0, 0, 0)`,
        [account.id],
      );

      this.logger.log(`Account created for user ${userId}`);

      return account;
    } finally {
      await client.end();
    }
  }

  async getBalance(userId: number): Promise<any> {
    const client = await this.getDbClient();

    try {
      // Get account
      const accountResult = await client.query(
        'SELECT * FROM account WHERE user_id = $1',
        [userId],
      );

      if (accountResult.rows.length === 0) {
        throw new BusinessException(
          'Account not found',
          'ACCOUNT_NOT_FOUND',
        );
      }

      const account = accountResult.rows[0];

      // Get cash balances
      const cashResult = await client.query(
        'SELECT * FROM account_cash WHERE account_id = $1',
        [account.id],
      );

      // Get coin balances
      const coinResult = await client.query(
        'SELECT * FROM account_coin WHERE account_id = $1',
        [account.id],
      );

      return {
        account: {
          id: account.id,
          accountType: account.account_type,
          tradingStatus: account.trading_status,
          kycLevel: account.kyc_level,
        },
        cash: cashResult.rows.map((row) => ({
          currency: row.currency_name,
          available: parseFloat(row.available),
          locked: parseFloat(row.locked),
          total: parseFloat(row.total),
        })),
        coins: coinResult.rows.map((row) => ({
          coin: row.coin_name,
          available: parseFloat(row.available),
          locked: parseFloat(row.locked),
          frozen: parseFloat(row.frozen),
          total: parseFloat(row.total),
        })),
      };
    } finally {
      await client.end();
    }
  }

  async deposit(userId: number, dto: DepositDto): Promise<any> {
    const client = await this.getDbClient();

    try {
      await client.query('BEGIN');

      // Get account
      const accountResult = await client.query(
        'SELECT * FROM account WHERE user_id = $1 FOR UPDATE',
        [userId],
      );

      if (accountResult.rows.length === 0) {
        throw new BusinessException(
          'Account not found',
          'ACCOUNT_NOT_FOUND',
        );
      }

      const account = accountResult.rows[0];

      // Check if account is frozen
      if (account.trading_status === 'FROZEN') {
        throw new AccountFrozenException(account.id);
      }

      const isCash = ['USD', 'VND'].includes(dto.asset);

      if (isCash) {
        // Update cash balance
        const cashResult = await client.query(
          `SELECT * FROM account_cash WHERE account_id = $1 FOR UPDATE`,
          [account.id],
        );

        const currentAvailable = parseFloat(cashResult.rows[0]?.available || '0');
        const newAvailable = currentAvailable + dto.amount;
        const newTotal = newAvailable + parseFloat(cashResult.rows[0]?.locked || '0');

        if (cashResult.rows.length === 0) {
          // Create cash balance
          await client.query(
            `INSERT INTO account_cash (account_id, currency_name, available, locked, total)
             VALUES ($1, $2, $3, 0, $3)`,
            [account.id, dto.asset, dto.amount],
          );
        } else {
          // Update cash balance
          await client.query(
            `UPDATE account_cash
             SET available = $1, total = $2, updated_at = NOW()
             WHERE account_id = $3`,
            [newAvailable, newTotal, account.id],
          );
        }
      } else {
        // Update coin balance
        const coinResult = await client.query(
          `SELECT * FROM account_coin WHERE account_id = $1 AND coin_name = $2 FOR UPDATE`,
          [account.id, dto.asset],
        );

        const currentAvailable = parseFloat(coinResult.rows[0]?.available || '0');
        const newAvailable = currentAvailable + dto.amount;
        const locked = parseFloat(coinResult.rows[0]?.locked || '0');
        const frozen = parseFloat(coinResult.rows[0]?.frozen || '0');
        const newTotal = newAvailable + locked + frozen;

        if (coinResult.rows.length === 0) {
          // Create coin balance
          await client.query(
            `INSERT INTO account_coin (account_id, coin_name, available, locked, frozen, total)
             VALUES ($1, $2, $3, 0, 0, $3)`,
            [account.id, dto.asset, dto.amount],
          );
        } else {
          // Update coin balance
          await client.query(
            `UPDATE account_coin
             SET available = $1, total = $2, updated_at = NOW()
             WHERE account_id = $3 AND coin_name = $4`,
            [newAvailable, newTotal, account.id, dto.asset],
          );
        }
      }

      // Create transaction record
      await client.query(
        `INSERT INTO transaction (account_id, transaction_type, asset_name, amount, balance_before, balance_after, op_result, description)
         VALUES ($1, 'DEPOSIT', $2, $3, $4, $5, 'SUCCESS', 'Deposit via API')`,
        [
          account.id,
          dto.asset,
          dto.amount,
          0, // balance_before (simplified)
          dto.amount, // balance_after (simplified)
        ],
      );

      await client.query('COMMIT');

      this.logger.log(
        `Deposit: ${dto.amount} ${dto.asset} to account ${account.id}`,
      );

      return {
        asset: dto.asset,
        amount: dto.amount,
        type: 'DEPOSIT',
        status: 'SUCCESS',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
  }

  async withdraw(userId: number, dto: WithdrawDto): Promise<any> {
    const client = await this.getDbClient();

    try {
      await client.query('BEGIN');

      // Get account
      const accountResult = await client.query(
        'SELECT * FROM account WHERE user_id = $1 FOR UPDATE',
        [userId],
      );

      if (accountResult.rows.length === 0) {
        throw new BusinessException(
          'Account not found',
          'ACCOUNT_NOT_FOUND',
        );
      }

      const account = accountResult.rows[0];

      // Check if account is frozen
      if (account.trading_status === 'FROZEN') {
        throw new AccountFrozenException(account.id);
      }

      const isCash = ['USD', 'VND'].includes(dto.asset);

      if (isCash) {
        // Get cash balance
        const cashResult = await client.query(
          `SELECT * FROM account_cash WHERE account_id = $1 FOR UPDATE`,
          [account.id],
        );

        if (cashResult.rows.length === 0) {
          throw new InsufficientBalanceException(dto.amount, 0);
        }

        const currentAvailable = parseFloat(cashResult.rows[0].available);

        if (currentAvailable < dto.amount) {
          throw new InsufficientBalanceException(dto.amount, currentAvailable);
        }

        const newAvailable = currentAvailable - dto.amount;
        const newTotal = newAvailable + parseFloat(cashResult.rows[0].locked);

        await client.query(
          `UPDATE account_cash
           SET available = $1, total = $2, updated_at = NOW()
           WHERE account_id = $3`,
          [newAvailable, newTotal, account.id],
        );
      } else {
        // Get coin balance
        const coinResult = await client.query(
          `SELECT * FROM account_coin WHERE account_id = $1 AND coin_name = $2 FOR UPDATE`,
          [account.id, dto.asset],
        );

        if (coinResult.rows.length === 0) {
          throw new InsufficientBalanceException(dto.amount, 0);
        }

        const currentAvailable = parseFloat(coinResult.rows[0].available);

        if (currentAvailable < dto.amount) {
          throw new InsufficientBalanceException(dto.amount, currentAvailable);
        }

        const newAvailable = currentAvailable - dto.amount;
        const locked = parseFloat(coinResult.rows[0].locked);
        const frozen = parseFloat(coinResult.rows[0].frozen);
        const newTotal = newAvailable + locked + frozen;

        await client.query(
          `UPDATE account_coin
           SET available = $1, total = $2, updated_at = NOW()
           WHERE account_id = $3 AND coin_name = $4`,
          [newAvailable, newTotal, account.id, dto.asset],
        );
      }

      // Create transaction record
      await client.query(
        `INSERT INTO transaction (account_id, transaction_type, asset_name, amount, balance_before, balance_after, op_result, description)
         VALUES ($1, 'WITHDRAW', $2, $3, $4, $5, 'SUCCESS', 'Withdraw via API')`,
        [
          account.id,
          dto.asset,
          dto.amount,
          dto.amount, // balance_before (simplified)
          0, // balance_after (simplified)
        ],
      );

      await client.query('COMMIT');

      this.logger.log(
        `Withdraw: ${dto.amount} ${dto.asset} from account ${account.id}`,
      );

      return {
        asset: dto.asset,
        amount: dto.amount,
        type: 'WITHDRAW',
        status: 'SUCCESS',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
  }

  async getTransactionHistory(userId: number, limit = 50, offset = 0): Promise<any> {
    const client = await this.getDbClient();

    try {
      // Get account
      const accountResult = await client.query(
        'SELECT id FROM account WHERE user_id = $1',
        [userId],
      );

      if (accountResult.rows.length === 0) {
        throw new BusinessException(
          'Account not found',
          'ACCOUNT_NOT_FOUND',
        );
      }

      const accountId = accountResult.rows[0].id;

      // Get transactions
      const result = await client.query(
        `SELECT * FROM transaction
         WHERE account_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [accountId, limit, offset],
      );

      // Get total count
      const countResult = await client.query(
        'SELECT COUNT(*) FROM transaction WHERE account_id = $1',
        [accountId],
      );

      return {
        transactions: result.rows.map((row) => ({
          id: row.id,
          type: row.transaction_type,
          asset: row.asset_name,
          amount: parseFloat(row.amount),
          balanceBefore: parseFloat(row.balance_before),
          balanceAfter: parseFloat(row.balance_after),
          status: row.op_result,
          description: row.description,
          createdAt: row.created_at,
        })),
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit,
          offset,
        },
      };
    } finally {
      await client.end();
    }
  }
}
