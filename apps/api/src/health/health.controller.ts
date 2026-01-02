import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  async health() {
    const [db, redis] = await Promise.all([
      this.healthService.checkDatabase(),
      this.healthService.checkRedis(),
    ]);

    return {
      status: 'ok',
      db,
      redis,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready() {
    const [db, redis] = await Promise.all([
      this.healthService.checkDatabase(),
      this.healthService.checkRedis(),
    ]);

    const ready = db && redis;

    return {
      status: ready ? 'ready' : 'degraded',
      db,
      redis,
      timestamp: new Date().toISOString(),
    };
  }
}
