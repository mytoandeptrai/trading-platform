import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountCashEntity } from './account-cash.entity';
import { AccountCoinEntity } from './account-coin.entity';
import { LockRecordEntity } from './lock-record.entity';
import { TransactionEntity } from './transaction.entity';

@Entity({ name: 'account' })
export class AccountEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint', unique: true })
  userId: string;

  @Column({
    name: 'account_type',
    type: 'varchar',
    length: 50,
    default: 'INDIVIDUAL',
  })
  accountType: string;

  @Column({
    name: 'trading_status',
    type: 'varchar',
    length: 50,
    default: 'ACTIVE',
  })
  tradingStatus: string;

  @Column({ name: 'kyc_level', type: 'int', default: 1 })
  kycLevel: number;

  @Column({
    name: 'total_balance',
    type: 'numeric',
    precision: 20,
    scale: 8,
    default: 0,
  })
  totalBalance: string;

  @Column({
    name: 'available_balance',
    type: 'numeric',
    precision: 20,
    scale: 8,
    default: 0,
  })
  availableBalance: string;

  @Column({
    name: 'locked_balance',
    type: 'numeric',
    precision: 20,
    scale: 8,
    default: 0,
  })
  lockedBalance: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @OneToOne(() => AccountCashEntity, (cash) => cash.account)
  cashBalance: AccountCashEntity;

  @OneToMany(() => AccountCoinEntity, (coin) => coin.account)
  coinBalances: AccountCoinEntity[];

  @OneToMany(() => LockRecordEntity, (lock) => lock.account)
  locks: LockRecordEntity[];

  @OneToMany(() => TransactionEntity, (tx) => tx.account)
  transactions: TransactionEntity[];
}
