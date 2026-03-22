import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Ticker entity with Binance-like schema.
 * Stores 24h trading statistics for each trading pair.
 */
@Entity('ticker')
@Index(['pairName'], { unique: true })
export class TickerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pair_name', type: 'varchar', length: 50, unique: true })
  pairName: string;

  // Current price
  @Column({ name: 'last_price', type: 'numeric', precision: 20, scale: 8 })
  lastPrice: string;

  // 24h statistics
  @Column({ name: 'open_price', type: 'numeric', precision: 20, scale: 8, default: '0' })
  openPrice: string; // First trade price in 24h

  @Column({ name: 'high_price', type: 'numeric', precision: 20, scale: 8, default: '0' })
  highPrice: string; // Highest price in 24h

  @Column({ name: 'low_price', type: 'numeric', precision: 20, scale: 8, default: '0' })
  lowPrice: string; // Lowest price in 24h

  @Column({ name: 'price_change', type: 'numeric', precision: 20, scale: 8, default: '0' })
  priceChange: string; // Absolute price change (lastPrice - openPrice)

  @Column({ name: 'price_change_percent', type: 'numeric', precision: 10, scale: 4, default: '0' })
  priceChangePercent: string; // Percentage change

  // Volume
  @Column({ type: 'numeric', precision: 20, scale: 8, default: '0' })
  volume: string; // Total base asset volume (e.g., BTC in BTC/USD)

  @Column({ name: 'quote_volume', type: 'numeric', precision: 20, scale: 8, default: '0' })
  quoteVolume: string; // Total quote asset volume (e.g., USD in BTC/USD)

  // Orderbook best bid/ask (updated by cron job)
  @Column({ name: 'bid_price', type: 'numeric', precision: 20, scale: 8, nullable: true })
  bidPrice: string | null;

  @Column({ name: 'bid_qty', type: 'numeric', precision: 20, scale: 8, nullable: true })
  bidQty: string | null; // Aggregated quantity at best bid price level

  @Column({ name: 'ask_price', type: 'numeric', precision: 20, scale: 8, nullable: true })
  askPrice: string | null;

  @Column({ name: 'ask_qty', type: 'numeric', precision: 20, scale: 8, nullable: true })
  askQty: string | null; // Aggregated quantity at best ask price level

  // Trade count
  @Column({ name: 'trade_count', type: 'int', default: 0 })
  tradeCount: number; // Number of trades in 24h

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
