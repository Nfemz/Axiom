import type { ToolDefinition, ToolResult } from "./registry.js";

type ComputerAction = "screenshot" | "click" | "type" | "key" | "move";

function log(
  level: string,
  msg: string,
  extra?: Record<string, unknown>
): void {
  console.log(JSON.stringify({ level, msg, tool: "computer_use", ...extra }));
}

// Computer-use actions are performed via the E2B desktop sandbox.
// The actual implementation depends on the E2B desktop SDK being available
// in the sandbox environment. These are placeholder implementations that
// will be wired to the real SDK when running inside an E2B sandbox.

async function captureScreenshot(): Promise<ToolResult> {
  log("info", "Screenshot captured (placeholder)");
  return { success: true, output: { base64: "", mimeType: "image/png" } };
}

async function clickAt(x: number, y: number): Promise<ToolResult> {
  log("info", "Clicked", { x, y });
  return { success: true, output: `Clicked at (${x}, ${y})` };
}

async function typeText(text: string): Promise<ToolResult> {
  log("info", "Typed text", { length: text.length });
  return { success: true, output: `Typed ${text.length} characters` };
}

async function pressKey(key: string): Promise<ToolResult> {
  log("info", "Key pressed", { key });
  return { success: true, output: `Pressed key: ${key}` };
}

async function moveMouse(x: number, y: number): Promise<ToolResult> {
  log("info", "Mouse moved", { x, y });
  return { success: true, output: `Moved mouse to (${x}, ${y})` };
}

export function createComputerUseTool(): ToolDefinition {
  return {
    name: "computer_use",
    description:
      "Interact with the desktop at the pixel level — take screenshots, click at coordinates, type text, press keys, and move the mouse.",
    tier: "pixel",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["screenshot", "click", "type", "key", "move"],
        },
        x: { type: "number" },
        y: { type: "number" },
        text: { type: "string" },
        key: { type: "string" },
      },
      required: ["action"],
    },
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complex tool dispatch logic
    async execute(input: Record<string, unknown>): Promise<ToolResult> {
      const action = input.action as ComputerAction;
      const x = input.x as number | undefined;
      const y = input.y as number | undefined;
      const text = input.text as string | undefined;
      const key = input.key as string | undefined;

      try {
        switch (action) {
          case "screenshot":
            return captureScreenshot();
          case "click":
            if (x === undefined || y === undefined) {
              return {
                success: false,
                output: null,
                error: "x and y required",
              };
            }
            return clickAt(x, y);
          case "type":
            if (!text) {
              return { success: false, output: null, error: "text required" };
            }
            return typeText(text);
          case "key":
            if (!key) {
              return { success: false, output: null, error: "key required" };
            }
            return pressKey(key);
          case "move":
            if (x === undefined || y === undefined) {
              return {
                success: false,
                output: null,
                error: "x and y required",
              };
            }
            return moveMouse(x, y);
          default:
            return {
              success: false,
              output: null,
              error: `Unknown action: ${action as string}`,
            };
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log("error", "Computer action failed", { action, error });
        return { success: false, output: null, error };
      }
    },
  };
}
