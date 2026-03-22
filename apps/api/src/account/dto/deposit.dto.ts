import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, IsIn } from 'class-validator';

export class DepositDto {
  @ApiProperty({
    example: 'USD',
    description: 'Asset to deposit',
    enum: ['USD', 'VND', 'BTC', 'ETH'],
  })
  @IsString()
  @IsIn(['USD', 'VND', 'BTC', 'ETH'], {
    message: 'Asset must be one of: USD, VND, BTC, ETH',
  })
  asset: string;

  @ApiProperty({
    example: 1000,
    description: 'Amount to deposit',
    minimum: 0.00000001,
  })
  @IsNumber()
  @Min(0.00000001, { message: 'Amount must be greater than 0' })
  amount: number;
}
