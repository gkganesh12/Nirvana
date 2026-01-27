import { Module } from '@nestjs/common';
import { StatusPagesController } from './status-pages.controller';
import { StatusPagesService } from './status-pages.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [StatusPagesController],
  providers: [StatusPagesService],
  exports: [StatusPagesService],
})
export class StatusPagesModule {}
