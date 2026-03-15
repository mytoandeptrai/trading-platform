import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class OrderbookQueryDto {
  @ApiProperty({
    example: 'BTC/USD',
    description: 'Trading pair',
    enum: ['BTC/USD', 'ETH/USD'],
  })
  @IsString()
  @IsIn(['BTC/USD', 'ETH/USD'])
  pair: 'BTC/USD' | 'ETH/USD';

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
