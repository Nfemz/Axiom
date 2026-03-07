import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";

export const QUEUE_NAMES = {
  AGENT_SPAWN: "agent:spawn",
  AGENT_RESULTS: "agent:results",
  HEARTBEAT: "heartbeat",
  BACKUP: "backup",
  MEMORY_CONSOLIDATION: "memory:consolidation",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();

export function createQueue(name: QueueName, connection: ConnectionOptions): Queue {
  if (queues.has(name)) return queues.get(name)!;
  const queue = new Queue(name, { connection });
  queues.set(name, queue);
  return queue;
}

export function createWorker<T = unknown>(
  name: QueueName,
  processor: (job: Job<T>) => Promise<unknown>,
  connection: ConnectionOptions,
  concurrency: number = 1,
): Worker {
  const worker = new Worker(name, processor, { connection, concurrency });
  workers.set(name, worker);
  return worker;
}

export function getQueue(name: QueueName): Queue | undefined {
  return queues.get(name);
}

export async function closeAllQueues() {
  for (const queue of queues.values()) {
    await queue.close();
  }
  for (const worker of workers.values()) {
    await worker.close();
  }
  queues.clear();
  workers.clear();
}
