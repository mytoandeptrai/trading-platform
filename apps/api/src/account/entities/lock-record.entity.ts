import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccountEntity } from './account.entity';

@Entity({ name: 'lock_record' })
export class LockRecordEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId: string;

  @Column({ name: 'order_id', type: 'bigint', nullable: true })
  orderId: string | null;

  @Column({ name: 'lock_type', type: 'varchar', length: 50 })
  lockType: string;

  @Column({ name: 'asset_name', type: 'varchar', length: 50 })
  assetName: string;

  @Column({
    name: 'lock_amount',
    type: 'numeric',
    precision: 20,
    scale: 8,
  })
  lockAmount: string;

  @Column({ name: 'status', type: 'varchar', length: 50, default: 'LOCKED' })
  status: string;

  @CreateDateColumn({
    name: 'locked_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lockedAt: Date;

  @Column({ name: 'unlocked_at', type: 'timestamp', nullable: true })
  unlockedAt: Date | null;

  @ManyToOne(() => AccountEntity, (account) => account.locks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity;
}
