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
    this.logger.error(
      `Matching job failed: jobId=${job.id}, orderId=${job.data?.orderId}, error=${error.message}`,
      error.stack ?? '',
    );
  }

  async process(job: Job<ProcessOrderJob>): Promise<void> {
    const started = Date.now();
    const orderId = job.data?.orderId;
    if (!orderId) return;

    const order = await this.dataSource.getRepository(OrderEntity).findOne({
      where: { id: String(orderId) },
    });
    if (!order) return;

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

  private async matchLoop(orderId: string): Promise<void> {
    // Reload every iteration to keep remaining/status accurate.
    while (true) {
      const order = await this.dataSource.getRepository(OrderEntity).findOne({
        where: { id: orderId },
      });
      if (!order) return;
      if (!['PENDING', 'PARTLY_FILLED'].includes(order.status)) return;

      const remaining = parseFloat(order.remaining);
      if (remaining <= 0) {
        if (order.status !== 'COMPLETED') {
          order.status = 'COMPLETED';
          order.remaining = '0';
          await this.dataSource.getRepository(OrderEntity).save(order);
        }
        return;
      }

      const pair = order.pairName;
      const isBid = order.isBid;

      const bestOpp = isBid
        ? await this.orderbookService.getBestAsk(pair)
        : await this.orderbookService.getBestBid(pair);
      if (!bestOpp) {
        // No liquidity: MARKET gets cancelled/partly-filled; LIMIT stays resting.
        if (order.orderType === 'MARKET') {
          order.status =
            parseFloat(order.filled) > 0 ? 'PARTLY_FILLED' : 'CANCELED';
          await this.dataSource.getRepository(OrderEntity).save(order);
        }
        return;
      }

      const oppOrder = await this.dataSource
        .getRepository(OrderEntity)
        .findOne({
          where: { id: bestOpp.orderId },
        });
      if (!oppOrder) {
        // Book had stale id - remove and continue
        await this.orderbookService.removeOrder(pair, !isBid, bestOpp.orderId);
        continue;
      }
      if (!['PENDING', 'PARTLY_FILLED'].includes(oppOrder.status)) {
        await this.orderbookService.removeOrder(pair, !isBid, oppOrder.id);
        continue;
      }

      // Price compatibility for LIMIT orders
      const oppPrice = bestOpp.price;
      if (order.orderType === 'LIMIT') {
        const limitPrice = parseFloat(order.price ?? '0');
        if (isBid && oppPrice > limitPrice) return;
        if (!isBid && oppPrice < limitPrice) return;
      }

      const orderRem = parseFloat(order.remaining);
      const oppRem = parseFloat(oppOrder.remaining);
      const matchQty = Math.min(orderRem, oppRem);
      if (matchQty <= 0) {
        return;
      }

      // Create trade + update both orders atomically
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      let tradeId: string | null = null;

      try {
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

        const lockedOrderRem = parseFloat(lockedOrder.remaining);
        const lockedOppRem = parseFloat(lockedOpp.remaining);
        const qty = Math.min(matchQty, lockedOrderRem, lockedOppRem);
        if (qty <= 0) {
          await qr.rollbackTransaction();
          continue;
        }

        const price = oppPrice; // maker price
        const value = price * qty;

        const bid = isBid ? lockedOrder : lockedOpp;
        const ask = isBid ? lockedOpp : lockedOrder;

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

        // Update orders filled/remaining/status (settlement will consume locks)
        const applyFill = (o: OrderEntity, fillQty: number) => {
          const filled = parseFloat(o.filled) + fillQty;
          const remaining2 = Math.max(parseFloat(o.amount) - filled, 0);
          o.filled = filled.toString();
          o.remaining = remaining2.toString();
          o.status = remaining2 <= 0 ? 'COMPLETED' : 'PARTLY_FILLED';
        };
        applyFill(lockedOrder, qty);
        applyFill(lockedOpp, qty);

        await qr.manager.save([lockedOrder, lockedOpp]);

        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }

      if (!tradeId) return;

      // Settle trade (SERIALIZABLE + idempotent)
      await this.settlementService.settleTrade(tradeId);

      // Remove completed opposing LIMIT order from book
      const updatedOpp = await this.dataSource
        .getRepository(OrderEntity)
        .findOne({
          where: { id: oppOrder.id },
        });
      if (updatedOpp && updatedOpp.status === 'COMPLETED') {
        await this.orderbookService.removeOrder(pair, !isBid, updatedOpp.id);
      }

      // MARKET order is not resting; if filled partially and now no liquidity => cancel remainder handled above next loop.
    }
  }
}
