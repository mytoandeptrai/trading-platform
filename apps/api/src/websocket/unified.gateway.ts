import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';

/**
 * UnifiedGateway - Single WebSocket gateway for all real-time events
 * Namespace: /ws
 *
 * Public Events (broadcast to all):
 * - ticker:update
 * - orderbook:update
 * - orderbook:changed
 * - trade:public
 *
 * Private Events (emit to user room):
 * - order:matched
 * - trade:executed
 * - order:filled
 * - order:cancelled
 */
@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: '*',
    credentials: true,
  },
})
@Injectable()
export class UnifiedGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(UnifiedGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Handle client connection
   * Optional authentication - verify JWT if provided
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;

      // If token provided, authenticate and join user room
      if (token) {
        try {
          const payload = await this.jwtService.verifyAsync(token as string);
          const userId = payload.sub;

          if (userId) {
            client.data.userId = userId;
            client.data.username = payload.username;
            client.data.authenticated = true;

            // Join user-specific room for private events
            const userRoom = `user:${userId}`;
            await client.join(userRoom);

            this.logger.log(
              `Client ${client.id} connected (authenticated) - User: ${payload.username} (${userId})`,
            );

            client.emit('connected', {
              message: 'Connected to WebSocket',
              authenticated: true,
              userId,
              username: payload.username,
            });
            return;
          }
        } catch (error: any) {
          this.logger.warn(
            `Client ${client.id} token verification failed: ${error.message}`,
          );
        }
      }

      // Public connection (no auth)
      client.data.authenticated = false;
      this.logger.log(`Client ${client.id} connected (public)`);

      client.emit('connected', {
        message: 'Connected to WebSocket',
        authenticated: false,
      });
    } catch (error: any) {
      this.logger.error(
        `Connection error for client ${client.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const username = client.data.username;

    if (userId) {
      this.logger.log(
        `Client ${client.id} disconnected - User: ${username} (${userId})`,
      );
    } else {
      this.logger.log(`Client ${client.id} disconnected (public)`);
    }
  }

  /**
   * Subscribe to a trading pair
   */
  @SubscribeMessage('subscribe:pair')
  handleSubscribePair(
    @ConnectedSocket() client: Socket,
    @MessageBody() pair: string,
  ) {
    const room = `pair:${pair}`;
    client.join(room);
    client.emit('subscribed', { pair });
    this.logger.debug(`Client ${client.id} subscribed to pair: ${pair}`);
  }

  /**
   * Unsubscribe from a trading pair
   */
  @SubscribeMessage('unsubscribe:pair')
  handleUnsubscribePair(
    @ConnectedSocket() client: Socket,
    @MessageBody() pair: string,
  ) {
    const room = `pair:${pair}`;
    client.leave(room);
    client.emit('unsubscribed', { pair });
    this.logger.debug(`Client ${client.id} unsubscribed from pair: ${pair}`);
  }

  // ============================================
  // PUBLIC EVENTS (broadcast to all)
  // ============================================

  /**
   * Event: ticker.update
   * Broadcast ticker updates to all connected clients
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
   * Broadcast orderbook snapshots to all clients
   */
  @OnEvent('orderbook.update')
  handleOrderbookUpdate(payload: {
    pairName: string;
    bids: Array<{ price: string; quantity: string }>;
    asks: Array<{ price: string; quantity: string }>;
    timestamp: Date;
  }) {
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

  /**
   * Event: orderbook.changed
   * Notify clients to refetch orderbook after matching
   */
  @OnEvent('orderbook.changed')
  handleOrderbookChanged(payload: { pairName: string; timestamp: Date }) {
    this.server.emit('orderbook:changed', {
      pair: payload.pairName,
      timestamp: payload.timestamp,
    });

    this.logger.debug(
      `Broadcasted orderbook:changed - Pair: ${payload.pairName}`,
    );
  }

  // ============================================
  // PRIVATE EVENTS (emit to user room)
  // ============================================

  /**
   * Event: order.matched
   * Broadcast to all clients (public event)
   * Frontend will handle:
   * - OrderBook: refresh if pair matches
   * - OrderManagement: refresh if user is authenticated
   */
  @OnEvent('order.matched')
  handleOrderMatched(payload: {
    orderId: string;
    userId: string;
    pairName: string;
    side: string;
    price: string | null;
    quantity: string;
    matchedQuantity: string;
    remainingQuantity: string;
    oppositeOrderId: string;
  }) {
    // Broadcast to all clients (public event)
    this.server.emit('order:matched', {
      orderId: payload.orderId,
      pair: payload.pairName,
      side: payload.side,
      price: payload.price,
      quantity: payload.quantity,
      matchedQuantity: payload.matchedQuantity,
      remainingQuantity: payload.remainingQuantity,
    });

    this.logger.debug(
      `Broadcasted order:matched - Order: ${payload.orderId}, Pair: ${payload.pairName}`,
    );
  }

  /**
   * Event: trade.executed
   * Emit to both buyer and seller when trade executes
   */
  @OnEvent('trade.executed')
  handleTradeExecuted(payload: {
    tradeId: string;
    pairName: string;
    price: string;
    quantity: string;
    buyUserId: string;
    sellUserId: string;
    buyOrderId: string;
    sellOrderId: string;
  }) {
    const buyUserRoom = `user:${payload.buyUserId}`;
    const sellUserRoom = `user:${payload.sellUserId}`;

    // Emit to buyer
    this.server.to(buyUserRoom).emit('trade:executed', {
      tradeId: payload.tradeId,
      pair: payload.pairName,
      side: 'BUY',
      price: payload.price,
      amount: payload.quantity,
      orderId: payload.buyOrderId,
    });

    // Emit to seller
    this.server.to(sellUserRoom).emit('trade:executed', {
      tradeId: payload.tradeId,
      pair: payload.pairName,
      side: 'SELL',
      price: payload.price,
      amount: payload.quantity,
      orderId: payload.sellOrderId,
    });

    this.logger.debug(
      `Emitted trade:executed - Trade: ${payload.tradeId}, Pair: ${payload.pairName}`,
    );
  }

  /**
   * Event: order.filled
   * Emit to user when their order is fully filled
   */
  @OnEvent('order.filled')
  handleOrderFilled(payload: {
    orderId: string;
    userId: string;
    pairName: string;
    side: string;
    filledQuantity: string;
    averagePrice: string;
  }) {
    const userRoom = `user:${payload.userId}`;

    this.server.to(userRoom).emit('order:filled', {
      orderId: payload.orderId,
      pair: payload.pairName,
      side: payload.side,
      filledQuantity: payload.filledQuantity,
      averagePrice: payload.averagePrice,
    });

    this.logger.debug(
      `Emitted order:filled to ${userRoom} - Order: ${payload.orderId}`,
    );
  }

  /**
   * Event: order.cancelled
   * Emit to user when their order is cancelled
   */
  @OnEvent('order.cancelled')
  handleOrderCancelled(payload: {
    orderId: string;
    userId: string;
    reason: string;
  }) {
    const userRoom = `user:${payload.userId}`;

    this.server.to(userRoom).emit('order:cancelled', {
      orderId: payload.orderId,
      reason: payload.reason,
    });

    this.logger.debug(
      `Emitted order:cancelled to ${userRoom} - Order: ${payload.orderId}`,
    );
  }
}
