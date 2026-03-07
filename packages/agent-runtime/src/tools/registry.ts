export interface ToolResult {
  success: boolean;
  output: unknown;
  error?: string;
  duration?: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  tier: "api" | "headless" | "pixel";
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<ToolResult>;
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      console.log(
        JSON.stringify({
          level: "warn",
          msg: "Overwriting existing tool registration",
          tool: tool.name,
        }),
      );
    }

    this.tools.set(tool.name, tool);

    console.log(
      JSON.stringify({
        level: "info",
        msg: "Tool registered",
        tool: tool.name,
        tier: tool.tier,
      }),
    );
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  listByTier(tier: string): ToolDefinition[] {
    return [...this.tools.values()].filter((tool) => tool.tier === tier);
  }

  async execute(
    name: string,
    input: Record<string, unknown>,
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);

    if (!tool) {
      console.log(
        JSON.stringify({
          level: "error",
          msg: "Tool not found",
          tool: name,
        }),
      );

      return {
        success: false,
        output: null,
        error: `Tool "${name}" not found in registry`,
      };
    }

    const start = Date.now();

    try {
      const result = await tool.execute(input);
      const duration = Date.now() - start;

      console.log(
        JSON.stringify({
          level: "info",
          msg: "Tool executed",
          tool: name,
          success: result.success,
          duration,
        }),
      );

      return { ...result, duration };
    } catch (err) {
      const duration = Date.now() - start;
      const error = err instanceof Error ? err.message : String(err);

      console.log(
        JSON.stringify({
          level: "error",
          msg: "Tool execution failed",
          tool: name,
          error,
          duration,
        }),
      );

      return { success: false, output: null, error, duration };
    }
  }

  getToolDefinitions(): Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }));
  }
}
