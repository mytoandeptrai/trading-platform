import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 1-minute candle entity.
 * Stores OHLCV data for 1-minute timeframe.
 */
@Entity('candle_1m')
@Index(['pairName', 'openTime'], { unique: true })
@Index(['pairName', 'isClosed', 'openTime'])
export class Candle1mEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pair_name', type: 'varchar', length: 50 })
  pairName: string;

  @Column({ name: 'open_time', type: 'timestamp' })
  openTime: Date;

  @Column({ name: 'close_time', type: 'timestamp' })
  closeTime: Date;

  @Column({ type: 'numeric', precision: 20, scale: 8 })
  open: string; // First trade price in period (never changes)

  @Column({ type: 'numeric', precision: 20, scale: 8 })
  high: string; // Highest price in period

  @Column({ type: 'numeric', precision: 20, scale: 8 })
  low: string; // Lowest price in period

  @Column({ type: 'numeric', precision: 20, scale: 8 })
  close: string; // Last trade price in period (always updates)

  @Column({ type: 'numeric', precision: 20, scale: 8, default: '0' })
  volume: string; // Total volume in period

  @Column({ name: 'trades_count', type: 'int', default: 0 })
  tradesCount: number; // Number of trades in period

  @Column({ name: 'is_closed', type: 'boolean', default: false })
  isClosed: boolean; // Lazy closing: marked true when new period starts

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
