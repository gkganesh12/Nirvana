import { Module } from '@nestjs/common';
import { SamlController } from './saml.controller';
import { SamlService } from './saml.service';
import { SamlValidatorService } from './saml-validator.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule],
    controllers: [SamlController],
    providers: [SamlService, SamlValidatorService],
    exports: [SamlService],
})
export class SamlModule { }
