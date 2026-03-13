import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderEntity } from './entities/order.entity';
import { OrderHistoryEntity } from './entities/order-history.entity';
import { TradeEntity } from './entities/trade.entity';
import { AccountEntity } from '../account/entities/account.entity';
import { LoggerModule } from '../common/logger/logger.module';
import { AccountModule } from '../account/account.module';
import { OrderbookService } from './orderbook.service';

@Module({
  imports: [
    LoggerModule,
    AccountModule,
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderHistoryEntity,
      TradeEntity,
      AccountEntity,
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderbookService],
})
export class MatchingModule {}

