import { Sandbox } from "e2b";
import { createLogger } from "@axiom/shared";

const log = createLogger("sandbox");

export interface CreateSandboxOptions {
  template?: string;
  envVars?: Record<string, string>;
  contextFiles?: Array<{ path: string; content: string }>;
  timeoutMs?: number;
}

export interface SandboxInfo {
  sandboxId: string;
  sandbox: Sandbox;
}

export async function createSandbox(
  options: CreateSandboxOptions,
): Promise<SandboxInfo> {
  const { template, envVars, contextFiles, timeoutMs } = options;

  log.info("Creating sandbox", { template, timeoutMs });

  try {
    const sandbox = await Sandbox.create(template ?? "base", {
      envs: envVars,
      timeoutMs,
    });

    if (contextFiles && contextFiles.length > 0) {
      log.info("Injecting context files", { count: contextFiles.length });
      await Promise.all(
        contextFiles.map((file) =>
          sandbox.files.write(file.path, file.content),
        ),
      );
    }

    const sandboxId = sandbox.sandboxId;
    log.info("Sandbox created", { sandboxId });

    return { sandboxId, sandbox };
  } catch (error) {
    log.error("Failed to create sandbox", {
      template,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function connectToSandbox(sandboxId: string): Promise<Sandbox> {
  log.info("Connecting to sandbox", { sandboxId });

  try {
    const sandbox = await Sandbox.connect(sandboxId);
    log.info("Connected to sandbox", { sandboxId });
    return sandbox;
  } catch (error) {
    log.error("Failed to connect to sandbox", {
      sandboxId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function pauseSandbox(sandboxId: string): Promise<void> {
  log.info("Pausing sandbox", { sandboxId });

  try {
    const sandbox = await Sandbox.connect(sandboxId);
    await sandbox.pause();
    log.info("Sandbox paused", { sandboxId });
  } catch (error) {
    log.error("Failed to pause sandbox", {
      sandboxId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function resumeSandbox(sandboxId: string): Promise<Sandbox> {
  log.info("Resuming sandbox", { sandboxId });

  try {
    const sandbox = await Sandbox.connect(sandboxId);
    log.info("Sandbox resumed", { sandboxId });
    return sandbox;
  } catch (error) {
    log.error("Failed to resume sandbox", {
      sandboxId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function killSandbox(sandboxId: string): Promise<void> {
  log.info("Killing sandbox", { sandboxId });

  try {
    const sandbox = await Sandbox.connect(sandboxId);
    await sandbox.kill();
    log.info("Sandbox killed", { sandboxId });
  } catch (error) {
    log.error("Failed to kill sandbox", {
      sandboxId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
