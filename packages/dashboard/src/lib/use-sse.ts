"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SSEEvent {
  payload: Record<string, unknown>;
  timestamp: string;
  type: string;
}

interface UseSSEResult {
  connected: boolean;
  data: SSEEvent | null;
  error: string | null;
}

/**
 * React hook that connects to an SSE endpoint and returns the latest event.
 * Auto-reconnects on disconnect with exponential backoff.
 */
export function useSSE(url: string): UseSSEResult {
  const [data, setData] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 10;

  const connect = useCallback(() => {
    const es = new EventSource(url, { withCredentials: true });

    es.onopen = () => {
      setConnected(true);
      setError(null);
      retryCount.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as SSEEvent;
        setData(parsed);
      } catch {
        // Ignore non-JSON messages (keepalive comments, etc.)
      }
    };

    es.onerror = () => {
      es.close();
      setConnected(false);

      if (retryCount.current < maxRetries) {
        const delay = Math.min(1000 * 2 ** retryCount.current, 30_000);
        retryCount.current++;
        setError(`Disconnected. Reconnecting in ${delay / 1000}s...`);
        setTimeout(connect, delay);
      } else {
        setError("Connection lost. Please refresh the page.");
      }
    };

    return es;
  }, [url]);

  useEffect(() => {
    const es = connect();
    return () => {
      es.close();
      setConnected(false);
    };
  }, [connect]);

  return { data, error, connected };
}
