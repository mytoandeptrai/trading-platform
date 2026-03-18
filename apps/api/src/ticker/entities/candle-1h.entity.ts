import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 1-hour candle entity.
 * Stores OHLCV data for 1-hour timeframe.
 */
@Entity('candle_1h')
@Index(['pairName', 'openTime'], { unique: true })
@Index(['pairName', 'isClosed', 'openTime'])
export class Candle1hEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pair_name', type: 'varchar', length: 50 })
  pairName: string;

  @Column({ name: 'open_time', type: 'timestamp' })
  openTime: Date;

  @Column({ name: 'close_time', type: 'timestamp' })
  closeTime: Date;

  @Column({ type: 'numeric', precision: 20, scale: 8 })
  open: string;

  @Column({ type: 'numeric', precision: 20, scale: 8 })
  high: string;

  @Column({ type: 'numeric', precision: 20, scale: 8 })
  low: string;

  @Column({ type: 'numeric', precision: 20, scale: 8 })
  close: string;

  @Column({ type: 'numeric', precision: 20, scale: 8, default: '0' })
  volume: string;

  @Column({ name: 'trades_count', type: 'int', default: 0 })
  tradesCount: number;

  @Column({ name: 'is_closed', type: 'boolean', default: false })
  isClosed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
