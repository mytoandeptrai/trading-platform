import { IsNumber } from 'class-validator';

export class CancelOrderDto {
  @IsNumber()
  orderId: number;
}

