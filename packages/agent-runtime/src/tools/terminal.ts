import { exec } from "node:child_process";
import type { ToolDefinition, ToolResult } from "./registry.js";

const DEFAULT_TIMEOUT_MS = 30_000;

function log(
  level: string,
  msg: string,
  extra?: Record<string, unknown>
): void {
  console.log(JSON.stringify({ level, msg, tool: "terminal", ...extra }));
}

async function executeCommand(
  command: string,
  cwd?: string,
  timeoutMs?: number
): Promise<ToolResult> {
  const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise<ToolResult>((resolve) => {
    // NOTE: exec() is intentional here — this tool runs arbitrary agent commands
    // inside an E2B sandbox. Shell features (pipes, redirects, etc.) are required.
    const child = exec(
      command,
      { cwd, timeout, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          log("warn", "Command failed", {
            command,
            exitCode: error.code,
          });

          resolve({
            success: false,
            output: stdout || null,
            error: stderr || error.message,
          });
          return;
        }

        log("info", "Command succeeded", { command });

        resolve({
          success: true,
          output: stdout,
          error: stderr || undefined,
        });
      }
    );

    child.on("error", (err) => {
      log("error", "Command spawn error", { command, error: err.message });

      resolve({
        success: false,
        output: null,
        error: err.message,
      });
    });
  });
}

export function createTerminalTool(): ToolDefinition {
  return {
    name: "terminal",
    description:
      "Run shell commands, install packages, and manage processes in the sandbox environment.",
    tier: "headless",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The shell command to execute.",
        },
        cwd: {
          type: "string",
          description:
            "Working directory for the command. Defaults to the sandbox root.",
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds. Defaults to 30000.",
        },
      },
      required: ["command"],
    },
    async execute(input: Record<string, unknown>): Promise<ToolResult> {
      const command = input.command as string;
      const cwd = input.cwd as string | undefined;
      const timeout = input.timeout as number | undefined;

      if (!command || typeof command !== "string") {
        return {
          success: false,
          output: null,
          error: "command is required and must be a string",
        };
      }

      log("info", "Executing command", { command, cwd, timeout });

      return executeCommand(command, cwd, timeout);
    },
  };
}
