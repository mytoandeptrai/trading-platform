import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccountEntity } from './account.entity';

@Entity({ name: 'transaction' })
export class TransactionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId: string;

  @Column({ name: 'transaction_type', type: 'varchar', length: 50 })
  transactionType: string;

  @Column({ name: 'asset_name', type: 'varchar', length: 50 })
  assetName: string;

  @Column({
    name: 'amount',
    type: 'numeric',
    precision: 20,
    scale: 8,
  })
  amount: string;

  @Column({
    name: 'balance_before',
    type: 'numeric',
    precision: 20,
    scale: 8,
  })
  balanceBefore: string;

  @Column({
    name: 'balance_after',
    type: 'numeric',
    precision: 20,
    scale: 8,
  })
  balanceAfter: string;

  @Column({ name: 'reference_id', type: 'bigint', nullable: true })
  referenceId: string | null;

  @Column({
    name: 'reference_type',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  referenceType: string | null;

  @Column({
    name: 'op_result',
    type: 'varchar',
    length: 50,
    default: 'SUCCESS',
  })
  opResult: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @ManyToOne(() => AccountEntity, (account) => account.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity;
}
