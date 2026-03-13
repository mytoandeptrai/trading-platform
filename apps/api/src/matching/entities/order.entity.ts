import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccountEntity } from '../../account/entities/account.entity';

@Entity({ name: 'matching_order' })
export class OrderEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId: string;

  @Column({ name: 'pair_name', type: 'varchar', length: 50 })
  pairName: string;

  @Column({ name: 'is_bid', type: 'boolean' })
  isBid: boolean;

  @Column({
    name: 'order_type',
    type: 'varchar',
    length: 50,
    default: 'LIMIT',
  })
  orderType: string;

  @Column({
    name: 'price',
    type: 'numeric',
    precision: 20,
    scale: 8,
    nullable: true,
  })
  price: string | null;

  @Column({
    name: 'amount',
    type: 'numeric',
    precision: 20,
    scale: 8,
  })
  amount: string;

  @Column({
    name: 'filled',
    type: 'numeric',
    precision: 20,
    scale: 8,
    default: 0,
  })
  filled: string;

  @Column({
    name: 'remaining',
    type: 'numeric',
    precision: 20,
    scale: 8,
  })
  remaining: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 50,
    default: 'PENDING',
  })
  status: string;

  @CreateDateColumn({
    name: 'placed_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  placedAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @ManyToOne(() => AccountEntity, (account) => account.id, {
    onDelete: 'CASCADE',
  })
  account: AccountEntity;
}

