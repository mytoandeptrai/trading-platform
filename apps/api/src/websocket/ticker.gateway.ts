import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

/**
 * TickerGateway handles real-time ticker updates
 * Namespace: /ticker
 * Authentication: Not required (public)
 */
@WebSocketGateway({
  namespace: '/ticker',
  cors: {
    origin: '*', // TODO: Configure based on environment
    credentials: true,
  },
})
@Injectable()
export class TickerGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TickerGateway.name);

  /**
   * Handle client connection (no auth required)
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client ${client.id} connected to ticker gateway`);

    // Send connection success
    client.emit('connected', {
      message: 'Connected to ticker gateway',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected from ticker gateway`);
  }

  /**
   * Event: ticker.update
   * Emitted when ticker is updated (from TickerService)
   * Broadcast to all connected clients
   */
  @OnEvent('ticker.update')
  handleTickerUpdate(payload: {
    pairName: string;
    lastPrice: string;
    openPrice: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    quoteVolume: string;
    priceChange: string;
    priceChangePercent: string;
    bidPrice: string;
    bidQty: string;
    askPrice: string;
    askQty: string;
    tradeCount: number;
    updatedAt: Date;
  }) {
    // Broadcast to all connected clients
    this.server.emit('ticker:update', {
      pair: payload.pairName,
      lastPrice: payload.lastPrice,
      openPrice: payload.openPrice,
      highPrice: payload.highPrice,
      lowPrice: payload.lowPrice,
      volume: payload.volume,
      quoteVolume: payload.quoteVolume,
      priceChange: payload.priceChange,
      priceChangePercent: payload.priceChangePercent,
      bidPrice: payload.bidPrice,
      bidQty: payload.bidQty,
      askPrice: payload.askPrice,
      askQty: payload.askQty,
      tradeCount: payload.tradeCount,
      timestamp: payload.updatedAt,
    });

    this.logger.debug(
      `Broadcasted ticker:update - Pair: ${payload.pairName}, Price: ${payload.lastPrice}`,
    );
  }

  /**
   * Event: orderbook.update
   * Emitted when orderbook is updated
   * Broadcast orderbook snapshot to all clients
   */
  @OnEvent('orderbook.update')
  handleOrderbookUpdate(payload: {
    pairName: string;
    bids: Array<{ price: string; quantity: string }>;
    asks: Array<{ price: string; quantity: string }>;
    timestamp: Date;
  }) {
    // Broadcast to all connected clients
    this.server.emit('orderbook:update', {
      pair: payload.pairName,
      bids: payload.bids,
      asks: payload.asks,
      timestamp: payload.timestamp,
    });

    this.logger.debug(
      `Broadcasted orderbook:update - Pair: ${payload.pairName}`,
    );
  }
}
