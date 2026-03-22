import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradingPair } from '../common/entities/trading-pair.entity';
import { TradingPairsController } from './trading-pairs.controller';
import { TradingPairsService } from './trading-pairs.service';

@Module({
  imports: [TypeOrmModule.forFeature([TradingPair])],
  controllers: [TradingPairsController],
  providers: [TradingPairsService],
  exports: [TradingPairsService],
})
export class TradingPairsModule {}
