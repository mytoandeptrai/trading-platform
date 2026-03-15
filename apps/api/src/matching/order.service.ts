import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { AccountEntity } from '../account/entities/account.entity';
import { BalanceService } from '../account/balance.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderEntity } from './entities/order.entity';
import { OrderHistoryEntity } from './entities/order-history.entity';
import { OrderbookService } from './orderbook.service';
import {
  BusinessException,
  AccountFrozenException,
} from '../common/exceptions/business.exception';
import { getPairConfig } from '../common/constants/pairs.constant';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OrderHistoryEntity)
    private readonly orderHistoryRepo: Repository<OrderHistoryEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
    private readonly balanceService: BalanceService,
    private readonly orderbookService: OrderbookService,
    private readonly dataSource: DataSource,
    @InjectQueue('order-matching')
    private readonly matchingQueue: Queue,
  ) {}

  async placeOrder(
    userId: number,
    dto: PlaceOrderDto,
  ): Promise<{ orderId: number }> {
    const pairCfg = getPairConfig(dto.pair);
    if (!pairCfg || !pairCfg.isTradingActive) {
      throw new BusinessException(
        'Pair not available for trading',
        'PAIR_NOT_ACTIVE',
      );
    }

    if (
      dto.amount < pairCfg.minOrderAmount ||
      dto.amount > pairCfg.maxOrderAmount
    ) {
      throw new BusinessException(
        'Invalid order amount',
        'INVALID_ORDER_AMOUNT',
        {
          min: pairCfg.minOrderAmount,
          max: pairCfg.maxOrderAmount,
        },
      );
    }

    if (dto.type === 'LIMIT') {
      if (!dto.price || dto.price <= 0) {
        throw new BusinessException(
          'Price is required for limit order',
          'PRICE_REQUIRED',
        );
      }
      const remainder = (dto.price / pairCfg.tickSize) % 1;
      if (remainder !== 0) {
        throw new BusinessException(
          'Invalid price precision for pair',
          'INVALID_TICK_SIZE',
          { tickSize: pairCfg.tickSize },
        );
      }
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const account = await qr.manager.findOne(AccountEntity, {
        where: { userId: String(userId) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!account) {
        throw new BusinessException('Account not found', 'ACCOUNT_NOT_FOUND');
      }
      if (account.tradingStatus === 'FROZEN') {
        throw new AccountFrozenException(Number(account.id));
      }

      const isBid = dto.side === 'BUY';
      const order = qr.manager.create(OrderEntity, {
        accountId: account.id,
        pairName: dto.pair,
        isBid,
        orderType: dto.type,
        price: dto.type === 'LIMIT' ? (dto.price?.toString() ?? null) : null,
        amount: dto.amount.toString(),
        filled: '0',
        remaining: dto.amount.toString(),
        status: 'PENDING',
      });
      const saved = await qr.manager.save(order);

      const orderIdStr = saved.id;

      if (dto.type === 'LIMIT') {
        if (isBid && dto.price) {
          const required = dto.amount * dto.price;
          await this.balanceService.lockCashForOrder(
            qr,
            account.id,
            pairCfg.quoteCurrency,
            required,
            orderIdStr,
          );
        } else {
          await this.balanceService.lockCoinForOrder(
            qr,
            account.id,
            pairCfg.baseCoin,
            dto.amount,
            orderIdStr,
          );
        }
      } else {
        // MARKET order: lock with worst-case assumption so we never run out during match.
        // BUY: lock cash = amount * (max price we might pay) * 1.2 buffer (slippage/fees).
        // SELL: lock coin = amount (no price needed).
        if (isBid) {
          const worstCasePrice = dto.price ?? pairCfg.maxPrice;
          const required = dto.amount * worstCasePrice * 1.2;
          await this.balanceService.lockCashForOrder(
            qr,
            account.id,
            pairCfg.quoteCurrency,
            required,
            orderIdStr,
          );
        } else {
          await this.balanceService.lockCoinForOrder(
            qr,
            account.id,
            pairCfg.baseCoin,
            dto.amount,
            orderIdStr,
          );
        }
      }

      await qr.commitTransaction();

      if (dto.type === 'LIMIT') {
        if (dto.price) {
          await this.orderbookService.adjustLevel(
            dto.pair,
            isBid,
            dto.price,
            dto.amount,
          );
        }
        await this.orderbookService.addOrder(
          dto.pair,
          isBid,
          dto.price ?? 0,
          orderIdStr,
        );
      }

      this.logger.log(
        `Order placed: id=${saved.id}, user=${userId}, pair=${dto.pair}, side=${dto.side}, type=${dto.type}`,
      );

      // Phase 4: Push matching job (priority: MARKET(1) > LIMIT(10) in BullMQ)
      await this.matchingQueue.add(
        'processOrder',
        { orderId: Number(saved.id) },
        {
          priority: dto.type === 'MARKET' ? 1 : 10,
        },
      );

      return { orderId: Number(saved.id) };
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  async getOrderById(userId: number, orderId: number): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({
      where: { id: String(orderId) },
    });
    if (!order) {
      throw new BusinessException('Order not found', 'ORDER_NOT_FOUND');
    }

    const account = await this.accountRepo.findOne({
      where: { id: order.accountId, userId: String(userId) },
    });
    if (!account) {
      throw new BusinessException('Order not found', 'ORDER_NOT_FOUND');
    }

    return order;
  }

  async listOrders(
    userId: number,
    status?: string,
    limit = 50,
    offset = 0,
  ): Promise<{
    orders: OrderEntity[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const account = await this.accountRepo.findOne({
      where: { userId: String(userId) },
    });
    if (!account) {
      throw new BusinessException('Account not found', 'ACCOUNT_NOT_FOUND');
    }

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.accountId = :aid', {
        aid: account.id,
      });
    if (status) {
      qb.andWhere('o.status = :status', { status });
    }
    qb.orderBy('o.placedAt', 'DESC').skip(offset).take(limit);

    const [orders, total] = await qb.getManyAndCount();

    return { orders, total, limit, offset };
  }

  async cancelOrder(userId: number, dto: CancelOrderDto): Promise<void> {
    const order = await this.orderRepo.findOne({
      where: { id: String(dto.orderId) },
    });
    if (!order) {
      throw new BusinessException('Order not found', 'ORDER_NOT_FOUND');
    }

    const account = await this.accountRepo.findOne({
      where: { id: order.accountId, userId: String(userId) },
    });
    if (!account) {
      throw new BusinessException('Order not found', 'ORDER_NOT_FOUND');
    }

    if (!['PENDING', 'PARTLY_FILLED'].includes(order.status)) {
      throw new BusinessException(
        'Order cannot be canceled in current status',
        'INVALID_ORDER_STATUS',
      );
    }

    if (order.orderType === 'LIMIT' && order.price) {
      const remaining = parseFloat(order.remaining);
      if (remaining > 0) {
        await this.orderbookService.adjustLevel(
          order.pairName,
          order.isBid,
          parseFloat(order.price),
          -remaining,
        );
      }
    }

    order.status = 'CANCELED';
    await this.orderRepo.save(order);

    await this.balanceService.unlockForOrder(order.id);
    await this.orderbookService.removeOrder(
      order.pairName,
      order.isBid,
      order.id,
    );

    const history = this.orderHistoryRepo.create({
      orderId: order.id,
      accountId: order.accountId,
      pairName: order.pairName,
      isBid: order.isBid,
      orderType: order.orderType,
      price: order.price,
      amount: order.amount,
      filled: order.filled,
      status: order.status,
      placedAt: order.placedAt,
    });
    await this.orderHistoryRepo.save(history);

    this.logger.log(
      `Order canceled: id=${order.id}, user=${userId}, pair=${order.pairName}`,
    );
  }
}
