import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountEntity } from './account.entity';

@Entity({ name: 'account_cash' })
export class AccountCashEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'account_id', type: 'bigint', unique: true })
  accountId: string;

  @Column({
    name: 'currency_name',
    type: 'varchar',
    length: 50,
    default: 'USD',
  })
  currencyName: string;

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

  @OneToOne(() => AccountEntity, (account) => account.cashBalance, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity;
}
