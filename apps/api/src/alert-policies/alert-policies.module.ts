import { Module } from '@nestjs/common';
import { AlertPoliciesController } from './alert-policies.controller';
import { AlertPoliciesService } from './alert-policies.service';

@Module({
  controllers: [AlertPoliciesController],
  providers: [AlertPoliciesService],
  exports: [AlertPoliciesService],
})
export class AlertPoliciesModule {}
