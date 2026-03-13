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
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AccountService } from './account.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('account')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create account for current user' })
  @ApiCreatedResponse({
    description: 'Account created. Returns account id and status.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1' },
        userId: { type: 'string' },
        tradingStatus: { type: 'string', example: 'ACTIVE' },
      },
    },
  })
  async createAccount(@Request() req) {
    return this.accountService.createAccountForUser(req.user.id);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get account balance (cash + coins)' })
  @ApiOkResponse({
    description: 'Available and locked balance per asset.',
    schema: {
      type: 'object',
      properties: {
        cash: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              currencyName: { type: 'string' },
              available: { type: 'string' },
              locked: { type: 'string' },
              total: { type: 'string' },
            },
          },
        },
        coins: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              coinName: { type: 'string' },
              available: { type: 'string' },
              locked: { type: 'string' },
              total: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getBalance(@Request() req) {
    return this.accountService.getBalance(req.user.id);
  }

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deposit asset into account' })
  @ApiBody({ type: DepositDto })
  @ApiOkResponse({
    description: 'Deposit success. Returns updated balance info.',
    schema: {
      type: 'object',
      properties: {
        asset: { type: 'string' },
        amount: { type: 'number' },
        newBalance: { type: 'string' },
      },
    },
  })
  async deposit(@Request() req, @Body() depositDto: DepositDto) {
    return this.accountService.deposit(req.user.id, depositDto);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw asset from account' })
  @ApiBody({ type: WithdrawDto })
  @ApiOkResponse({
    description: 'Withdrawal success. Returns updated balance info.',
    schema: {
      type: 'object',
      properties: {
        asset: { type: 'string' },
        amount: { type: 'number' },
        newBalance: { type: 'string' },
      },
    },
  })
  async withdraw(@Request() req, @Body() withdrawDto: WithdrawDto) {
    return this.accountService.withdraw(req.user.id, withdrawDto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max items (default 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default 0)' })
  @ApiOkResponse({
    description: 'List of transactions with pagination.',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  })
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
