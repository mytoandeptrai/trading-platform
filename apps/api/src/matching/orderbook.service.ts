import { Injectable } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';
import { getPairConfig } from '../common/constants/pairs.constant';
import { BusinessException } from '../common/exceptions/business.exception';

export type OrderbookLevel = {
  price: number;
  quantity: number;
};

@Injectable()
export class OrderbookService {
  constructor(private readonly redisService: RedisService) {}

  private get redis() {
    return this.redisService.getClient();
  }

  private getKey(pair: string, isBid: boolean): string {
    return `orderbook:${pair}:${isBid ? 'bid' : 'ask'}`;
  }

  private getLevelKey(pair: string, isBid: boolean): string {
    return `orderbook:${pair}:${isBid ? 'bid' : 'ask'}:levels`;
  }

  private getLevelQtyKey(pair: string, isBid: boolean): string {
    return `orderbook:${pair}:${isBid ? 'bid' : 'ask'}:levels:qty`;
  }

  async addOrder(pair: string, isBid: boolean, price: number, orderId: string) {
    const key = this.getKey(pair, isBid);
    const score = isBid ? -price : price;
    await this.redis.zadd(key, score.toString(), orderId);
  }

  async removeOrder(pair: string, isBid: boolean, orderId: string) {
    const key = this.getKey(pair, isBid);
    await this.redis.zrem(key, orderId);
  }

  async getBestBid(
    pair: string,
  ): Promise<{ orderId: string; price: number } | null> {
    const key = this.getKey(pair, true);
    const res = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
    if (res.length < 2) return null;
    const [orderId, scoreStr] = res;
    const price = -parseFloat(scoreStr);
    return { orderId, price };
  }

  async getBestAsk(
    pair: string,
  ): Promise<{ orderId: string; price: number } | null> {
    const key = this.getKey(pair, false);
    const res = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
    if (res.length < 2) return null;
    const [orderId, scoreStr] = res;
    const price = parseFloat(scoreStr);
    return { orderId, price };
  }

  async getOrderBookDepth(
    pair: string,
    levels: number,
  ): Promise<{
    bids: { orderId: string; price: number }[];
    asks: { orderId: string; price: number }[];
  }> {
    const bidsKey = this.getKey(pair, true);
    const asksKey = this.getKey(pair, false);

    const [bidsRaw, asksRaw] = await Promise.all([
      this.redis.zrange(bidsKey, 0, levels - 1, 'WITHSCORES'),
      this.redis.zrange(asksKey, 0, levels - 1, 'WITHSCORES'),
    ]);

    const bids: { orderId: string; price: number }[] = [];
    for (let i = 0; i < bidsRaw.length; i += 2) {
      const orderId = bidsRaw[i];
      const scoreStr = bidsRaw[i + 1];
      bids.push({ orderId, price: -parseFloat(scoreStr) });
    }

    const asks: { orderId: string; price: number }[] = [];
    for (let i = 0; i < asksRaw.length; i += 2) {
      const orderId = asksRaw[i];
      const scoreStr = asksRaw[i + 1];
      asks.push({ orderId, price: parseFloat(scoreStr) });
    }

    return { bids, asks };
  }

  async getAllBids(
    pair: string,
  ): Promise<{ orderId: string; price: number }[]> {
    const key = this.getKey(pair, true);
    const res = await this.redis.zrange(key, 0, -1, 'WITHSCORES');
    const bids: { orderId: string; price: number }[] = [];
    for (let i = 0; i < res.length; i += 2) {
      const orderId = res[i];
      const scoreStr = res[i + 1];
      bids.push({ orderId, price: -parseFloat(scoreStr) });
    }
    return bids;
  }

  async getAllAsks(
    pair: string,
  ): Promise<{ orderId: string; price: number }[]> {
    const key = this.getKey(pair, false);
    const res = await this.redis.zrange(key, 0, -1, 'WITHSCORES');
    const asks: { orderId: string; price: number }[] = [];
    for (let i = 0; i < res.length; i += 2) {
      const orderId = res[i];
      const scoreStr = res[i + 1];
      asks.push({ orderId, price: parseFloat(scoreStr) });
    }
    return asks;
  }

  async getSnapshot(
    pair: string,
    levels?: number,
  ): Promise<{
    pair: string;
    bids: OrderbookLevel[];
    asks: OrderbookLevel[];
  }> {
    const cfg = getPairConfig(pair);
    if (!cfg) {
      throw new BusinessException('Pair not found', 'PAIR_NOT_FOUND');
    }

    const bidLevelKey = this.getLevelKey(pair, true);
    const askLevelKey = this.getLevelKey(pair, false);
    const bidQtyKey = this.getLevelQtyKey(pair, true);
    const askQtyKey = this.getLevelQtyKey(pair, false);

    const end = levels && levels > 0 ? levels - 1 : -1;

    const [bidsRaw, asksRaw] = await Promise.all([
      // bids: highest price first
      this.redis.zrevrange(bidLevelKey, 0, end, 'WITHSCORES'),
      // asks: lowest price first
      this.redis.zrange(askLevelKey, 0, end, 'WITHSCORES'),
    ]);

    const bids: OrderbookLevel[] = [];
    for (let i = 0; i < bidsRaw.length; i += 2) {
      const priceStr = bidsRaw[i];
      const qtyStr = await this.redis.hget(bidQtyKey, priceStr);
      const quantity = qtyStr ? parseFloat(qtyStr) : 0;
      if (quantity <= 0) continue;
      bids.push({ price: parseFloat(priceStr), quantity });
    }

    const asks: OrderbookLevel[] = [];
    for (let i = 0; i < asksRaw.length; i += 2) {
      const priceStr = asksRaw[i];
      const qtyStr = await this.redis.hget(askQtyKey, priceStr);
      const quantity = qtyStr ? parseFloat(qtyStr) : 0;
      if (quantity <= 0) continue;
      asks.push({ price: parseFloat(priceStr), quantity });
    }

    return { pair, bids, asks };
  }

  async adjustLevel(
    pair: string,
    isBid: boolean,
    price: number,
    deltaQuantity: number,
  ): Promise<void> {
    if (!deltaQuantity) return;

    const levelKey = this.getLevelKey(pair, isBid);
    const qtyKey = this.getLevelQtyKey(pair, isBid);
    const priceStr = price.toString();

    const currentStr = await this.redis.hget(qtyKey, priceStr);
    const current = currentStr ? parseFloat(currentStr) : 0;
    const next = current + deltaQuantity;

    if (next <= 0) {
      await Promise.all([
        this.redis.hdel(qtyKey, priceStr),
        this.redis.zrem(levelKey, priceStr),
      ]);
    } else {
      await Promise.all([
        this.redis.hset(qtyKey, priceStr, next.toString()),
        this.redis.zadd(levelKey, price, priceStr),
      ]);
    }
  }
}
