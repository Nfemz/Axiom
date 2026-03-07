import { chromium, type Browser, type Page } from "playwright";
import type { ToolDefinition, ToolResult } from "./registry.js";

type BrowserAction = "navigate" | "click" | "fill" | "extract" | "screenshot";

function log(level: string, msg: string, extra?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level, msg, tool: "browser", ...extra }));
}

let browserInstance: Browser | null = null;
let pageInstance: Page | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    log("info", "Launching browser");
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

async function getPage(): Promise<Page> {
  if (!pageInstance || pageInstance.isClosed()) {
    const browser = await getBrowser();
    const context = await browser.newContext();
    pageInstance = await context.newPage();
  }
  return pageInstance;
}

async function navigate(url: string): Promise<ToolResult> {
  const page = await getPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const title = await page.title();

  log("info", "Navigated", { url, title });
  return { success: true, output: { url, title } };
}

async function click(selector: string): Promise<ToolResult> {
  const page = await getPage();
  await page.click(selector);

  log("info", "Clicked element", { selector });
  return { success: true, output: `Clicked: ${selector}` };
}

async function fill(selector: string, value: string): Promise<ToolResult> {
  const page = await getPage();
  await page.fill(selector, value);

  log("info", "Filled element", { selector });
  return { success: true, output: `Filled: ${selector}` };
}

async function extract(selector: string): Promise<ToolResult> {
  const page = await getPage();
  const element = await page.$(selector);

  if (!element) {
    return { success: false, output: null, error: `Element not found: ${selector}` };
  }

  const text = await element.textContent();

  log("info", "Extracted text", { selector, length: text?.length ?? 0 });
  return { success: true, output: text };
}

async function screenshot(): Promise<ToolResult> {
  const page = await getPage();
  const buffer = await page.screenshot({ type: "png", fullPage: false });
  const base64 = buffer.toString("base64");

  log("info", "Screenshot captured", { size: base64.length });
  return { success: true, output: { base64, mimeType: "image/png" } };
}

export function createBrowserTool(): ToolDefinition {
  return {
    name: "browser",
    description:
      "Automate a headless Chromium browser — navigate pages, click elements, fill forms, extract text, and take screenshots.",
    tier: "headless",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["navigate", "click", "fill", "extract", "screenshot"],
          description: "The browser action to perform.",
        },
        url: {
          type: "string",
          description: "URL to navigate to (required for navigate action).",
        },
        selector: {
          type: "string",
          description: "CSS selector for the target element (required for click, fill, extract).",
        },
        value: {
          type: "string",
          description: "Value to fill into the element (required for fill action).",
        },
      },
      required: ["action"],
    },
    async execute(input: Record<string, unknown>): Promise<ToolResult> {
      const action = input.action as BrowserAction;
      const url = input.url as string | undefined;
      const selector = input.selector as string | undefined;
      const value = input.value as string | undefined;

      if (!action) {
        return { success: false, output: null, error: "action is required" };
      }

      log("info", "Executing browser action", { action });

      try {
        switch (action) {
          case "navigate": {
            if (!url) {
              return { success: false, output: null, error: "url is required for navigate action" };
            }
            return navigate(url);
          }

          case "click": {
            if (!selector) {
              return { success: false, output: null, error: "selector is required for click action" };
            }
            return click(selector);
          }

          case "fill": {
            if (!selector || value === undefined) {
              return {
                success: false,
                output: null,
                error: "selector and value are required for fill action",
              };
            }
            return fill(selector, value);
          }

          case "extract": {
            if (!selector) {
              return { success: false, output: null, error: "selector is required for extract action" };
            }
            return extract(selector);
          }

          case "screenshot":
            return screenshot();

          default:
            return {
              success: false,
              output: null,
              error: `Unknown action: ${action as string}`,
            };
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        log("error", "Browser action failed", { action, error });
        return { success: false, output: null, error };
      }
    },
  };
}
