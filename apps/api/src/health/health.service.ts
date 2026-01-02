import { Injectable } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  async checkDatabase(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async checkRedis(): Promise<boolean> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return false;
    }

    const client = new Redis(redisUrl, { maxRetriesPerRequest: null });
    try {
      const pong = await client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    } finally {
      await client.quit();
    }
  }
}
