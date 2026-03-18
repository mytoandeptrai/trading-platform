import { ApiProperty } from '@nestjs/swagger';

/**
 * Ticker response DTO matching Binance-like format.
 */
export class TickerResponseDto {
  @ApiProperty({ example: 'BTC/USD' })
  pairName: string;

  @ApiProperty({ example: '50000.00000000' })
  lastPrice: string;

  @ApiProperty({ example: '49500.00000000' })
  openPrice: string;

  @ApiProperty({ example: '51000.00000000' })
  highPrice: string;

  @ApiProperty({ example: '49000.00000000' })
  lowPrice: string;

  @ApiProperty({ example: '500.00000000' })
  priceChange: string;

  @ApiProperty({ example: '1.0101' })
  priceChangePercent: string;

  @ApiProperty({ example: '1234.56789000' })
  volume: string;

  @ApiProperty({ example: '61728394.50000000' })
  quoteVolume: string;

  @ApiProperty({ example: '49999.00000000', nullable: true })
  bidPrice: string | null;

  @ApiProperty({ example: '5.12340000', nullable: true })
  bidQty: string | null;

  @ApiProperty({ example: '50001.00000000', nullable: true })
  askPrice: string | null;

  @ApiProperty({ example: '3.45670000', nullable: true })
  askQty: string | null;

  @ApiProperty({ example: 15432 })
  tradeCount: number;

  @ApiProperty()
  updatedAt: Date;
}
