import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { AccountEntity } from './entities/account.entity';
import { AccountCashEntity } from './entities/account-cash.entity';
import { AccountCoinEntity } from './entities/account-coin.entity';
import { LockRecordEntity } from './entities/lock-record.entity';
import { TransactionEntity } from './entities/transaction.entity';
import {
  BusinessException,
  InsufficientBalanceException,
} from '../common/exceptions/business.exception';

@Injectable()
export class BalanceService {
  constructor(private readonly dataSource: DataSource) {}

  async lockCashForOrder(
    qr: QueryRunner,
    accountId: string,
    currency: string,
    requiredAmount: number,
    orderId: string,
  ): Promise<void> {
    const account = await qr.manager.findOne(AccountEntity, {
      where: { id: accountId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!account) {
      throw new BusinessException('Account not found', 'ACCOUNT_NOT_FOUND');
    }

    const cash = await qr.manager.findOne(AccountCashEntity, {
      where: { accountId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!cash) {
      throw new InsufficientBalanceException(requiredAmount, 0);
    }

    const available = parseFloat(cash.available);

    if (available < requiredAmount) {
      throw new InsufficientBalanceException(requiredAmount, available);
    }

    const newAvailable = available - requiredAmount;
    const locked = parseFloat(cash.locked);
    const newLocked = locked + requiredAmount;
    const newTotal = newAvailable + newLocked;

    cash.available = newAvailable.toString();
    cash.locked = newLocked.toString();
    cash.total = newTotal.toString();
    await qr.manager.save(cash);

    const lock = qr.manager.create(LockRecordEntity, {
      accountId,
      orderId,
      lockType: 'CASH',
      assetName: currency,
      lockAmount: requiredAmount.toString(),
      status: 'LOCKED',
    });
    await qr.manager.save(lock);

    const tx = qr.manager.create(TransactionEntity, {
      accountId: accountId.toString(),
      transactionType: 'LOCK',
      assetName: currency,
      amount: requiredAmount.toString(),
      balanceBefore: available.toString(),
      balanceAfter: newAvailable.toString(),
      referenceId: orderId,
      referenceType: 'ORDER',
      opResult: 'SUCCESS',
      description: 'Lock cash for order placement',
    });
    await qr.manager.save(tx);
  }

  async lockCoinForOrder(
    qr: QueryRunner,
    accountId: string,
    coin: string,
    requiredAmount: number,
    orderId: string,
  ): Promise<void> {
    const account = await qr.manager.findOne(AccountEntity, {
      where: { id: accountId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!account) {
      throw new BusinessException('Account not found', 'ACCOUNT_NOT_FOUND');
    }

    const balance = await qr.manager.findOne(AccountCoinEntity, {
      where: { accountId, coinName: coin },
      lock: { mode: 'pessimistic_write' },
    });

    if (!balance) {
      throw new InsufficientBalanceException(requiredAmount, 0);
    }

    const available = parseFloat(balance.available);

    if (available < requiredAmount) {
      throw new InsufficientBalanceException(requiredAmount, available);
    }

    const newAvailable = available - requiredAmount;
    const locked = parseFloat(balance.locked);
    const frozen = parseFloat(balance.frozen);
    const newLocked = locked + requiredAmount;
    const newTotal = newAvailable + newLocked + frozen;

    balance.available = newAvailable.toString();
    balance.locked = newLocked.toString();
    balance.total = newTotal.toString();
    await qr.manager.save(balance);

    const lock = qr.manager.create(LockRecordEntity, {
      accountId,
      orderId,
      lockType: 'COIN',
      assetName: coin,
      lockAmount: requiredAmount.toString(),
      status: 'LOCKED',
    });
    await qr.manager.save(lock);

    const tx = qr.manager.create(TransactionEntity, {
      accountId: accountId.toString(),
      transactionType: 'LOCK',
      assetName: coin,
      amount: requiredAmount.toString(),
      balanceBefore: available.toString(),
      balanceAfter: newAvailable.toString(),
      referenceId: orderId,
      referenceType: 'ORDER',
      opResult: 'SUCCESS',
      description: 'Lock coin for order placement',
    });
    await qr.manager.save(tx);
  }

  async unlockForOrder(orderId: string): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const locks = await qr.manager.find(LockRecordEntity, {
        where: { orderId, status: 'LOCKED' },
        lock: { mode: 'pessimistic_write' },
      });

      for (const lock of locks) {
        if (lock.lockType === 'CASH') {
          const cash = await qr.manager.findOne(AccountCashEntity, {
            where: { accountId: lock.accountId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!cash) {
            continue;
          }

          const locked = parseFloat(cash.locked);
          const available = parseFloat(cash.available);
          const amount = parseFloat(lock.lockAmount);

          const newLocked = locked - amount;
          const newAvailable = available + amount;
          const newTotal = newAvailable + newLocked;

          cash.locked = newLocked.toString();
          cash.available = newAvailable.toString();
          cash.total = newTotal.toString();
          await qr.manager.save(cash);

          const tx = qr.manager.create(TransactionEntity, {
            accountId: lock.accountId.toString(),
            transactionType: 'UNLOCK',
            assetName: lock.assetName,
            amount: amount.toString(),
            balanceBefore: available.toString(),
            balanceAfter: newAvailable.toString(),
            referenceId: orderId,
            referenceType: 'ORDER',
            opResult: 'SUCCESS',
            description: 'Unlock cash after order cancel',
          });
          await qr.manager.save(tx);
        } else {
          const coin = await qr.manager.findOne(AccountCoinEntity, {
            where: { accountId: lock.accountId, coinName: lock.assetName },
            lock: { mode: 'pessimistic_write' },
          });
          if (!coin) {
            continue;
          }

          const locked = parseFloat(coin.locked);
          const available = parseFloat(coin.available);
          const frozen = parseFloat(coin.frozen);
          const amount = parseFloat(lock.lockAmount);

          const newLocked = locked - amount;
          const newAvailable = available + amount;
          const newTotal = newAvailable + newLocked + frozen;

          coin.locked = newLocked.toString();
          coin.available = newAvailable.toString();
          coin.total = newTotal.toString();
          await qr.manager.save(coin);

          const tx = qr.manager.create(TransactionEntity, {
            accountId: lock.accountId.toString(),
            transactionType: 'UNLOCK',
            assetName: lock.assetName,
            amount: amount.toString(),
            balanceBefore: available.toString(),
            balanceAfter: newAvailable.toString(),
            referenceId: orderId,
            referenceType: 'ORDER',
            opResult: 'SUCCESS',
            description: 'Unlock coin after order cancel',
          });
          await qr.manager.save(tx);
        }

        lock.status = 'UNLOCKED';
        lock.unlockedAt = new Date();
        await qr.manager.save(lock);
      }

      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }
}
