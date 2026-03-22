import { ApiProperty } from '@nestjs/swagger';

export class TradingPairResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'BTC/USD' })
  name: string;

  @ApiProperty({ example: 'BTC' })
  baseCoin: string;

  @ApiProperty({ example: 'USD' })
  quoteCurrency: string;

  @ApiProperty({ example: '0.001' })
  minOrderAmount: string;

  @ApiProperty({ example: '100' })
  maxOrderAmount: string;

  @ApiProperty({ example: '0.01' })
  tickSize: string;

  @ApiProperty({ example: '1000000' })
  maxPrice: string;

  @ApiProperty({ example: '0.01' })
  minPrice: string;

  @ApiProperty({ example: '0.001' })
  takerFeeRate: string;

  @ApiProperty({ example: '0.0005' })
  makerFeeRate: string;

  @ApiProperty({ example: true })
  isTradingActive: boolean;
}
