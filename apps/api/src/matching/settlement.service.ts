import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { RedisService } from '../common/redis/redis.service';
import { TradeEntity } from './entities/trade.entity';
import { OrderEntity } from './entities/order.entity';
import { AccountEntity } from '../account/entities/account.entity';
import { AccountCashEntity } from '../account/entities/account-cash.entity';
import { AccountCoinEntity } from '../account/entities/account-coin.entity';
import { LockRecordEntity } from '../account/entities/lock-record.entity';
import { TransactionEntity } from '../account/entities/transaction.entity';
import {
  BusinessException,
  AccountFrozenException,
} from '../common/exceptions/business.exception';
import { getPairConfig } from '../common/constants/pairs.constant';

@Injectable()
export class SettlementService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private get redis() {
    return this.redisService.getClient();
  }

  private feeRateForOrderType(pairName: string, orderType: string): number {
    const pairCfg = getPairConfig(pairName);
    if (!pairCfg) return 0;
    // LIMIT orders that rest in the book are maker; MARKET orders are taker.
    // In our simplified POC: maker fee for LIMIT, taker fee for MARKET.
    return orderType === 'MARKET' ? pairCfg.takerFeeRate : pairCfg.makerFeeRate;
  }

  async settleTrade(tradeId: string): Promise<void> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction('SERIALIZABLE');

    try {
      const trade = await qr.manager.findOne(TradeEntity, {
        where: { id: tradeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!trade) {
        throw new BusinessException('Trade not found', 'TRADE_NOT_FOUND');
      }
      if (trade.settlementStatus === 'CONFIRMED') {
        await qr.commitTransaction();
        return;
      }
      if (trade.settlementStatus === 'FAILED') {
        throw new BusinessException('Trade already failed', 'TRADE_FAILED');
      }

      const bidOrder = await qr.manager.findOne(OrderEntity, {
        where: { id: trade.bidOrderId },
        lock: { mode: 'pessimistic_write' },
      });
      const askOrder = await qr.manager.findOne(OrderEntity, {
        where: { id: trade.askOrderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!bidOrder || !askOrder) {
        throw new BusinessException(
          'Order not found for trade',
          'ORDER_NOT_FOUND',
        );
      }

      const bidAccount = await qr.manager.findOne(AccountEntity, {
        where: { id: trade.bidAccountId },
        lock: { mode: 'pessimistic_write' },
      });
      const askAccount = await qr.manager.findOne(AccountEntity, {
        where: { id: trade.askAccountId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!bidAccount || !askAccount) {
        throw new BusinessException('Account not found', 'ACCOUNT_NOT_FOUND');
      }
      if (bidAccount.tradingStatus === 'FROZEN') {
        throw new AccountFrozenException(Number(bidAccount.id));
      }
      if (askAccount.tradingStatus === 'FROZEN') {
        throw new AccountFrozenException(Number(askAccount.id));
      }

      const pairCfg = getPairConfig(trade.pairName);
      if (!pairCfg) {
        throw new BusinessException('Pair not found', 'PAIR_NOT_FOUND');
      }

      const price = parseFloat(trade.price);
      const qty = parseFloat(trade.quantity);
      const value = price * qty; // quote value

      // Fee model (confirmed by user): fee charged in quote currency (USD).
      // Maker/Taker: resting LIMIT -> maker, incoming MARKET -> taker (simplified).
      const buyerRate = this.feeRateForOrderType(
        trade.pairName,
        bidOrder.orderType,
      );
      const sellerRate = this.feeRateForOrderType(
        trade.pairName,
        askOrder.orderType,
      );
      const buyerFee = value * buyerRate;
      const sellerFee = value * sellerRate;

      // 1) Buyer receives base coin (available += qty)
      const buyerCoin = await qr.manager.findOne(AccountCoinEntity, {
        where: { accountId: bidAccount.id, coinName: pairCfg.baseCoin },
        lock: { mode: 'pessimistic_write' },
      });
      if (!buyerCoin) {
        throw new BusinessException(
          'Buyer coin balance not found',
          'COIN_BALANCE_NOT_FOUND',
        );
      }
      const buyerAvail = parseFloat(buyerCoin.available);
      const buyerLocked = parseFloat(buyerCoin.locked);
      const buyerFrozen = parseFloat(buyerCoin.frozen);
      const buyerNewAvail = buyerAvail + qty;
      buyerCoin.available = buyerNewAvail.toString();
      buyerCoin.total = (buyerNewAvail + buyerLocked + buyerFrozen).toString();
      await qr.manager.save(buyerCoin);

      // 2) Seller receives quote cash (available += value - sellerFee)
      const sellerCash = await qr.manager.findOne(AccountCashEntity, {
        where: { accountId: askAccount.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!sellerCash) {
        throw new BusinessException(
          'Seller cash balance not found',
          'CASH_BALANCE_NOT_FOUND',
        );
      }
      const sellerAvailCash = parseFloat(sellerCash.available);
      const sellerLockedCash = parseFloat(sellerCash.locked);
      const sellerNewAvailCash = sellerAvailCash + (value - sellerFee);
      sellerCash.available = sellerNewAvailCash.toString();
      sellerCash.total = (sellerNewAvailCash + sellerLockedCash).toString();
      await qr.manager.save(sellerCash);

      // 3) Consume locked balances for both sides via lock_record
      // Buyer: locked cash decreases by (value + buyerFee)
      // Seller: locked coin decreases by qty
      await this.consumeOrderLock(
        qr,
        bidOrder.id,
        'CASH',
        pairCfg.quoteCurrency,
        value + buyerFee,
      );
      await this.consumeOrderLock(
        qr,
        askOrder.id,
        'COIN',
        pairCfg.baseCoin,
        qty,
      );

      // 4) Write tx audit
      const buyerTx = qr.manager.create(TransactionEntity, {
        accountId: bidAccount.id,
        transactionType: 'TRADE',
        assetName: pairCfg.baseCoin,
        amount: qty.toString(),
        balanceBefore: buyerAvail.toString(),
        balanceAfter: buyerNewAvail.toString(),
        referenceId: trade.id,
        referenceType: 'TRADE',
        opResult: 'SUCCESS',
        description: 'Trade settlement (buyer receives base)',
      });
      await qr.manager.save(buyerTx);

      const sellerTx = qr.manager.create(TransactionEntity, {
        accountId: askAccount.id,
        transactionType: 'TRADE',
        assetName: pairCfg.quoteCurrency,
        amount: (value - sellerFee).toString(),
        balanceBefore: sellerAvailCash.toString(),
        balanceAfter: sellerNewAvailCash.toString(),
        referenceId: trade.id,
        referenceType: 'TRADE',
        opResult: 'SUCCESS',
        description: 'Trade settlement (seller receives quote)',
      });
      await qr.manager.save(sellerTx);

      // 5) Update trade fields
      trade.buyerFee = buyerFee.toString();
      trade.sellerFee = sellerFee.toString();
      trade.settlementStatus = 'CONFIRMED';
      trade.settlementTime = new Date();
      await qr.manager.save(trade);

      await qr.commitTransaction();

      // Publish events (Phase 4 - Redis pub/sub for inter-service communication)
      await this.redis.publish(
        'trade.executed',
        JSON.stringify({
          tradeId: trade.id,
          pair: trade.pairName,
          price,
          quantity: qty,
          value,
          buyerFee,
          sellerFee,
        }),
      );
      await this.redis.publish(
        'order.matched',
        JSON.stringify({
          bidOrderId: trade.bidOrderId,
          askOrderId: trade.askOrderId,
          tradeId: trade.id,
        }),
      );

      // Emit EventEmitter2 events (Phase 6 - WebSocket real-time notifications)
      // Reload orders to get updated status
      const updatedBidOrder = await this.dataSource
        .getRepository(OrderEntity)
        .findOne({ where: { id: trade.bidOrderId } });
      const updatedAskOrder = await this.dataSource
        .getRepository(OrderEntity)
        .findOne({ where: { id: trade.askOrderId } });

      // Emit trade.executed event
      this.eventEmitter.emit('trade.executed', {
        tradeId: trade.id,
        pairName: trade.pairName,
        price: trade.price,
        quantity: trade.quantity,
        value: value.toString(),
        buyOrderId: trade.bidOrderId,
        sellOrderId: trade.askOrderId,
        buyUserId: bidAccount.userId.toString(),
        sellUserId: askAccount.userId.toString(),
        executedAt: trade.settlementTime,
      });

      // Emit order.matched events for both orders
      if (updatedBidOrder) {
        const bidRemaining = parseFloat(updatedBidOrder.remaining);
        const bidFilled = parseFloat(updatedBidOrder.filled);
        this.eventEmitter.emit('order.matched', {
          orderId: updatedBidOrder.id,
          userId: bidAccount.userId.toString(),
          pairName: updatedBidOrder.pairName,
          side: 'BUY',
          price: updatedBidOrder.price,
          quantity: updatedBidOrder.amount,
          matchedQuantity: qty.toString(),
          remainingQuantity: bidRemaining.toString(),
          oppositeOrderId: trade.askOrderId,
        });

        // If order is fully filled, emit order.filled
        if (
          updatedBidOrder.status === 'FILLED' ||
          updatedBidOrder.status === 'COMPLETED' ||
          bidRemaining <= 0
        ) {
          this.eventEmitter.emit('order.filled', {
            orderId: updatedBidOrder.id,
            userId: bidAccount.userId.toString(),
            pairName: updatedBidOrder.pairName,
            side: 'BUY',
            filledQuantity: bidFilled.toString(),
            averagePrice: updatedBidOrder.price || '0',
          });
        }
      }

      if (updatedAskOrder) {
        const askRemaining = parseFloat(updatedAskOrder.remaining);
        const askFilled = parseFloat(updatedAskOrder.filled);
        this.eventEmitter.emit('order.matched', {
          orderId: updatedAskOrder.id,
          userId: askAccount.userId.toString(),
          pairName: updatedAskOrder.pairName,
          side: 'SELL',
          price: updatedAskOrder.price,
          quantity: updatedAskOrder.amount,
          matchedQuantity: qty.toString(),
          remainingQuantity: askRemaining.toString(),
          oppositeOrderId: trade.bidOrderId,
        });

        // If order is fully filled, emit order.filled
        if (
          updatedAskOrder.status === 'FILLED' ||
          updatedAskOrder.status === 'COMPLETED' ||
          askRemaining <= 0
        ) {
          this.eventEmitter.emit('order.filled', {
            orderId: updatedAskOrder.id,
            userId: askAccount.userId.toString(),
            pairName: updatedAskOrder.pairName,
            side: 'SELL',
            filledQuantity: askFilled.toString(),
            averagePrice: updatedAskOrder.price || '0',
          });
        }
      }
    } catch (error) {
      await qr.rollbackTransaction();
      // Best effort: mark trade failed (keep locks for manual cleanup as per TDD)
      try {
        await this.dataSource
          .createQueryBuilder()
          .update(TradeEntity)
          .set({ settlementStatus: 'FAILED' })
          .where('id = :id', { id: tradeId })
          .execute();
      } catch {
        // ignore
      }
      throw error;
    } finally {
      await qr.release();
    }
  }

  private async consumeOrderLock(
    qr: import('typeorm').QueryRunner,
    orderId: string,
    lockType: 'CASH' | 'COIN',
    assetName: string,
    consumeAmount: number,
  ): Promise<void> {
    const lock = await qr.manager.findOne(LockRecordEntity, {
      where: { orderId, lockType, assetName, status: 'LOCKED' },
      lock: { mode: 'pessimistic_write' },
    });
    if (!lock) {
      throw new BusinessException('Lock record not found', 'LOCK_NOT_FOUND', {
        orderId,
        lockType,
        assetName,
      });
    }

    const lockedAmount = parseFloat(lock.lockAmount);
    if (lockedAmount + 1e-12 < consumeAmount) {
      throw new BusinessException(
        'Insufficient locked amount',
        'INSUFFICIENT_LOCKED',
        { orderId, lockedAmount, consumeAmount },
      );
    }

    // Update underlying balance locked field
    if (lockType === 'CASH') {
      const cash = await qr.manager.findOne(AccountCashEntity, {
        where: { accountId: lock.accountId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!cash) {
        throw new BusinessException(
          'Cash balance not found',
          'CASH_BALANCE_NOT_FOUND',
        );
      }
      const locked = parseFloat(cash.locked);
      const available = parseFloat(cash.available);
      const newLocked = locked - consumeAmount;
      cash.locked = newLocked.toString();
      cash.total = (available + newLocked).toString();
      await qr.manager.save(cash);
    } else {
      const coin = await qr.manager.findOne(AccountCoinEntity, {
        where: { accountId: lock.accountId, coinName: assetName },
        lock: { mode: 'pessimistic_write' },
      });
      if (!coin) {
        throw new BusinessException(
          'Coin balance not found',
          'COIN_BALANCE_NOT_FOUND',
        );
      }
      const locked = parseFloat(coin.locked);
      const available = parseFloat(coin.available);
      const frozen = parseFloat(coin.frozen);
      const newLocked = locked - consumeAmount;
      coin.locked = newLocked.toString();
      coin.total = (available + newLocked + frozen).toString();
      await qr.manager.save(coin);
    }

    const newLockAmount = Math.max(0, lockedAmount - consumeAmount);
    lock.lockAmount = newLockAmount.toString();
    if (newLockAmount <= 1e-12) {
      lock.status = 'UNLOCKED';
      lock.unlockedAt = new Date();
      lock.lockAmount = '0';
    }
    await qr.manager.save(lock);
  }
}
