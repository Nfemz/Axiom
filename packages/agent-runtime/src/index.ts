import Redis from 'ioredis';
import { startRedisComms } from './comms/redis-client.js';
import { startMessageHandler, createInitialState } from './comms/message-handler.js';

function log(message: string, data?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    component: 'agent-runtime',
    message,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

async function main(): Promise<void> {
  const agentId = process.env.AGENT_ID;
  const redisUrl = process.env.REDIS_URL;

  if (!agentId) {
    throw new Error('AGENT_ID environment variable is required');
  }
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }

  log('Agent runtime starting', { agentId });

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  redis.on('error', (err) => {
    log('Redis connection error', { error: String(err) });
  });

  redis.on('connect', () => {
    log('Redis connected', { agentId });
  });

  const comms = await startRedisComms(redis, agentId);
  const state = createInitialState();
  const handler = startMessageHandler(comms, state);

  log('Agent runtime ready', { agentId });

  const shutdown = async (): Promise<void> => {
    log('Shutting down agent runtime', { agentId });
    handler.stop();
    comms.stopHeartbeat();
    await redis.quit();
    log('Agent runtime stopped', { agentId });
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

main().catch((err) => {
  log('Fatal error in agent runtime', { error: String(err) });
  process.exit(1);
});
