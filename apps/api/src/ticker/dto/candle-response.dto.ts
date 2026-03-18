import { ApiProperty } from '@nestjs/swagger';

/**
 * Candle response DTO.
 */
export class CandleResponseDto {
  @ApiProperty({ example: 'BTC/USD' })
  pairName: string;

  @ApiProperty({ example: '2024-03-18T10:00:00.000Z' })
  openTime: Date;

  @ApiProperty({ example: '2024-03-18T10:59:59.999Z' })
  closeTime: Date;

  @ApiProperty({ example: '50000.00000000' })
  open: string;

  @ApiProperty({ example: '51000.00000000' })
  high: string;

  @ApiProperty({ example: '49500.00000000' })
  low: string;

  @ApiProperty({ example: '50500.00000000' })
  close: string;

  @ApiProperty({ example: '123.45670000' })
  volume: string;

  @ApiProperty({ example: 234 })
  tradesCount: number;

  @ApiProperty({ example: true })
  isClosed: boolean;
}
