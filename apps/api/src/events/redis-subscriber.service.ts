import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';
import Redis from 'ioredis';

/**
 * Generic Redis pub/sub subscriber service.
 * Supports multiple handlers per channel for reusability.
 */
@Injectable()
export class RedisSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisSubscriberService.name);
  private subscriber: Redis | null = null;
  private readonly handlers = new Map<string, Set<(data: any) => Promise<void>>>();

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit(): Promise<void> {
    // Create a separate Redis client for subscribing
    // (Redis clients in pub/sub mode cannot execute other commands)
    this.subscriber = this.redisService.getClient().duplicate();

    this.subscriber.on('message', async (channel: string, message: string) => {
      const channelHandlers = this.handlers.get(channel);
      if (!channelHandlers || channelHandlers.size === 0) {
        return;
      }

      try {
        const data = JSON.parse(message);
        // Execute all handlers for this channel
        await Promise.all(
          Array.from(channelHandlers).map((handler) =>
            handler(data).catch((err) => {
              this.logger.error(
                `Handler error for channel=${channel}: ${err.message}`,
                err.stack,
              );
            }),
          ),
        );
      } catch (err: any) {
        this.logger.error(
          `Failed to parse message from channel=${channel}: ${err.message}`,
        );
      }
    });

    this.logger.log('RedisSubscriberService initialized');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
  }

  /**
   * Subscribe to a Redis channel with a handler.
   * Multiple handlers can be registered for the same channel.
   */
  async subscribe(
    channel: string,
    handler: (data: any) => Promise<void>,
  ): Promise<void> {
    if (!this.subscriber) {
      throw new Error('RedisSubscriberService not initialized');
    }

    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      await this.subscriber.subscribe(channel);
      this.logger.log(`Subscribed to channel: ${channel}`);
    }

    this.handlers.get(channel)!.add(handler);
  }

  /**
   * Unsubscribe a specific handler from a channel.
   * If no handlers remain, unsubscribe from the Redis channel.
   */
  async unsubscribe(
    channel: string,
    handler: (data: any) => Promise<void>,
  ): Promise<void> {
    const channelHandlers = this.handlers.get(channel);
    if (!channelHandlers) {
      return;
    }

    channelHandlers.delete(handler);

    if (channelHandlers.size === 0) {
      this.handlers.delete(channel);
      if (this.subscriber) {
        await this.subscriber.unsubscribe(channel);
        this.logger.log(`Unsubscribed from channel: ${channel}`);
      }
    }
  }
}
