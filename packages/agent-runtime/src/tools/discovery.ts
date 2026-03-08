// ---------------------------------------------------------------------------
// Axiom Agent Runtime – Tool/API/MCP Discovery (T125)
// ---------------------------------------------------------------------------
// Discovers and integrates external tools from npm, APIs, and MCP servers.
// Runs in E2B sandbox — no @axiom/shared imports.
// ---------------------------------------------------------------------------

import type { ToolDefinition, ToolResult } from "./registry.js";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ToolSource {
  description: string;
  name: string;
  source: string;
  type: "npm" | "api" | "mcp";
}

// ── Built-in Tool Registry ───────────────────────────────────────────────

const KNOWN_TOOLS: ToolSource[] = [
  {
    name: "web-browser",
    source: "puppeteer",
    type: "npm",
    description: "Browse and interact with web pages",
  },
  {
    name: "file-manager",
    source: "fs-extra",
    type: "npm",
    description: "Read, write, and manage files",
  },
  {
    name: "http-client",
    source: "axios",
    type: "npm",
    description: "Make HTTP requests to APIs",
  },
  {
    name: "code-runner",
    source: "@e2b/code-interpreter",
    type: "npm",
    description: "Execute code in sandboxed environments",
  },
  {
    name: "database-client",
    source: "pg",
    type: "npm",
    description: "Connect to and query PostgreSQL databases",
  },
  {
    name: "email-sender",
    source: "nodemailer",
    type: "npm",
    description: "Send emails via SMTP",
  },
  {
    name: "pdf-reader",
    source: "pdf-parse",
    type: "npm",
    description: "Extract text from PDF documents",
  },
  {
    name: "image-gen",
    source: "openai",
    type: "api",
    description: "Generate images using AI models",
  },
  {
    name: "web-search",
    source: "tavily",
    type: "api",
    description: "Search the web for information",
  },
  {
    name: "speech-to-text",
    source: "whisper",
    type: "api",
    description: "Transcribe audio to text",
  },
];

// ── Discovery ───────────────────────────────────────────────────────────────

/**
 * Search for available tools matching the given query.
 * Searches the built-in registry using keyword matching.
 */
const WHITESPACE_RE = /\s+/;

export async function discoverTools(query: string): Promise<ToolSource[]> {
  if (!query.trim()) {
    return [];
  }

  const terms = query.toLowerCase().split(WHITESPACE_RE);

  return KNOWN_TOOLS.filter((tool) => {
    const searchable =
      `${tool.name} ${tool.description} ${tool.source}`.toLowerCase();
    return terms.some((term) => searchable.includes(term));
  });
}

// ── Integration ─────────────────────────────────────────────────────────────

async function executeNpmTool(
  source: ToolSource,
  input: Record<string, unknown>
): Promise<ToolResult> {
  try {
    const mod = await import(source.source);
    const fn = mod.default ?? mod;
    const result = await (typeof fn === "function" ? fn(input.input) : null);
    return { success: true, output: result };
  } catch (err) {
    return {
      success: false,
      output: null,
      error: `npm tool "${source.name}": ${String(err)}`,
    };
  }
}

async function executeApiTool(
  source: ToolSource,
  _input: Record<string, unknown>
): Promise<ToolResult> {
  const apiKey = process.env[`${source.source.toUpperCase()}_API_KEY`];
  if (!apiKey) {
    return {
      success: false,
      output: null,
      error: `No API key configured for ${source.source} (set ${source.source.toUpperCase()}_API_KEY)`,
    };
  }
  return {
    success: false,
    output: null,
    error: `API tool "${source.name}" requires provider-specific integration`,
  };
}

async function executeMcpTool(
  source: ToolSource,
  _input: Record<string, unknown>
): Promise<ToolResult> {
  const serverUrl =
    process.env[
      `MCP_SERVER_${source.source.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`
    ];
  if (!serverUrl) {
    return {
      success: false,
      output: null,
      error: `No MCP server URL configured for ${source.source}`,
    };
  }
  return {
    success: false,
    output: null,
    error: `MCP tool "${source.name}" requires MCP client connection`,
  };
}

const EXECUTORS: Record<
  ToolSource["type"],
  (source: ToolSource, input: Record<string, unknown>) => Promise<ToolResult>
> = {
  npm: executeNpmTool,
  api: executeApiTool,
  mcp: executeMcpTool,
};

/**
 * Create a ToolDefinition from a discovered ToolSource.
 * Routes execution to the appropriate handler based on source type.
 */
export function integrateDiscoveredTool(source: ToolSource): ToolDefinition {
  return {
    name: source.name,
    description: `[${source.type}] ${source.description} (source: ${source.source})`,
    tier: "api",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input for the discovered tool" },
      },
    },
    execute: (input: Record<string, unknown>): Promise<ToolResult> => {
      return EXECUTORS[source.type](source, input);
    },
  };
}

// ── Discovery Tool ──────────────────────────────────────────────────────────

/**
 * Returns a ToolDefinition that agents can invoke to discover new tools.
 */
export function createDiscoveryTool(): ToolDefinition {
  return {
    name: "discover_tools",
    description:
      "Search for available tools, APIs, and MCP servers that can be integrated at runtime.",
    tier: "api",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for tool discovery",
        },
      },
      required: ["query"],
    },
    execute: async (input: Record<string, unknown>): Promise<ToolResult> => {
      const query = typeof input.query === "string" ? input.query : "";

      if (!query) {
        return { success: false, output: null, error: "Query is required" };
      }

      const sources = await discoverTools(query);

      return {
        success: true,
        output: {
          query,
          results: sources,
          total: sources.length,
        },
      };
    },
  };
}
