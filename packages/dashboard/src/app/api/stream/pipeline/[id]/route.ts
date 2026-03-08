import { createSSEResponse } from "@/lib/sse";
import Redis from "ioredis";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return createSSEResponse((send) => {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    const subscriber = new Redis(redisUrl);

    subscriber.subscribe(`pipeline:${id}`).catch(() => {});

    subscriber.on("message", (_channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        send({
          type: data.type ?? "pipeline:update",
          payload: { ...data, pipelineId: id },
          timestamp: new Date().toISOString(),
        });
      } catch {}
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
    }, 30000);

    return () => {
      clearInterval(interval);
      subscriber.disconnect();
    };
  });
}
