import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, JobsOptions } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection?: Redis;
  private readonly queues = new Map<string, Queue>();
  private readonly workers: Worker[] = [];

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return;
    }

    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.createQueue('notifications');
    this.createQueue('escalations');
    this.createQueue('alert-processing');

    this.registerWorkers();
  }

  private createQueue(name: string) {
    if (!this.connection) {
      return;
    }
    const queue = new Queue(name, { connection: this.connection });
    this.queues.set(name, queue);
  }

  private registerWorkers() {
    if (!this.connection) {
      return;
    }

    const register = (queueName: string) => {
      const worker = new Worker(
        queueName,
        async (job) => {
          // Placeholder processors; replaced in later phases.
          return { id: job.id, processedAt: new Date().toISOString() };
        },
        { connection: this.connection, concurrency: 5 },
      );
      this.workers.push(worker);
    };

    register('notifications');
    register('escalations');
    register('alert-processing');
  }

  async addJob(queueName: string, name: string, data: unknown, opts?: JobsOptions) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not configured: ${queueName}`);
    }
    return queue.add(name, data, { attempts: 3, ...opts });
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all(Array.from(this.queues.values()).map((queue) => queue.close()));
    if (this.connection) {
      await this.connection.quit();
    }
  }
}
