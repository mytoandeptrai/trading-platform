import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderbookController } from './orderbook.controller';
import { OrderService } from './order.service';
import { OrderEntity } from './entities/order.entity';
import { OrderHistoryEntity } from './entities/order-history.entity';
import { TradeEntity } from './entities/trade.entity';
import { AccountEntity } from '../account/entities/account.entity';
import { LoggerModule } from '../common/logger/logger.module';
import { AccountModule } from '../account/account.module';
import { TradingPairsModule } from '../trading-pairs/trading-pairs.module';
import { OrderbookService } from './orderbook.service';
import { MatchingProcessor } from './jobs/matching.processor';
import { SettlementService } from './settlement.service';

@Module({
  imports: [
    LoggerModule,
    AccountModule,
    TradingPairsModule,
    BullModule.registerQueue({
      name: 'order-matching',
    }),
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderHistoryEntity,
      TradeEntity,
      AccountEntity,
    ]),
  ],
  controllers: [OrderController, OrderbookController],
  providers: [
    OrderService,
    OrderbookService,
    MatchingProcessor,
    SettlementService,
  ],
  exports: [OrderbookService],
})
export class MatchingModule {}
