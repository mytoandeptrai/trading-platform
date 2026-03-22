import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UnifiedGateway } from './unified.gateway';

/**
 * WebSocketModule provides real-time communication
 * - UnifiedGateway: Single WebSocket for all events (namespace: /ws)
 *   - Public events: ticker:update, orderbook:update, orderbook:changed
 *   - Private events: order:matched, trade:executed, order:filled, order:cancelled
 *   - Optional JWT auth: if token provided, join user room for private events
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtConfig = configService.get('jwt');
        return {
          secret: jwtConfig?.secret,
          signOptions: {
            expiresIn: jwtConfig?.expiresIn || '7d',
          },
        };
      },
    }),
  ],
  providers: [UnifiedGateway],
  exports: [UnifiedGateway],
})
export class WebSocketModule {}
