import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TradingPairResponseDto } from './dto/trading-pair-response.dto';
import { TradingPairsService } from './trading-pairs.service';

@ApiTags('Trading Pairs')
@Controller('pairs')
export class TradingPairsController {
  constructor(private readonly tradingPairsService: TradingPairsService) {}

  /**
   * GET /api/pairs - Get all trading pairs
   */
  @Get()
  @ApiOperation({ summary: 'Get all trading pairs' })
  @ApiResponse({
    status: 200,
    description: 'Returns all trading pairs',
    type: [TradingPairResponseDto],
  })
  async getAllPairs(): Promise<TradingPairResponseDto[]> {
    const pairs = await this.tradingPairsService.findAll();
    return pairs.map((pair) => ({
      id: pair.id,
      name: pair.name,
      baseCoin: pair.baseCoin,
      quoteCurrency: pair.quoteCurrency,
      minOrderAmount: pair.minOrderAmount,
      maxOrderAmount: pair.maxOrderAmount,
      tickSize: pair.tickSize,
      maxPrice: pair.maxPrice,
      minPrice: pair.minPrice,
      takerFeeRate: pair.takerFeeRate,
      makerFeeRate: pair.makerFeeRate,
      isTradingActive: pair.isTradingActive,
    }));
  }

  /**
   * GET /api/pairs/active - Get all active trading pairs
   */
  @Get('active')
  @ApiOperation({ summary: 'Get all active trading pairs' })
  @ApiResponse({
    status: 200,
    description: 'Returns all active trading pairs',
    type: [TradingPairResponseDto],
  })
  async getActivePairs(): Promise<TradingPairResponseDto[]> {
    const pairs = await this.tradingPairsService.findActive();
    return pairs.map((pair) => ({
      id: pair.id,
      name: pair.name,
      baseCoin: pair.baseCoin,
      quoteCurrency: pair.quoteCurrency,
      minOrderAmount: pair.minOrderAmount,
      maxOrderAmount: pair.maxOrderAmount,
      tickSize: pair.tickSize,
      maxPrice: pair.maxPrice,
      minPrice: pair.minPrice,
      takerFeeRate: pair.takerFeeRate,
      makerFeeRate: pair.makerFeeRate,
      isTradingActive: pair.isTradingActive,
    }));
  }

  /**
   * GET /api/pairs/:name - Get a specific trading pair by name
   */
  @Get(':name')
  @ApiOperation({ summary: 'Get a specific trading pair by name' })
  @ApiParam({ name: 'name', example: 'BTC/USD' })
  @ApiResponse({
    status: 200,
    description: 'Returns the trading pair',
    type: TradingPairResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Trading pair not found',
  })
  async getPairByName(
    @Param('name') name: string,
  ): Promise<TradingPairResponseDto> {
    const pair = await this.tradingPairsService.findByName(name);
    return {
      id: pair.id,
      name: pair.name,
      baseCoin: pair.baseCoin,
      quoteCurrency: pair.quoteCurrency,
      minOrderAmount: pair.minOrderAmount,
      maxOrderAmount: pair.maxOrderAmount,
      tickSize: pair.tickSize,
      maxPrice: pair.maxPrice,
      minPrice: pair.minPrice,
      takerFeeRate: pair.takerFeeRate,
      makerFeeRate: pair.makerFeeRate,
      isTradingActive: pair.isTradingActive,
    };
  }
}
