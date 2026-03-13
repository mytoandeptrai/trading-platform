import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { TradingPairName } from '../../common/constants/pairs.constant';

export class PlaceOrderDto {
  @IsString()
  @IsIn(['BTC/USD', 'ETH/USD'])
  pair: TradingPairName;

  @IsString()
  @IsIn(['BUY', 'SELL'])
  side: 'BUY' | 'SELL';

  @IsString()
  @IsIn(['LIMIT', 'MARKET'])
  type: 'LIMIT' | 'MARKET';

  @IsOptional()
  @IsNumber()
  @Min(0.00000001)
  price?: number;

  @IsNumber()
  @Min(0.00000001)
  amount: number;

  @IsOptional()
  @IsString()
  validity?: 'GTC' | 'GTD' | 'IOC' | 'FOK';
}

