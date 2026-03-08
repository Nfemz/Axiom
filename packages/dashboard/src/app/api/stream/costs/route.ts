import { createSSEResponse } from "@/lib/sse";
import Redis from "ioredis";

export const dynamic = "force-dynamic";

export async function GET() {
  return createSSEResponse((send) => {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    const subscriber = new Redis(redisUrl);

    subscriber.subscribe("cost:update", "cost:alert").catch(() => {});

    subscriber.on("message", (_channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        send({
          type: data.type ?? "cost:update",
          payload: data,
          timestamp: new Date().toISOString(),
        });
      } catch {}
    });

    const interval = setInterval(() => {
      send({
        type: "cost:heartbeat",
        payload: {},
        timestamp: new Date().toISOString(),
      });
    }, 30000);

    return () => {
      clearInterval(interval);
      subscriber.disconnect();
    };
  });
}
