import type { AgentComms } from './redis-client.js';

export interface AgentState {
  paused: boolean;
  terminated: boolean;
  currentDirective: string | null;
}

export function createInitialState(): AgentState {
  return {
    paused: false,
    terminated: false,
    currentDirective: null,
  };
}

function log(message: string, data?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    component: 'message-handler',
    message,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

interface MessagePayload {
  type?: string;
  directive?: string;
  [key: string]: unknown;
}

function parsePayload(raw: string): MessagePayload {
  try {
    return JSON.parse(raw) as MessagePayload;
  } catch {
    return {};
  }
}

function handleMessage(payload: MessagePayload, state: AgentState): void {
  const type = payload.type;

  switch (type) {
    case 'pause':
      state.paused = true;
      log('Agent paused');
      break;

    case 'resume':
      state.paused = false;
      log('Agent resumed');
      break;

    case 'terminate':
      state.terminated = true;
      log('Agent terminated');
      break;

    case 'resteer':
      state.currentDirective = payload.directive ?? null;
      log('Agent resteered', { directive: state.currentDirective });
      break;

    case 'integrity-check':
      log('Integrity check received (placeholder)');
      break;

    default:
      log('Unknown message type', { type });
      break;
  }
}

export function startMessageHandler(
  comms: AgentComms,
  state: AgentState,
): { poll: () => Promise<void>; stop: () => void } {
  let running = true;

  const poll = async (): Promise<void> => {
    while (running && !state.terminated) {
      try {
        const messages = await comms.readMessages(10);

        for (const message of messages) {
          const payload = parsePayload(message.data.payload ?? '{}');
          handleMessage(payload, state);
          await comms.acknowledge(message.id);
        }
      } catch (err) {
        log('Error polling messages', { error: String(err) });
      }
    }
  };

  const stop = (): void => {
    running = false;
  };

  // Start polling in the background
  void poll();

  return { poll, stop };
}
