import { requireAuth } from "@/lib/auth-middleware";
import { createSSEResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  return createSSEResponse((send) => {
    // TODO: Subscribe to Redis cost:update and cost:alert events
    const interval = setInterval(() => {
      send({
        type: "cost:heartbeat",
        payload: {},
        timestamp: new Date().toISOString(),
      });
    }, 30000);

    return () => clearInterval(interval);
  });
}
