/**
 * Matching processor: BullMQ worker that runs one job per order.
 * Flow: load order → matchLoop (get best opposite from Redis per-order book → create trade + update orders in DB tx → settle → update Redis level aggregates → remove completed opposite from book) → repeat until no fill or no liquidity.
 */
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrderEntity } from '../entities/order.entity';
import { TradeEntity } from '../entities/trade.entity';
import { OrderbookService } from '../orderbook.service';
import { SettlementService } from '../settlement.service';
import { BusinessException } from '../../common/exceptions/business.exception';

type ProcessOrderJob = {
  orderId: number;
};

@Injectable()
@Processor('order-matching')
export class MatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(MatchingProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly orderbookService: OrderbookService,
    private readonly settlementService: SettlementService,
  ) {
    super();
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ProcessOrderJob>): void {
    this.logger.log(
      `Matching job completed: jobId=${job.id}, orderId=${job.data?.orderId}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ProcessOrderJob>, error: Error): void {
    // Log failure for monitoring; job may be retried by BullMQ depending on config.
    this.logger.error(
      `Matching job failed: jobId=${job.id}, orderId=${job.data?.orderId}, error=${error.message}`,
      error.stack ?? '',
    );
  }

  /**
   * BullMQ job entry: process one order for matching.
   * Only orders that are PENDING or PARTLY_FILLED with remaining > 0 are run through the match loop.
   */
  async process(job: Job<ProcessOrderJob>): Promise<void> {
    const started = Date.now();
    const orderId = job.data?.orderId;
    if (!orderId) return;

    const order = await this.dataSource.getRepository(OrderEntity).findOne({
      where: { id: String(orderId) },
    });
    if (!order) return;

    // Only active orders that can still receive fills
    if (!['PENDING', 'PARTLY_FILLED'].includes(order.status)) {
      return;
    }

    const remaining = parseFloat(order.remaining);
    if (remaining <= 0) {
      return;
    }

    try {
      await this.matchLoop(order.id);
    } finally {
      const ms = Date.now() - started;
      this.logger.log(`Processed order=${orderId} in ${ms}ms`);
    }
  }

  /**
   * Main matching loop: repeatedly find best opposite order from Redis (per-order book),
   * create a trade, update both orders, settle, then update UI orderbook levels.
   * We reload the incoming order each iteration so remaining/status stay correct after each fill.
   */
  private async matchLoop(orderId: string): Promise<void> {
    while (true) {
      // Reload every iteration: remaining/filled/status may have changed in previous iteration or by settlement.
      const order = await this.dataSource.getRepository(OrderEntity).findOne({
        where: { id: orderId },
      });
      if (!order) return;
      if (!['PENDING', 'PARTLY_FILLED'].includes(order.status)) return;

      const remaining = parseFloat(order.remaining);
      if (remaining <= 0) {
        // Normalize to COMPLETED so DB is consistent
        if (order.status !== 'COMPLETED') {
          order.status = 'COMPLETED';
          order.remaining = '0';
          await this.dataSource.getRepository(OrderEntity).save(order);
        }
        return;
      }

      const pair = order.pairName;
      const isBid = order.isBid;

      // Best opposite from Redis per-order ZSET (price-time priority). BUY → best ask; SELL → best bid.
      const bestOpp = isBid
        ? await this.orderbookService.getBestAsk(pair)
        : await this.orderbookService.getBestBid(pair);
      if (!bestOpp) {
        // No liquidity on the book. MARKET: mark PARTLY_FILLED if we filled something, else CANCELED. LIMIT: leave resting.
        if (order.orderType === 'MARKET') {
          order.status =
            parseFloat(order.filled) > 0 ? 'PARTLY_FILLED' : 'CANCELED';
          await this.dataSource.getRepository(OrderEntity).save(order);
        }
        return;
      }

      // Resolve opposite order from DB; Redis might still have an id for an already-filled/canceled order.
      const oppOrder = await this.dataSource
        .getRepository(OrderEntity)
        .findOne({
          where: { id: bestOpp.orderId },
        });
      if (!oppOrder) {
        // Stale id in Redis: remove from per-order book and try next best.
        await this.orderbookService.removeOrder(pair, !isBid, bestOpp.orderId);
        continue;
      }
      if (!['PENDING', 'PARTLY_FILLED'].includes(oppOrder.status)) {
        // Opposite order no longer active; remove from book and retry.
        await this.orderbookService.removeOrder(pair, !isBid, oppOrder.id);
        continue;
      }

      // LIMIT orders only match at or better than their limit. MARKET accepts any opposite price.
      const oppPrice = bestOpp.price;
      if (order.orderType === 'LIMIT') {
        const limitPrice = parseFloat(order.price ?? '0');
        if (isBid && oppPrice > limitPrice) return; // BUY: only match if ask <= limit
        if (!isBid && oppPrice < limitPrice) return; // SELL: only match if bid >= limit
      }

      const orderRem = parseFloat(order.remaining);
      const oppRem = parseFloat(oppOrder.remaining);
      const matchQty = Math.min(orderRem, oppRem);
      if (matchQty <= 0) {
        return;
      }

      // --- Atomic block: create trade + update both orders (filled/remaining/status) ---
      // Use transaction + FOR UPDATE so concurrent workers don't double-fill the same order.
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      let tradeId: string | null = null;
      let fillQty = 0;
      // Collect (pair, side, price, qty) for LIMIT orders; used after settlement to update Redis levels.
      const limitUpdates: {
        pair: string;
        isBid: boolean;
        price: number;
        qty: number;
      }[] = [];
      let bidOrderId: string | null = null;
      let askOrderId: string | null = null;

      try {
        // Lock both orders so no other job can match them at the same time.
        const [lockedOrder, lockedOpp] = await Promise.all([
          qr.manager.findOne(OrderEntity, {
            where: { id: order.id },
            lock: { mode: 'pessimistic_write' },
          }),
          qr.manager.findOne(OrderEntity, {
            where: { id: oppOrder.id },
            lock: { mode: 'pessimistic_write' },
          }),
        ]);

        if (!lockedOrder || !lockedOpp) {
          throw new BusinessException('Order not found', 'ORDER_NOT_FOUND');
        }

        // Re-read remaining under lock: it might have changed since we read bestOpp.
        const lockedOrderRem = parseFloat(lockedOrder.remaining);
        const lockedOppRem = parseFloat(lockedOpp.remaining);
        const qty = Math.min(matchQty, lockedOrderRem, lockedOppRem);
        if (qty <= 0) {
          await qr.rollbackTransaction();
          continue;
        }

        fillQty = qty;
        const price = oppPrice; // maker price
        const value = price * qty;

        const bid = isBid ? lockedOrder : lockedOpp;
        const ask = isBid ? lockedOpp : lockedOrder;
        bidOrderId = bid.id;
        askOrderId = ask.id;

        const trade = qr.manager.create(TradeEntity, {
          bidOrderId: bid.id,
          bidAccountId: bid.accountId,
          askOrderId: ask.id,
          askAccountId: ask.accountId,
          pairName: pair,
          price: price.toString(),
          quantity: qty.toString(),
          value: value.toString(),
          settlementStatus: 'PENDING',
        });
        const savedTrade = await qr.manager.save(trade);
        tradeId = savedTrade.id;

        // Record level updates for Redis (applied only after settlement succeeds).
        const recordLevelUpdate = (o: OrderEntity) => {
          if (o.orderType !== 'LIMIT' || !o.price) return;
          limitUpdates.push({
            pair,
            isBid: o.isBid,
            price,
            qty,
          });
        };
        recordLevelUpdate(lockedOrder);
        recordLevelUpdate(lockedOpp);

        // Commit only the trade. Order filled/remaining/status updated only after settlement succeeds.
        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }

      if (!tradeId || !bidOrderId || !askOrderId) return;

      // --- Settlement first. If it fails, orders are never updated (no "complete" without settlement). ---
      await this.settlementService.settleTrade(tradeId);

      // --- Only after settlement: update order filled/remaining/status ---
      const orderRepo = this.dataSource.getRepository(OrderEntity);
      const [bidOrder, askOrder] = await Promise.all([
        orderRepo.findOne({ where: { id: bidOrderId } }),
        orderRepo.findOne({ where: { id: askOrderId } }),
      ]);
      if (bidOrder && askOrder) {
        const applyFill = (o: OrderEntity, fillQty: number) => {
          const filled = parseFloat(o.filled) + fillQty;
          const remaining2 = Math.max(parseFloat(o.amount) - filled, 0);
          o.filled = filled.toString();
          o.remaining = remaining2.toString();
          o.status = remaining2 <= 0 ? 'COMPLETED' : 'PARTLY_FILLED';
        };
        applyFill(bidOrder, fillQty);
        applyFill(askOrder, fillQty);
        await orderRepo.save([bidOrder, askOrder]);
      }

      // --- UI orderbook (Redis :levels + :levels:qty): subtract filled qty at each affected price level ---
      for (const u of limitUpdates) {
        await this.orderbookService.adjustLevel(
          u.pair,
          u.isBid,
          u.price,
          -u.qty,
        );
      }

      // Per-order book: remove from Redis ZSET when fully filled (both sides may have been on the book).
      if (askOrder && askOrder.status === 'COMPLETED') {
        await this.orderbookService.removeOrder(pair, false, askOrder.id);
      }
      if (bidOrder && bidOrder.status === 'COMPLETED') {
        await this.orderbookService.removeOrder(pair, true, bidOrder.id);
      }

      // Loop continues: same incoming order may get more fills from other resting orders, or exit when no liquidity / remaining = 0.
    }
  }
}
