import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountEntity } from './account.entity';

@Entity({ name: 'account_coin' })
export class AccountCoinEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId: string;

  @Column({ name: 'coin_name', type: 'varchar', length: 50 })
  coinName: string;

  @Column({
    name: 'available',
    type: 'numeric',
    precision: 20,
    scale: 8,
    default: 0,
  })
  available: string;

  @Column({
    name: 'locked',
    type: 'numeric',
    precision: 20,
    scale: 8,
    default: 0,
  })
  locked: string;

  @Column({
    name: 'frozen',
    type: 'numeric',
    precision: 20,
    scale: 8,
    default: 0,
  })
  frozen: string;

  @Column({
    name: 'total',
    type: 'numeric',
    precision: 20,
    scale: 8,
    default: 0,
  })
  total: string;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToOne(() => AccountEntity, (account) => account.coinBalances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity;
}

