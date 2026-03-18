import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrderGateway } from './order.gateway';
import { TickerGateway } from './ticker.gateway';

/**
 * WebSocketModule provides real-time communication
 * - OrderGateway: Private order/trade events (JWT auth)
 * - TickerGateway: Public ticker/orderbook updates (no auth)
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
  providers: [OrderGateway, TickerGateway],
  exports: [OrderGateway, TickerGateway],
})
export class WebSocketModule {}
