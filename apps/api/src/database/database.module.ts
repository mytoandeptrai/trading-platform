import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { LoggerModule } from '../common/logger/logger.module';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
