import type { AgentComms } from '../comms/redis-client.js';

export interface MemoryEntry {
  content: string;
  memoryType: 'fact' | 'decision' | 'preference' | 'reflection' | 'consolidation';
  tags: string[];
  importanceScore: number;
}

export interface MemoryOps {
  write(entry: MemoryEntry): Promise<void>;
  read(query: string, limit?: number): Promise<MemoryEntry[]>;
  recall(tags: string[]): Promise<MemoryEntry[]>;
}

interface PendingRequest {
  resolve: (entries: MemoryEntry[]) => void;
  reject: (error: Error) => void;
}

export function createMemoryOps(comms: AgentComms, agentId: string): MemoryOps {
  const pendingRequests = new Map<string, PendingRequest>();

  const write = async (entry: MemoryEntry): Promise<void> => {
    await comms.sendToOrchestrator({
      type: 'memory-write',
      agentId,
      entry,
    });
  };

  const read = async (query: string, limit: number = 10): Promise<MemoryEntry[]> => {
    const requestId = crypto.randomUUID();

    const promise = new Promise<MemoryEntry[]>((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject });
    });

    await comms.sendToOrchestrator({
      type: 'memory-read',
      agentId,
      requestId,
      query,
      limit,
    });

    // For now, resolve immediately with empty results
    // Orchestrator-side handling comes in T058
    const pending = pendingRequests.get(requestId);
    if (pending) {
      pending.resolve([]);
      pendingRequests.delete(requestId);
    }

    return promise;
  };

  const recall = async (tags: string[], limit: number = 10): Promise<MemoryEntry[]> => {
    const requestId = crypto.randomUUID();

    const promise = new Promise<MemoryEntry[]>((resolve, reject) => {
      pendingRequests.set(requestId, { resolve, reject });
    });

    await comms.sendToOrchestrator({
      type: 'memory-recall',
      agentId,
      requestId,
      tags,
      limit,
    });

    // For now, resolve immediately with empty results
    const pending = pendingRequests.get(requestId);
    if (pending) {
      pending.resolve([]);
      pendingRequests.delete(requestId);
    }

    return promise;
  };

  return { write, read, recall };
}
