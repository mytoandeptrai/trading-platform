import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'order_history' })
export class OrderHistoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId: string;

  @Column({ name: 'pair_name', type: 'varchar', length: 50 })
  pairName: string;

  @Column({ name: 'is_bid', type: 'boolean' })
  isBid: boolean;

  @Column({ name: 'order_type', type: 'varchar', length: 50 })
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

  @Column({ name: 'status', type: 'varchar', length: 50 })
  status: string;

  @Column({ name: 'placed_at', type: 'timestamp' })
  placedAt: Date;

  @CreateDateColumn({
    name: 'completed_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  completedAt: Date;
}
