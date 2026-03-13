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
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderService } from './order.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@ApiTags('orders')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async placeOrder(@Request() req, @Body() dto: PlaceOrderDto) {
    const { orderId } = await this.orderService.placeOrder(req.user.id, dto);
    return {
      orderId,
      status: 'PENDING',
    };
  }

  @Get(':id')
  async getOrder(@Request() req, @Param('id') id: string) {
    const order = await this.orderService.getOrderById(req.user.id, Number(id));
    return order;
  }

  @Get()
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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancelOrder(@Request() req, @Param('id') id: string) {
    const dto: CancelOrderDto = { orderId: Number(id) };
    await this.orderService.cancelOrder(req.user.id, dto);
    return { orderId: Number(id), status: 'CANCELED' };
  }
}
