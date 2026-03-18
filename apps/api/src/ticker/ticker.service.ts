import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { RedisService } from '../common/redis/redis.service';
import { RedisSubscriberService } from '../events/redis-subscriber.service';
import { OrderbookService } from '../matching/orderbook.service';
import { TickerEntity } from './entities/ticker.entity';
import { TradeEntity } from '../matching/entities/trade.entity';

interface Trade24hStats {
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  tradeCount: number;
}

/**
 * TickerService: Maintains real-time 24h ticker statistics.
 * Subscribes to 'trade.executed' events and updates ticker data.
 * Cron job every 5s updates bid/ask from orderbook snapshots.
 */
@Injectable()
export class TickerService implements OnModuleInit {
  private readonly logger = new Logger(TickerService.name);
  private readonly TICKER_CACHE_TTL = 60; // 60 seconds
  private readonly tickerRepo: Repository<TickerEntity>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly redisSubscriber: RedisSubscriberService,
    private readonly redisService: RedisService,
    private readonly orderbookService: OrderbookService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.tickerRepo = this.dataSource.getRepository(TickerEntity);
  }

  async onModuleInit(): Promise<void> {
    await this.redisSubscriber.subscribe(
      'trade.executed',
      this.handleTradeExecuted.bind(this),
    );
    this.logger.log('TickerService subscribed to trade.executed events');
  }

  /**
   * Handle trade.executed event: update ticker with latest trade and 24h stats.
   */
  private async handleTradeExecuted(data: any): Promise<void> {
    const { pair, price, quantity, tradeId } = data;
    if (!pair || !price || !quantity) {
      return;
    }

    try {
      const priceNum = parseFloat(price);
      const quantityNum = parseFloat(quantity);
      const stats = await this.calculate24hStats(pair);

      const priceChange = priceNum - stats.openPrice;
      const priceChangePercent =
        stats.openPrice > 0 ? (priceChange / stats.openPrice) * 100 : 0;

      // UPSERT ticker
      await this.tickerRepo.upsert(
        {
          pairName: pair,
          lastPrice: priceNum.toString(),
          openPrice: stats.openPrice.toString(),
          highPrice: stats.highPrice.toString(),
          lowPrice: stats.lowPrice.toString(),
          priceChange: priceChange.toString(),
          priceChangePercent: priceChangePercent.toFixed(4),
          volume: stats.volume.toString(),
          quoteVolume: stats.quoteVolume.toString(),
          tradeCount: stats.tradeCount,
        },
        ['pairName'],
      );

      // Invalidate Redis cache
      await this.invalidateCache(pair);

      // Get updated ticker for WebSocket broadcast
      const updatedTicker = await this.tickerRepo.findOne({
        where: { pairName: pair },
      });

      if (updatedTicker) {
        // Emit ticker.update event for WebSocket broadcast
        this.eventEmitter.emit('ticker.update', {
          pairName: updatedTicker.pairName,
          lastPrice: updatedTicker.lastPrice,
          openPrice: updatedTicker.openPrice,
          highPrice: updatedTicker.highPrice,
          lowPrice: updatedTicker.lowPrice,
          volume: updatedTicker.volume,
          quoteVolume: updatedTicker.quoteVolume,
          priceChange: updatedTicker.priceChange,
          priceChangePercent: updatedTicker.priceChangePercent,
          bidPrice: updatedTicker.bidPrice,
          bidQty: updatedTicker.bidQty,
          askPrice: updatedTicker.askPrice,
          askQty: updatedTicker.askQty,
          tradeCount: updatedTicker.tradeCount,
          updatedAt: updatedTicker.updatedAt,
        });
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to update ticker for trade=${tradeId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Calculate 24h statistics from trade history.
   * Uses TypeORM to query trades in the last 24 hours.
   */
  private async calculate24hStats(pair: string): Promise<Trade24hStats> {
    const tradeRepo = this.dataSource.getRepository(TradeEntity);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trades = await tradeRepo
      .createQueryBuilder('trade')
      .where('trade.pair_name = :pair', { pair })
      .andWhere('trade.executed_at >= :cutoff', { cutoff })
      .orderBy('trade.executed_at', 'ASC')
      .getMany();

    if (trades.length === 0) {
      return {
        openPrice: 0,
        highPrice: 0,
        lowPrice: 0,
        volume: 0,
        quoteVolume: 0,
        tradeCount: 0,
      };
    }

    const openPrice = parseFloat(trades[0].price);
    let highPrice = openPrice;
    let lowPrice = openPrice;
    let volume = 0;
    let quoteVolume = 0;

    for (const trade of trades) {
      const price = parseFloat(trade.price);
      const qty = parseFloat(trade.quantity);

      highPrice = Math.max(highPrice, price);
      lowPrice = Math.min(lowPrice, price);
      volume += qty;
      quoteVolume += price * qty;
    }

    return {
      openPrice,
      highPrice,
      lowPrice,
      volume,
      quoteVolume,
      tradeCount: trades.length,
    };
  }

  /**
   * Cron job: update ticker bid/ask from orderbook snapshots every 5 seconds.
   * Matches frontend polling frequency.
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async updateOrderbookData(): Promise<void> {
    try {
      // Get all active tickers (pairs with recent trades)
      const tickers = await this.tickerRepo.find();

      for (const ticker of tickers) {
        const pair = ticker.pairName;

        // Get orderbook snapshot (best bid/ask with aggregated quantities)
        const snapshot = await this.orderbookService.getSnapshot(pair, 1);

        if (snapshot.bids.length > 0 || snapshot.asks.length > 0) {
          const bidPrice = snapshot.bids[0]?.price ?? null;
          const bidQty = snapshot.bids[0]?.quantity ?? null;
          const askPrice = snapshot.asks[0]?.price ?? null;
          const askQty = snapshot.asks[0]?.quantity ?? null;

          await this.tickerRepo.update(
            { pairName: pair },
            {
              bidPrice: bidPrice?.toString() ?? null,
              bidQty: bidQty?.toString() ?? null,
              askPrice: askPrice?.toString() ?? null,
              askQty: askQty?.toString() ?? null,
            },
          );

          // Invalidate cache
          await this.invalidateCache(pair);

          // Emit orderbook.update event for WebSocket broadcast
          this.eventEmitter.emit('orderbook.update', {
            pairName: pair,
            bids: snapshot.bids.map((b) => ({
              price: b.price.toString(),
              quantity: b.quantity.toString(),
            })),
            asks: snapshot.asks.map((a) => ({
              price: a.price.toString(),
              quantity: a.quantity.toString(),
            })),
            timestamp: new Date(),
          });
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to update orderbook data: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get ticker for a specific pair (with Redis cache).
   */
  async getTicker(pair: string): Promise<TickerEntity | null> {
    const cacheKey = this.getCacheKey(pair);
    const redis = this.redisService.getClient();

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss: fetch from DB
    const ticker = await this.tickerRepo.findOne({ where: { pairName: pair } });

    if (ticker) {
      // Store in cache
      await redis.setex(
        cacheKey,
        this.TICKER_CACHE_TTL,
        JSON.stringify(ticker),
      );
    }

    return ticker;
  }

  /**
   * Get all tickers (with Redis cache).
   */
  async getAllTickers(): Promise<TickerEntity[]> {
    const cacheKey = 'ticker:all';
    const redis = this.redisService.getClient();

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Cache miss: fetch from DB
    const tickers = await this.tickerRepo.find();

    if (tickers.length > 0) {
      // Store in cache
      await redis.setex(cacheKey, this.TICKER_CACHE_TTL, JSON.stringify(tickers));
    }

    return tickers;
  }

  /**
   * Invalidate Redis cache for a specific pair.
   */
  private async invalidateCache(pair: string): Promise<void> {
    const redis = this.redisService.getClient();
    await Promise.all([
      redis.del(this.getCacheKey(pair)),
      redis.del('ticker:all'),
    ]);
  }

  private getCacheKey(pair: string): string {
    return `ticker:${pair}`;
  }
}
