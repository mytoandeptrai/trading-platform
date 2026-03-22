import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('trading_pair')
export class TradingPair {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ name: 'base_coin', type: 'varchar', length: 20 })
  baseCoin: string;

  @Column({ name: 'quote_currency', type: 'varchar', length: 20 })
  quoteCurrency: string;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 20, scale: 8 })
  minOrderAmount: string;

  @Column({ name: 'max_order_amount', type: 'decimal', precision: 20, scale: 8 })
  maxOrderAmount: string;

  @Column({ name: 'tick_size', type: 'decimal', precision: 20, scale: 8 })
  tickSize: string;

  @Column({ name: 'max_price', type: 'decimal', precision: 20, scale: 8 })
  maxPrice: string;

  @Column({ name: 'min_price', type: 'decimal', precision: 20, scale: 8 })
  minPrice: string;

  @Column({ name: 'taker_fee_rate', type: 'decimal', precision: 10, scale: 6, default: 0.001 })
  takerFeeRate: string;

  @Column({ name: 'maker_fee_rate', type: 'decimal', precision: 10, scale: 6, default: 0.0005 })
  makerFeeRate: string;

  @Column({ name: 'is_trading_active', type: 'boolean', default: true })
  isTradingActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
