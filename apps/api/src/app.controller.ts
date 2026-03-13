import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Root welcome message' })
  @ApiOkResponse({ description: 'Hello message', schema: { type: 'object', properties: { message: { type: 'string' } } } })
  getHello() {
    return this.appService.getHello();
  }
}
