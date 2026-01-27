import { Module } from '@nestjs/common';
import { ChangeEventsController } from './change-events.controller';
import { ChangeEventsService } from './change-events.service';

@Module({
  controllers: [ChangeEventsController],
  providers: [ChangeEventsService],
  exports: [ChangeEventsService],
})
export class ChangeEventsModule {}
