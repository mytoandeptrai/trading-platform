import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class OrderbookQueryDto {
  @ApiProperty({
    example: 'BTC/USDT',
    description: 'Trading pair (validated against database)',
    enum: ['BTC/USDT', 'ETH/USDT'], // Example values, actual validation is done in service
  })
  @IsString()
  pair: string;

  @ApiPropertyOptional({
    example: 20,
    description:
      'Depth per side. If omitted, returns full list (may be large).',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  levels?: number;
}
