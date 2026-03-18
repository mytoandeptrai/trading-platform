import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../common/redis/redis.module';
import { MatchingModule } from '../matching/matching.module';
import { TickerEntity } from './entities/ticker.entity';
import { Candle1mEntity } from './entities/candle-1m.entity';
import { Candle5mEntity } from './entities/candle-5m.entity';
import { Candle1hEntity } from './entities/candle-1h.entity';
import { Candle1dEntity } from './entities/candle-1d.entity';
import { TickerService } from './ticker.service';
import { CandleService } from './candle.service';
import { TickerController } from './ticker.controller';

/**
 * TickerModule: Market data module (ticker + candles).
 * Handles real-time 24h ticker statistics and OHLCV candle data.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      TickerEntity,
      Candle1mEntity,
      Candle5mEntity,
      Candle1hEntity,
      Candle1dEntity,
    ]),
    RedisModule,
    MatchingModule,
  ],
  providers: [TickerService, CandleService],
  controllers: [TickerController],
  exports: [TickerService, CandleService],
})
export class TickerModule {}
