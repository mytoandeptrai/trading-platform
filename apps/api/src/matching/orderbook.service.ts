import { Injectable } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';

@Injectable()
export class OrderbookService {
  constructor(private readonly redisService: RedisService) {}

  private get redis() {
    return this.redisService.getClient();
  }

  private getKey(pair: string, isBid: boolean): string {
    return `orderbook:${pair}:${isBid ? 'bid' : 'ask'}`;
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

  async getBestBid(pair: string): Promise<{ orderId: string; price: number } | null> {
    const key = this.getKey(pair, true);
    const res = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
    if (res.length < 2) return null;
    const [orderId, scoreStr] = res;
    const price = -parseFloat(scoreStr);
    return { orderId, price };
  }

  async getBestAsk(pair: string): Promise<{ orderId: string; price: number } | null> {
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
}

