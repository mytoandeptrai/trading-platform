import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import {
  InsufficientBalanceException,
  AccountFrozenException,
  BusinessException,
} from '../common/exceptions/business.exception';
import { AccountEntity } from './entities/account.entity';
import { AccountCashEntity } from './entities/account-cash.entity';
import { AccountCoinEntity } from './entities/account-coin.entity';
import { TransactionEntity } from './entities/transaction.entity';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
    @InjectRepository(AccountCashEntity)
    private readonly cashRepo: Repository<AccountCashEntity>,
    @InjectRepository(AccountCoinEntity)
    private readonly coinRepo: Repository<AccountCoinEntity>,
    @InjectRepository(TransactionEntity)
    private readonly txRepo: Repository<TransactionEntity>,
  ) {}

  async ensureAccountForUser(userId: number): Promise<AccountEntity> {
    const existing = await this.accountRepo.findOne({
      where: { userId: String(userId) },
      relations: ['cashBalance'],
    });

    if (existing) {
      return existing;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const account = queryRunner.manager.create(AccountEntity, {
        userId: String(userId),
        accountType: 'INDIVIDUAL',
        tradingStatus: 'ACTIVE',
        kycLevel: 1,
        totalBalance: '0',
        availableBalance: '0',
        lockedBalance: '0',
      });
      const savedAccount = await queryRunner.manager.save(account);

      const cash = queryRunner.manager.create(AccountCashEntity, {
        accountId: savedAccount.id,
        currencyName: 'USD',
        available: '0',
        locked: '0',
        total: '0',
      });
      await queryRunner.manager.save(cash);

      await queryRunner.commitTransaction();

      this.logger.log(`Account created for user ${userId}`);

      return savedAccount;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createAccountForUser(userId: number): Promise<AccountEntity> {
    const existing = await this.accountRepo.findOne({
      where: { userId: String(userId) },
    });

    if (existing) {
      throw new BusinessException('Account already exists', 'ACCOUNT_EXISTS');
    }

    return this.ensureAccountForUser(userId);
  }

  async getBalance(userId: number): Promise<any> {
    const account = await this.accountRepo.findOne({
      where: { userId: String(userId) },
      relations: ['cashBalance', 'coinBalances'],
    });

    if (!account) {
      throw new BusinessException('Account not found', 'ACCOUNT_NOT_FOUND');
    }

    return {
      account: {
        id: Number(account.id),
        accountType: account.accountType,
        tradingStatus: account.tradingStatus,
        kycLevel: account.kycLevel,
      },
      cash: account.cashBalance
        ? [
            {
              currency: account.cashBalance.currencyName,
              available: parseFloat(account.cashBalance.available),
              locked: parseFloat(account.cashBalance.locked),
              total: parseFloat(account.cashBalance.total),
            },
          ]
        : [],
      coins: account.coinBalances?.map((coin) => ({
        coin: coin.coinName,
        available: parseFloat(coin.available),
        locked: parseFloat(coin.locked),
        frozen: parseFloat(coin.frozen),
        total: parseFloat(coin.total),
      })),
    };
  }

  async deposit(userId: number, dto: DepositDto): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const account = await queryRunner.manager.findOne(AccountEntity, {
        where: { userId: String(userId) },
        lock: { mode: 'pessimistic_write' },
      });

      if (!account) {
        throw new BusinessException('Account not found', 'ACCOUNT_NOT_FOUND');
      }

      if (account.tradingStatus === 'FROZEN') {
        throw new AccountFrozenException(Number(account.id));
      }

      const isCash = ['USD', 'VND'].includes(dto.asset);

      if (isCash) {
        let cash = await queryRunner.manager.findOne(AccountCashEntity, {
          where: { accountId: account.id },
          lock: { mode: 'pessimistic_write' },
        });

        const currentAvailable = cash ? parseFloat(cash.available) : 0;
        const currentLocked = cash ? parseFloat(cash.locked) : 0;
        const newAvailable = currentAvailable + dto.amount;
        const newTotal = newAvailable + currentLocked;

        if (!cash) {
          cash = queryRunner.manager.create(AccountCashEntity, {
            accountId: account.id,
            currencyName: dto.asset,
            available: newAvailable.toString(),
            locked: currentLocked.toString(),
            total: newTotal.toString(),
          });
        } else {
          cash.available = newAvailable.toString();
          cash.total = newTotal.toString();
        }

        await queryRunner.manager.save(cash);

        const tx = queryRunner.manager.create(TransactionEntity, {
          accountId: account.id,
          transactionType: 'DEPOSIT',
          assetName: dto.asset,
          amount: dto.amount.toString(),
          balanceBefore: currentAvailable.toString(),
          balanceAfter: newAvailable.toString(),
          opResult: 'SUCCESS',
          description: 'Deposit via API',
        });
        await queryRunner.manager.save(tx);
      } else {
        let coin = await queryRunner.manager.findOne(AccountCoinEntity, {
          where: { accountId: account.id, coinName: dto.asset },
          lock: { mode: 'pessimistic_write' },
        });

        const currentAvailable = coin ? parseFloat(coin.available) : 0;
        const locked = coin ? parseFloat(coin.locked) : 0;
        const frozen = coin ? parseFloat(coin.frozen) : 0;
        const newAvailable = currentAvailable + dto.amount;
        const newTotal = newAvailable + locked + frozen;

        if (!coin) {
          coin = queryRunner.manager.create(AccountCoinEntity, {
            accountId: account.id,
            coinName: dto.asset,
            available: newAvailable.toString(),
            locked: locked.toString(),
            frozen: frozen.toString(),
            total: newTotal.toString(),
          });
        } else {
          coin.available = newAvailable.toString();
          coin.total = newTotal.toString();
        }

        await queryRunner.manager.save(coin);

        const tx = queryRunner.manager.create(TransactionEntity, {
          accountId: account.id,
          transactionType: 'DEPOSIT',
          assetName: dto.asset,
          amount: dto.amount.toString(),
          balanceBefore: currentAvailable.toString(),
          balanceAfter: newAvailable.toString(),
          opResult: 'SUCCESS',
          description: 'Deposit via API',
        });
        await queryRunner.manager.save(tx);
      }

      await queryRunner.commitTransaction();

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
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async withdraw(userId: number, dto: WithdrawDto): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const account = await queryRunner.manager.findOne(AccountEntity, {
        where: { userId: String(userId) },
        lock: { mode: 'pessimistic_write' },
      });

      if (!account) {
        throw new BusinessException('Account not found', 'ACCOUNT_NOT_FOUND');
      }

      if (account.tradingStatus === 'FROZEN') {
        throw new AccountFrozenException(Number(account.id));
      }

      const isCash = ['USD', 'VND'].includes(dto.asset);

      if (isCash) {
        const cash = await queryRunner.manager.findOne(AccountCashEntity, {
          where: { accountId: account.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!cash) {
          throw new InsufficientBalanceException(dto.amount, 0);
        }

        const currentAvailable = parseFloat(cash.available);

        if (currentAvailable < dto.amount) {
          throw new InsufficientBalanceException(dto.amount, currentAvailable);
        }

        const newAvailable = currentAvailable - dto.amount;
        const locked = parseFloat(cash.locked);
        const newTotal = newAvailable + locked;

        cash.available = newAvailable.toString();
        cash.total = newTotal.toString();

        await queryRunner.manager.save(cash);

        const tx = queryRunner.manager.create(TransactionEntity, {
          accountId: account.id,
          transactionType: 'WITHDRAW',
          assetName: dto.asset,
          amount: dto.amount.toString(),
          balanceBefore: currentAvailable.toString(),
          balanceAfter: newAvailable.toString(),
          opResult: 'SUCCESS',
          description: 'Withdraw via API',
        });
        await queryRunner.manager.save(tx);
      } else {
        const coin = await queryRunner.manager.findOne(AccountCoinEntity, {
          where: { accountId: account.id, coinName: dto.asset },
          lock: { mode: 'pessimistic_write' },
        });

        if (!coin) {
          throw new InsufficientBalanceException(dto.amount, 0);
        }

        const currentAvailable = parseFloat(coin.available);

        if (currentAvailable < dto.amount) {
          throw new InsufficientBalanceException(dto.amount, currentAvailable);
        }

        const newAvailable = currentAvailable - dto.amount;
        const locked = parseFloat(coin.locked);
        const frozen = parseFloat(coin.frozen);
        const newTotal = newAvailable + locked + frozen;

        coin.available = newAvailable.toString();
        coin.total = newTotal.toString();

        await queryRunner.manager.save(coin);

        const tx = queryRunner.manager.create(TransactionEntity, {
          accountId: account.id,
          transactionType: 'WITHDRAW',
          assetName: dto.asset,
          amount: dto.amount.toString(),
          balanceBefore: currentAvailable.toString(),
          balanceAfter: newAvailable.toString(),
          opResult: 'SUCCESS',
          description: 'Withdraw via API',
        });
        await queryRunner.manager.save(tx);
      }

      await queryRunner.commitTransaction();

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
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactionHistory(
    userId: number,
    limit = 50,
    offset = 0,
  ): Promise<any> {
    const account = await this.accountRepo.findOne({
      where: { userId: String(userId) },
    });

    if (!account) {
      throw new BusinessException('Account not found', 'ACCOUNT_NOT_FOUND');
    }

    const [rows, total] = await this.txRepo.findAndCount({
      where: { accountId: account.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      transactions: rows.map((row) => ({
        id: Number(row.id),
        type: row.transactionType,
        asset: row.assetName,
        amount: parseFloat(row.amount),
        balanceBefore: parseFloat(row.balanceBefore),
        balanceAfter: parseFloat(row.balanceAfter),
        status: row.opResult,
        description: row.description,
        createdAt: row.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }
}
