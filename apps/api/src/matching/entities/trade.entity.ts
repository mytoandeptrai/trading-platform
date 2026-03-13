import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'matching_trade' })
export class TradeEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'bid_order_id', type: 'bigint' })
  bidOrderId: string;

  @Column({ name: 'bid_account_id', type: 'bigint' })
  bidAccountId: string;

  @Column({ name: 'ask_order_id', type: 'bigint' })
  askOrderId: string;

  @Column({ name: 'ask_account_id', type: 'bigint' })
  askAccountId: string;

  @Column({ name: 'pair_name', type: 'varchar', length: 50 })
  pairName: string;

  @Column({
    name: 'price',
    type: 'numeric',
    precision: 20,
    scale: 8,
  })
  price: string;

  @Column({
    name: 'quantity',
    type: 'numeric',
    precision: 20,
    scale: 8,
  })
  quantity: string;

  @Column({
    name: 'value',
    type: 'numeric',
    precision: 20,
    scale: 8,
  })
  value: string;

  @Column({
    name: 'buyer_fee',
    type: 'numeric',
    precision: 20,
    scale: 8,
    default: 0,
  })
  buyerFee: string;

  @Column({
    name: 'seller_fee',
    type: 'numeric',
    precision: 20,
    scale: 8,
    default: 0,
  })
  sellerFee: string;

  @CreateDateColumn({
    name: 'executed_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  executedAt: Date;

  @Column({
    name: 'settlement_status',
    type: 'varchar',
    length: 50,
    default: 'PENDING',
  })
  settlementStatus: string;

  @Column({ name: 'settlement_time', type: 'timestamp', nullable: true })
  settlementTime: Date | null;
}

