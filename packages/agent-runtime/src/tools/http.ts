import type { ToolDefinition, ToolResult } from "./registry.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const DEFAULT_TIMEOUT_MS = 30_000;

function log(level: string, msg: string, extra?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level, msg, tool: "http", ...extra }));
}

async function makeRequest(
  method: HttpMethod,
  url: string,
  headers?: Record<string, string>,
  body?: unknown,
): Promise<ToolResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const requestInit: RequestInit = {
      method,
      headers: headers ?? {},
      signal: controller.signal,
    };

    if (body !== undefined && method !== "GET") {
      requestInit.body = typeof body === "string" ? body : JSON.stringify(body);

      if (!headers?.["Content-Type"] && !headers?.["content-type"]) {
        requestInit.headers = {
          "Content-Type": "application/json",
          ...requestInit.headers,
        };
      }
    }

    const response = await fetch(url, requestInit);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody: unknown;
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    log("info", "Request complete", {
      method,
      url,
      status: response.status,
    });

    return {
      success: response.ok,
      output: {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
      },
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createHttpTool(): ToolDefinition {
  return {
    name: "http",
    description:
      "Make HTTP requests to APIs — supports GET, POST, PUT, DELETE, and PATCH with custom headers and body.",
    tier: "api",
    inputSchema: {
      type: "object",
      properties: {
        method: {
          type: "string",
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          description: "The HTTP method to use.",
        },
        url: {
          type: "string",
          description: "The URL to send the request to.",
        },
        headers: {
          type: "object",
          additionalProperties: { type: "string" },
          description: "Optional request headers.",
        },
        body: {
          description:
            "Optional request body. Objects are JSON-serialized automatically. Ignored for GET requests.",
        },
      },
      required: ["method", "url"],
    },
    async execute(input: Record<string, unknown>): Promise<ToolResult> {
      const method = input.method as HttpMethod;
      const url = input.url as string;
      const headers = input.headers as Record<string, string> | undefined;
      const body = input.body;

      if (!method || !url) {
        return { success: false, output: null, error: "method and url are required" };
      }

      const validMethods: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      if (!validMethods.includes(method)) {
        return {
          success: false,
          output: null,
          error: `Invalid method: ${method}. Must be one of: ${validMethods.join(", ")}`,
        };
      }

      log("info", "Making HTTP request", { method, url });

      try {
        return await makeRequest(method, url, headers, body);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        const isTimeout = err instanceof DOMException && err.name === "AbortError";

        log("error", "HTTP request failed", { method, url, error });

        return {
          success: false,
          output: null,
          error: isTimeout ? `Request timed out after ${DEFAULT_TIMEOUT_MS}ms` : error,
        };
      }
    },
  };
}
