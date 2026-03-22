import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderbookService } from './orderbook.service';
import { OrderbookQueryDto } from './dto/orderbook-query.dto';

@ApiTags('orderbook')
@Controller('orderbook')
export class OrderbookController {
  constructor(private readonly orderbookService: OrderbookService) {}

  @Get()
  @ApiOperation({ summary: 'Get orderbook (bids/asks) from Redis' })
  @ApiOkResponse({
    description: 'Orderbook snapshot from Redis',
    schema: {
      type: 'object',
      properties: {
        pair: { type: 'string', example: 'BTC/USDT' },
        bids: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              price: { type: 'number', example: 50000 },
              quantity: { type: 'number', example: 0.25 },
              orderCount: { type: 'number', example: 5 },
            },
          },
        },
        asks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              price: { type: 'number', example: 50100 },
              quantity: { type: 'number', example: 0.1 },
              orderCount: { type: 'number', example: 2 },
            },
          },
        },
      },
    },
  })
  async getOrderbook(@Query() query: OrderbookQueryDto) {
    return this.orderbookService.getSnapshot(query.pair, query.levels);
  }
}
