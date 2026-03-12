import { IsString, IsNumber, Min, IsIn } from 'class-validator';

export class DepositDto {
  @IsString()
  @IsIn(['USD', 'VND', 'BTC', 'ETH'], {
    message: 'Asset must be one of: USD, VND, BTC, ETH',
  })
  asset: string;

  @IsNumber()
  @Min(0.00000001, { message: 'Amount must be greater than 0' })
  amount: number;
}
