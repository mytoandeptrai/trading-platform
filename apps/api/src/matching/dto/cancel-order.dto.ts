import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({ example: 1, description: 'Order ID to cancel' })
  @IsNumber()
  orderId: number;
}

