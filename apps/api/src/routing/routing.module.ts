/**
 * Routing Module
 * 
 * Provides routing rules engine and CRUD functionality.
 * 
 * @module routing/routing.module
 */
import { Module } from '@nestjs/common';
import { RulesEngineService } from './rules-engine.service';
import { RoutingRulesService } from './routing-rules.service';
import { RoutingRulesController } from './routing-rules.controller';

import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [AuditModule],
    controllers: [RoutingRulesController],
    providers: [RulesEngineService, RoutingRulesService],
    exports: [RulesEngineService, RoutingRulesService],
})
export class RoutingModule { }
