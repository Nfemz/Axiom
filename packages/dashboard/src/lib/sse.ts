import { NextResponse } from "next/server";
import { requireAuth } from "./auth-middleware";

export const dynamic = "force-dynamic";

export interface SSEEvent {
  payload: Record<string, unknown>;
  timestamp: string;
  type: string;
}

/**
 * Create an SSE response stream with auth check.
 * The `emitter` callback receives a `send` function to push events.
 * Return a cleanup function from emitter if needed.
 */
export async function createSSEResponse(
  emitter: (send: (event: SSEEvent) => void) => (() => void) | undefined
): Promise<Response> {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: SSEEvent) => {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      // Send initial keepalive
      controller.enqueue(encoder.encode(": connected\n\n"));

      cleanup = emitter(send);
    },
    cancel() {
      cleanup?.();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
