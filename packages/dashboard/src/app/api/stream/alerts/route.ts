import Redis from "ioredis";
import { requireAuth } from "@/lib/auth-middleware";
import { createSSEResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  return createSSEResponse((send) => {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    const subscriber = new Redis(redisUrl);

    subscriber.subscribe("alert:new", "alert:resolved").catch(() => {
      /* ignore subscribe errors */
    });

    subscriber.on("message", (_channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        send({
          type: data.type ?? "alert:update",
          payload: data,
          timestamp: new Date().toISOString(),
        });
      } catch {
        /* ignore parse errors */
      }
    });

    const interval = setInterval(() => {
      send({
        type: "alert:heartbeat",
        payload: {},
        timestamp: new Date().toISOString(),
      });
    }, 30_000);

    return () => {
      clearInterval(interval);
      subscriber.disconnect();
    };
  });
}
