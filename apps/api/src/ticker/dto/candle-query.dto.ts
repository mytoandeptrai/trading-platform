import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum CandleTimeframe {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  ONE_HOUR = '1h',
  ONE_DAY = '1d',
}

/**
 * Query DTO for candle API endpoints.
 */
export class CandleQueryDto {
  @ApiProperty({
    enum: CandleTimeframe,
    example: CandleTimeframe.ONE_MINUTE,
    description: 'Candle timeframe',
  })
  @IsEnum(CandleTimeframe)
  timeframe: CandleTimeframe;

  @ApiProperty({
    example: 100,
    description: 'Number of candles to retrieve',
    required: false,
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
}
