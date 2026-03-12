import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('balance')
  async getBalance(@Request() req) {
    return this.accountService.getBalance(req.user.id);
  }

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  async deposit(@Request() req, @Body() depositDto: DepositDto) {
    return this.accountService.deposit(req.user.id, depositDto);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async withdraw(@Request() req, @Body() withdrawDto: WithdrawDto) {
    return this.accountService.withdraw(req.user.id, withdrawDto);
  }

  @Get('transactions')
  async getTransactions(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.accountService.getTransactionHistory(
      req.user.id,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }
}
