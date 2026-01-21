import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeyAuthGuard } from './api-key-auth.guard';

@Module({
    controllers: [ApiKeysController],
    providers: [ApiKeyService, ApiKeyAuthGuard],
    exports: [ApiKeyService, ApiKeyAuthGuard],
})
export class ApiKeysModule { }
