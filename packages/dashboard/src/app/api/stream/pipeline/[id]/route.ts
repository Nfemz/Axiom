import { requireAuth } from "@/lib/auth-middleware";
import { createSSEResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  return createSSEResponse((send) => {
    // TODO: Subscribe to Redis pipeline:{id} events
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

    return () => clearInterval(interval);
  });
}
