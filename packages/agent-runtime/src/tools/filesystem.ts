import fs from "node:fs";
import path from "node:path";
import type { ToolDefinition, ToolResult } from "./registry.js";

type FsAction = "read" | "write" | "list" | "search";

function log(level: string, msg: string, extra?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level, msg, tool: "filesystem", ...extra }));
}

function readFile(filePath: string): ToolResult {
  const content = fs.readFileSync(filePath, "utf-8");
  return { success: true, output: content };
}

function writeFile(filePath: string, content: string): ToolResult {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, "utf-8");
  return { success: true, output: `File written: ${filePath}` };
}

function listDirectory(dirPath: string): ToolResult {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  const items = entries.map((entry) => ({
    name: entry.name,
    type: entry.isDirectory() ? "directory" : "file",
  }));

  return { success: true, output: items };
}

function searchFiles(
  dirPath: string,
  pattern: string,
  matches: string[] = [],
  depth = 0,
): string[] {
  if (depth > 10) return matches;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      searchFiles(fullPath, pattern, matches, depth + 1);
    } else if (entry.name.includes(pattern)) {
      matches.push(fullPath);
    }
  }

  return matches;
}

export function createFilesystemTool(): ToolDefinition {
  return {
    name: "filesystem",
    description: "Read, write, list, and search files in the sandbox file system.",
    tier: "headless",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["read", "write", "list", "search"],
          description: "The file system operation to perform.",
        },
        path: {
          type: "string",
          description: "The file or directory path to operate on.",
        },
        content: {
          type: "string",
          description: "Content to write (required for write action).",
        },
        pattern: {
          type: "string",
          description: "Search pattern to match file names against (required for search action).",
        },
      },
      required: ["action", "path"],
    },
    async execute(input: Record<string, unknown>): Promise<ToolResult> {
      const action = input.action as FsAction;
      const filePath = input.path as string;
      const content = input.content as string | undefined;
      const pattern = input.pattern as string | undefined;

      if (!action || !filePath) {
        return { success: false, output: null, error: "action and path are required" };
      }

      log("info", "Executing filesystem operation", { action, path: filePath });

      try {
        switch (action) {
          case "read":
            return readFile(filePath);

          case "write": {
            if (content === undefined) {
              return { success: false, output: null, error: "content is required for write action" };
            }
            return writeFile(filePath, content);
          }

          case "list":
            return listDirectory(filePath);

          case "search": {
            if (!pattern) {
              return { success: false, output: null, error: "pattern is required for search action" };
            }
            const matches = searchFiles(filePath, pattern);
            log("info", "Search complete", { matches: matches.length });
            return { success: true, output: matches };
          }

          default:
            return {
              success: false,
              output: null,
              error: `Unknown action: ${action as string}. Must be read, write, list, or search.`,
            };
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log("error", "Filesystem operation failed", { action, path: filePath, error });
        return { success: false, output: null, error };
      }
    },
  };
}
