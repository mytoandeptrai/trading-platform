import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { LoggerModule } from '../common/logger/logger.module';
import { AuthModule } from '../auth/auth.module';
import { AccountEntity } from './entities/account.entity';
import { AccountCashEntity } from './entities/account-cash.entity';
import { AccountCoinEntity } from './entities/account-coin.entity';
import { LockRecordEntity } from './entities/lock-record.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { BalanceService } from './balance.service';

@Module({
  imports: [
    LoggerModule,
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([
      AccountEntity,
      AccountCashEntity,
      AccountCoinEntity,
      LockRecordEntity,
      TransactionEntity,
    ]),
  ],
  controllers: [AccountController],
  providers: [AccountService, BalanceService],
  exports: [AccountService, BalanceService],
})
export class AccountModule {}
