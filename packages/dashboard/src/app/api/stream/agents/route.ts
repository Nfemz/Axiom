import { createSSEResponse, type SSEEvent } from "@/lib/sse";
import { requireAuth } from "@/lib/auth-middleware";
import Redis from "ioredis";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  return createSSEResponse((send) => {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    const subscriber = new Redis(redisUrl);

    subscriber.subscribe("agent:status", "agent:progress", "agent:error").catch(() => {
      // Redis not available — fall back to keepalive only
    });

    subscriber.on("message", (_channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        send({
          type: data.type ?? "agent:update",
          payload: data,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Skip malformed messages
      }
    });

    const interval = setInterval(() => {
      send({
        type: "keepalive",
        payload: { id: "system" },
        timestamp: new Date().toISOString(),
      });
    }, 30000);

    return () => {
      clearInterval(interval);
      subscriber.disconnect();
    };
  });
}
