import { Module } from '@nestjs/common';
import { CorrelationService } from './correlation.service';
import { CorrelationController } from './correlation.controller';

@Module({
    controllers: [CorrelationController],
    providers: [CorrelationService],
    exports: [CorrelationService],
})
export class CorrelationModule { }
