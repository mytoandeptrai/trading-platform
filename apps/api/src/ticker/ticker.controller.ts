import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TickerService } from './ticker.service';
import { CandleService } from './candle.service';
import { TickerResponseDto } from './dto/ticker-response.dto';
import { CandleResponseDto } from './dto/candle-response.dto';
import { CandleQueryDto } from './dto/candle-query.dto';

/**
 * TickerController: Exposes market data endpoints (ticker, candles).
 */
@ApiTags('Market Data')
@Controller('ticker')
export class TickerController {
  constructor(
    private readonly tickerService: TickerService,
    private readonly candleService: CandleService,
  ) {}

  /**
   * GET /api/ticker - Get all tickers.
   */
  @Get()
  @ApiOperation({ summary: 'Get all trading pair tickers' })
  @ApiResponse({
    status: 200,
    description: 'Returns all tickers',
    type: [TickerResponseDto],
  })
  async getAllTickers(): Promise<TickerResponseDto[]> {
    const tickers = await this.tickerService.getAllTickers();
    return tickers.map((ticker) => ({
      pairName: ticker.pairName,
      lastPrice: ticker.lastPrice,
      openPrice: ticker.openPrice,
      highPrice: ticker.highPrice,
      lowPrice: ticker.lowPrice,
      priceChange: ticker.priceChange,
      priceChangePercent: ticker.priceChangePercent,
      volume: ticker.volume,
      quoteVolume: ticker.quoteVolume,
      bidPrice: ticker.bidPrice,
      bidQty: ticker.bidQty,
      askPrice: ticker.askPrice,
      askQty: ticker.askQty,
      tradeCount: ticker.tradeCount,
      updatedAt: ticker.updatedAt,
    }));
  }

  /**
   * GET /api/ticker/candles - Get candles with time range filtering.
   * IMPORTANT: This route must come BEFORE @Get(':pair') to avoid route conflicts.
   */
  @Get('candles')
  @ApiOperation({ summary: 'Get candles for a specific trading pair with time range' })
  @ApiResponse({
    status: 200,
    description: 'Returns candles for the pair within time range',
    type: [CandleResponseDto],
  })
  async getCandles(
    @Query() query: CandleQueryDto,
  ): Promise<CandleResponseDto[]> {
    const candles = await this.candleService.getCandles(
      query.pairName,
      query.interval,
      query.take,
      query.startTime,
      query.endTime,
    );

    return candles.map((candle) => ({
      pairName: candle.pairName,
      openTime: candle.openTime,
      closeTime: candle.closeTime,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      tradesCount: candle.tradesCount,
      isClosed: candle.isClosed,
    }));
  }

  /**
   * GET /api/ticker/:pair - Get ticker for a specific trading pair.
   */
  @Get(':pair')
  @ApiOperation({ summary: 'Get ticker for a specific trading pair' })
  @ApiParam({ name: 'pair', example: 'BTC/USDT' })
  @ApiResponse({
    status: 200,
    description: 'Returns ticker for the pair',
    type: TickerResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ticker not found',
  })
  async getTicker(@Param('pair') pair: string): Promise<TickerResponseDto> {
    const ticker = await this.tickerService.getTicker(pair);
    if (!ticker) {
      throw new NotFoundException(`Ticker not found for pair: ${pair}`);
    }

    return {
      pairName: ticker.pairName,
      lastPrice: ticker.lastPrice,
      openPrice: ticker.openPrice,
      highPrice: ticker.highPrice,
      lowPrice: ticker.lowPrice,
      priceChange: ticker.priceChange,
      priceChangePercent: ticker.priceChangePercent,
      volume: ticker.volume,
      quoteVolume: ticker.quoteVolume,
      bidPrice: ticker.bidPrice,
      bidQty: ticker.bidQty,
      askPrice: ticker.askPrice,
      askQty: ticker.askQty,
      tradeCount: ticker.tradeCount,
      updatedAt: ticker.updatedAt,
    };
  }
}
