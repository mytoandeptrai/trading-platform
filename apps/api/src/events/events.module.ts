import { Global, Module } from '@nestjs/common';
import { RedisModule } from '../common/redis/redis.module';
import { RedisSubscriberService } from './redis-subscriber.service';

/**
 * Global EventsModule providing generic Redis pub/sub subscriber.
 * Can be used across all modules without explicit import.
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [RedisSubscriberService],
  exports: [RedisSubscriberService],
})
export class EventsModule {}
