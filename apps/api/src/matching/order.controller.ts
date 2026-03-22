import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiAcceptedResponse,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderService } from './order.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Place a new order (LIMIT or MARKET)' })
  @ApiBody({ type: PlaceOrderDto })
  @ApiAcceptedResponse({
    description: 'Order accepted. Returns orderId and status PENDING.',
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'number', example: 1 },
        status: { type: 'string', example: 'PENDING' },
      },
    },
  })
  async placeOrder(@Request() req, @Body() dto: PlaceOrderDto) {
    const { orderId } = await this.orderService.placeOrder(req.user.id, dto);
    return {
      orderId,
      status: 'PENDING',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID', example: '1' })
  @ApiOkResponse({
    description:
      'Order details (id, pair, side, type, price, amount, filled, remaining, status, etc.)',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        accountId: { type: 'string' },
        pairName: { type: 'string' },
        isBid: { type: 'boolean' },
        orderType: { type: 'string' },
        price: { type: 'string', nullable: true },
        amount: { type: 'string' },
        filled: { type: 'string' },
        remaining: { type: 'string' },
        status: { type: 'string' },
      },
    },
  })
  async getOrder(@Request() req, @Param('id') id: string) {
    const order = await this.orderService.getOrderById(req.user.id, Number(id));
    return order;
  }

  @Get()
  @ApiOperation({ summary: 'List orders with optional filters' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by status (PENDING, COMPLETED, CANCELED, etc.)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max items (default 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Offset for pagination (default 0)',
  })
  @ApiOkResponse({
    description: 'List of orders.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          pairName: { type: 'string' },
          orderType: { type: 'string' },
          status: { type: 'string' },
          amount: { type: 'string' },
          filled: { type: 'string' },
          remaining: { type: 'string' },
        },
      },
    },
  })
  async listOrders(
    @Request() req,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.orderService.listOrders(
      req.user.id,
      status,
      parsedLimit,
      parsedOffset,
    );
  }

  @Post('cancel-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel all active orders for the current user' })
  @ApiOkResponse({
    description: 'All active orders canceled. Returns count and list of order IDs.',
    schema: {
      type: 'object',
      properties: {
        canceled: { type: 'number', example: 3 },
        orderIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['1', '2', '3'],
        },
      },
    },
  })
  async cancelAllOrders(@Request() req) {
    return this.orderService.cancelAllOrders(req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'id', description: 'Order ID to cancel', example: '1' })
  @ApiOkResponse({
    description: 'Order canceled.',
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'number' },
        status: { type: 'string', example: 'CANCELED' },
      },
    },
  })
  async cancelOrder(@Request() req, @Param('id') id: string) {
    const dto: CancelOrderDto = { orderId: Number(id) };
    await this.orderService.cancelOrder(req.user.id, dto);
    return { orderId: Number(id), status: 'CANCELED' };
  }
}
