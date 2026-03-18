import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource, LessThan, Repository } from 'typeorm';
import { RedisSubscriberService } from '../events/redis-subscriber.service';
import { Candle1mEntity } from './entities/candle-1m.entity';
import { Candle5mEntity } from './entities/candle-5m.entity';
import { Candle1hEntity } from './entities/candle-1h.entity';
import { Candle1dEntity } from './entities/candle-1d.entity';
import { CandleTimeframe } from './dto/candle-query.dto';

type CandleEntity =
  | Candle1mEntity
  | Candle5mEntity
  | Candle1hEntity
  | Candle1dEntity;

/**
 * CandleService: UPSERT candles on trade execution.
 * Subscribes to 'trade.executed' events and updates 4 candle tables.
 * Implements lazy closing strategy for candles.
 */
@Injectable()
export class CandleService implements OnModuleInit {
  private readonly logger = new Logger(CandleService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly redisSubscriber: RedisSubscriberService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.redisSubscriber.subscribe(
      'trade.executed',
      this.handleTradeExecuted.bind(this),
    );
    this.logger.log('CandleService subscribed to trade.executed events');
  }

  /**
   * Handle trade.executed event: update all 4 candle timeframes.
   */
  private async handleTradeExecuted(data: any): Promise<void> {
    const { pair, price, quantity, tradeId } = data;
    if (!pair || !price || !quantity) {
      return;
    }

    const executedAt = new Date();
    const priceNum = parseFloat(price);
    const quantityNum = parseFloat(quantity);

    try {
      await Promise.all([
        this.upsertCandle(pair, priceNum, quantityNum, executedAt, '1m'),
        this.upsertCandle(pair, priceNum, quantityNum, executedAt, '5m'),
        this.upsertCandle(pair, priceNum, quantityNum, executedAt, '1h'),
        this.upsertCandle(pair, priceNum, quantityNum, executedAt, '1d'),
      ]);
    } catch (error: any) {
      this.logger.error(
        `Failed to upsert candles for trade=${tradeId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * UPSERT a candle for a specific timeframe.
   * Implements lazy closing: closes previous candles when a new period starts.
   */
  private async upsertCandle(
    pair: string,
    price: number,
    quantity: number,
    executedAt: Date,
    timeframe: '1m' | '5m' | '1h' | '1d',
  ): Promise<void> {
    const repo = this.getRepository(timeframe);
    const { openTime, closeTime } = this.calculateCandleTimes(
      executedAt,
      timeframe,
    );

    // 1. Lazy close: mark all previous candles for this pair as closed
    await repo.update(
      {
        pairName: pair,
        openTime: LessThan(openTime),
        isClosed: false,
      } as any,
      { isClosed: true } as any,
    );

    // 2. Try to find existing candle for current period
    const existing = await repo.findOne({
      where: { pairName: pair, openTime } as any,
    });

    if (!existing) {
      // First trade in this period: create new candle
      const newCandle = repo.create({
        pairName: pair,
        openTime,
        closeTime,
        open: price.toString(),
        high: price.toString(),
        low: price.toString(),
        close: price.toString(),
        volume: quantity.toString(),
        tradesCount: 1,
        isClosed: false,
      } as any);

      await repo.save(newCandle);
    } else {
      // Update existing candle: high/low/close/volume/tradesCount
      await repo
        .createQueryBuilder()
        .update()
        .set({
          high: () => `GREATEST(high, ${price})`,
          low: () => `LEAST(low, ${price})`,
          close: price.toString(),
          volume: () => `volume + ${quantity}`,
          tradesCount: () => 'trades_count + 1',
        } as any)
        .where('pair_name = :pair AND open_time = :openTime', {
          pair,
          openTime,
        })
        .execute();
    }
  }

  /**
   * Calculate openTime and closeTime for a candle based on timeframe.
   * Uses time bucketing to align candles to their respective intervals.
   */
  private calculateCandleTimes(
    date: Date,
    timeframe: '1m' | '5m' | '1h' | '1d',
  ): { openTime: Date; closeTime: Date } {
    const d = new Date(date);

    switch (timeframe) {
      case '1m': {
        // Bucket: align to minute (seconds/ms = 0)
        const openTime = new Date(d.setSeconds(0, 0));
        const closeTime = new Date(openTime.getTime() + 60 * 1000 - 1);
        return { openTime, closeTime };
      }

      case '5m': {
        // Bucket: align to 5-minute intervals (0, 5, 10, 15, ...)
        const minute = d.getMinutes();
        const bucket = Math.floor(minute / 5) * 5;
        const openTime = new Date(d.setMinutes(bucket, 0, 0));
        const closeTime = new Date(openTime.getTime() + 5 * 60 * 1000 - 1);
        return { openTime, closeTime };
      }

      case '1h': {
        // Bucket: align to hour (minutes/seconds/ms = 0)
        const openTime = new Date(d.setMinutes(0, 0, 0));
        const closeTime = new Date(openTime.getTime() + 60 * 60 * 1000 - 1);
        return { openTime, closeTime };
      }

      case '1d': {
        // Bucket: align to day (hours/minutes/seconds/ms = 0, UTC)
        const openTime = new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
        );
        const closeTime = new Date(
          openTime.getTime() + 24 * 60 * 60 * 1000 - 1,
        );
        return { openTime, closeTime };
      }

      default:
        throw new Error(`Unsupported timeframe: ${timeframe}`);
    }
  }

  /**
   * Get repository for a specific candle timeframe.
   */
  private getRepository(
    timeframe: '1m' | '5m' | '1h' | '1d',
  ): Repository<CandleEntity> {
    switch (timeframe) {
      case '1m':
        return this.dataSource.getRepository(Candle1mEntity);
      case '5m':
        return this.dataSource.getRepository(Candle5mEntity);
      case '1h':
        return this.dataSource.getRepository(Candle1hEntity);
      case '1d':
        return this.dataSource.getRepository(Candle1dEntity);
      default:
        throw new Error(`Invalid timeframe: ${timeframe}`);
    }
  }

  /**
   * Get candles for a specific pair and timeframe.
   * Used by TickerController to expose API endpoints.
   */
  async getCandles(
    pair: string,
    timeframe: CandleTimeframe,
    limit: number = 100,
  ): Promise<CandleEntity[]> {
    const repo = this.getRepository(
      timeframe as '1m' | '5m' | '1h' | '1d',
    );

    return repo.find({
      where: { pairName: pair } as any,
      order: { openTime: 'DESC' } as any,
      take: limit,
    });
  }
}
