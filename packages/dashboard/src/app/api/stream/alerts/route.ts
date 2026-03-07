import { createSSEResponse } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET() {
  return createSSEResponse((send) => {
    const interval = setInterval(() => {
      send({
        type: "alert:heartbeat",
        payload: {},
        timestamp: new Date().toISOString(),
      });
    }, 30000);

    return () => clearInterval(interval);
  });
}
