import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
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
    example: 'BTC/USDT',
    description: 'Trading pair name',
  })
  @IsString()
  pairName: string;

  @ApiProperty({
    enum: CandleTimeframe,
    example: CandleTimeframe.ONE_MINUTE,
    description: 'Candle interval',
  })
  @IsEnum(CandleTimeframe)
  interval: CandleTimeframe;

  @ApiPropertyOptional({
    example: 1710000000,
    description: 'Start time in seconds (Unix timestamp)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  startTime?: number;

  @ApiPropertyOptional({
    example: 1710086400,
    description: 'End time in seconds (Unix timestamp)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  endTime?: number;

  @ApiProperty({
    example: 1000,
    description: 'Number of candles to retrieve',
    required: false,
    default: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  take?: number = 1000;
}
