import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { TradingPairName } from '../../common/constants/pairs.constant';

export class PlaceOrderDto {
  @ApiProperty({ example: 'BTC/USD', description: 'Trading pair', enum: ['BTC/USD', 'ETH/USD'] })
  @IsString()
  @IsIn(['BTC/USD', 'ETH/USD'])
  pair: TradingPairName;

  @ApiProperty({ example: 'BUY', description: 'Order side', enum: ['BUY', 'SELL'] })
  @IsString()
  @IsIn(['BUY', 'SELL'])
  side: 'BUY' | 'SELL';

  @ApiProperty({ example: 'LIMIT', description: 'Order type', enum: ['LIMIT', 'MARKET'] })
  @IsString()
  @IsIn(['LIMIT', 'MARKET'])
  type: 'LIMIT' | 'MARKET';

  @ApiPropertyOptional({
    example: 50000,
    description: 'Price per unit (required for LIMIT, optional for MARKET as max price)',
    minimum: 0.00000001,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  price?: number;

  @ApiProperty({ example: 0.01, description: 'Order amount in base currency', minimum: 0.00000001 })
  @IsNumber()
  @Min(0.00000001)
  amount: number;

  @ApiPropertyOptional({ example: 'GTC', description: 'Order validity', enum: ['GTC', 'GTD', 'IOC', 'FOK'] })
  @IsOptional()
  @IsString()
  validity?: 'GTC' | 'GTD' | 'IOC' | 'FOK';
}

