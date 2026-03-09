import Redis from "ioredis";
import { requireAuth } from "@/lib/auth-middleware";
import { createSSEResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const { id } = await params;

  return createSSEResponse((send) => {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    const subscriber = new Redis(redisUrl);

    subscriber.subscribe(`pipeline:${id}`).catch(() => {
      /* ignore subscribe errors */
    });

    subscriber.on("message", (_channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        send({
          type: data.type ?? "pipeline:update",
          payload: { ...data, pipelineId: id },
          timestamp: new Date().toISOString(),
        });
      } catch {
        /* ignore parse errors */
      }
    });

    send({
      type: "pipeline:connected",
      payload: { pipelineId: id },
      timestamp: new Date().toISOString(),
    });

    const interval = setInterval(() => {
      send({
        type: "pipeline:heartbeat",
        payload: { pipelineId: id },
        timestamp: new Date().toISOString(),
      });
    }, 30_000);

    return () => {
      clearInterval(interval);
      subscriber.disconnect();
    };
  });
}
