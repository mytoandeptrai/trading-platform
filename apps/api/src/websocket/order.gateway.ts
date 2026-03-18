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
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';

/**
 * OrderGateway handles real-time order and trade notifications
 * Namespace: /orders
 * Authentication: JWT required
 */
@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: '*', // TODO: Configure based on environment
    credentials: true,
  },
})
@Injectable()
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrderGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Handle client connection
   * Verify JWT token and join user-specific room
   */
  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token as string);
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn(
          `Client ${client.id} connection rejected: Invalid token`,
        );
        client.disconnect();
        return;
      }

      // Store user info in socket data
      client.data.userId = userId;
      client.data.username = payload.username;

      // Join user-specific room
      const userRoom = `user:${userId}`;
      await client.join(userRoom);

      this.logger.log(
        `Client ${client.id} connected - User: ${payload.username} (${userId}) - Room: ${userRoom}`,
      );

      // Send connection success
      client.emit('connected', {
        message: 'Connected to order gateway',
        userId,
        username: payload.username,
      });
    } catch (error: any) {
      this.logger.error(
        `Client ${client.id} connection error: ${error.message}`,
      );
      client.disconnect();
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const username = client.data.username;
    this.logger.log(
      `Client ${client.id} disconnected - User: ${username} (${userId})`,
    );
  }

  /**
   * Handle subscribe to pair-specific events
   */
  @SubscribeMessage('subscribe:pair')
  async handleSubscribePair(
    @ConnectedSocket() client: Socket,
    @MessageBody() pairName: string,
  ) {
    if (!pairName) {
      client.emit('error', { message: 'Pair name is required' });
      return;
    }

    const pairRoom = `pair:${pairName}`;
    await client.join(pairRoom);

    this.logger.log(
      `Client ${client.id} subscribed to pair: ${pairName} - Room: ${pairRoom}`,
    );

    client.emit('subscribed', {
      message: `Subscribed to ${pairName}`,
      pair: pairName,
    });
  }

  /**
   * Handle unsubscribe from pair-specific events
   */
  @SubscribeMessage('unsubscribe:pair')
  async handleUnsubscribePair(
    @ConnectedSocket() client: Socket,
    @MessageBody() pairName: string,
  ) {
    if (!pairName) {
      client.emit('error', { message: 'Pair name is required' });
      return;
    }

    const pairRoom = `pair:${pairName}`;
    await client.leave(pairRoom);

    this.logger.log(
      `Client ${client.id} unsubscribed from pair: ${pairName}`,
    );

    client.emit('unsubscribed', {
      message: `Unsubscribed from ${pairName}`,
      pair: pairName,
    });
  }

  /**
   * Event: order.matched
   * Emitted when an order is matched with opposite order
   */
  @OnEvent('order.matched')
  handleOrderMatched(payload: {
    orderId: string;
    userId: string;
    pairName: string;
    side: string;
    price: string;
    quantity: string;
    matchedQuantity: string;
    remainingQuantity: string;
    oppositeOrderId: string;
  }) {
    // Emit to user room (private)
    const userRoom = `user:${payload.userId}`;
    this.server.to(userRoom).emit('order:matched', {
      orderId: payload.orderId,
      pairName: payload.pairName,
      side: payload.side,
      price: payload.price,
      quantity: payload.quantity,
      matchedQuantity: payload.matchedQuantity,
      remainingQuantity: payload.remainingQuantity,
      oppositeOrderId: payload.oppositeOrderId,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(
      `Emitted order:matched to ${userRoom} - Order: ${payload.orderId}`,
    );
  }

  /**
   * Event: trade.executed
   * Emitted when a trade is executed (after settlement)
   */
  @OnEvent('trade.executed')
  handleTradeExecuted(payload: {
    tradeId: string;
    pairName: string;
    price: string;
    quantity: string;
    value: string;
    buyOrderId: string;
    sellOrderId: string;
    buyUserId: string;
    sellUserId: string;
    executedAt: Date;
  }) {
    // Emit to both users (private)
    const buyUserRoom = `user:${payload.buyUserId}`;
    const sellUserRoom = `user:${payload.sellUserId}`;

    const tradeData = {
      tradeId: payload.tradeId,
      pairName: payload.pairName,
      price: payload.price,
      quantity: payload.quantity,
      value: payload.value,
      executedAt: payload.executedAt,
    };

    // Emit to buyer
    this.server.to(buyUserRoom).emit('trade:executed', {
      ...tradeData,
      side: 'BUY',
      orderId: payload.buyOrderId,
    });

    // Emit to seller
    this.server.to(sellUserRoom).emit('trade:executed', {
      ...tradeData,
      side: 'SELL',
      orderId: payload.sellOrderId,
    });

    // Emit to pair room (public)
    const pairRoom = `pair:${payload.pairName}`;
    this.server.to(pairRoom).emit('trade:public', {
      tradeId: payload.tradeId,
      pairName: payload.pairName,
      price: payload.price,
      quantity: payload.quantity,
      executedAt: payload.executedAt,
    });

    this.logger.debug(
      `Emitted trade:executed - Trade: ${payload.tradeId}, Pair: ${payload.pairName}`,
    );
  }

  /**
   * Event: order.filled
   * Emitted when an order is completely filled
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
      pairName: payload.pairName,
      side: payload.side,
      filledQuantity: payload.filledQuantity,
      averagePrice: payload.averagePrice,
      status: 'FILLED',
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(
      `Emitted order:filled to ${userRoom} - Order: ${payload.orderId}`,
    );
  }

  /**
   * Event: order.cancelled
   * Emitted when an order is cancelled
   */
  @OnEvent('order.cancelled')
  handleOrderCancelled(payload: {
    orderId: string;
    userId: string;
    pairName: string;
    side: string;
    reason: string;
  }) {
    const userRoom = `user:${payload.userId}`;
    this.server.to(userRoom).emit('order:cancelled', {
      orderId: payload.orderId,
      pairName: payload.pairName,
      side: payload.side,
      reason: payload.reason,
      status: 'CANCELLED',
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(
      `Emitted order:cancelled to ${userRoom} - Order: ${payload.orderId}`,
    );
  }
}
