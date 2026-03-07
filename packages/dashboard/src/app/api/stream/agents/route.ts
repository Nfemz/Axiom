import { createSSEResponse, type SSEEvent } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET() {
  return createSSEResponse((send) => {
    // TODO: Subscribe to Redis pub/sub for agent events
    // For now, send a keepalive every 30 seconds
    const interval = setInterval(() => {
      send({
        type: "keepalive",
        payload: { id: "system" },
        timestamp: new Date().toISOString(),
      });
    }, 30000);

    return () => clearInterval(interval);
  });
}
