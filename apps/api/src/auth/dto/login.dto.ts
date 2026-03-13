import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'johndoe', description: 'Username', minLength: 3 })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'MyP@ssw0rd', description: 'Password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
