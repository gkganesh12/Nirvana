import { Module } from '@nestjs/common';
import { SessionReplayService } from './session-replay.service';
import { SessionReplayController } from './session-replay.controller';

@Module({
    controllers: [SessionReplayController],
    providers: [SessionReplayService],
    exports: [SessionReplayService],
})
export class SessionReplayModule { }
