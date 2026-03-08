export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && env in LOG_LEVEL_PRIORITY) {
    return env as LogLevel;
  }
  return "info";
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getMinLevel()];
}

function emit(
  level: LogLevel,
  message: string,
  context: string,
  meta?: Record<string, unknown>
): void {
  if (!shouldLog(level)) {
    return;
  }

  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  if (meta && Object.keys(meta).length > 0) {
    entry.meta = meta;
  }

  const serialized = JSON.stringify(entry);

  switch (level) {
    case "debug":
    case "info":
      console.log(serialized);
      break;
    case "warn":
      console.warn(serialized);
      break;
    case "error":
      console.error(serialized);
      break;
    default:
      console.log(serialized);
      break;
  }
}

export function createLogger(context: string): Logger {
  return {
    debug: (message, meta?) => emit("debug", message, context, meta),
    info: (message, meta?) => emit("info", message, context, meta),
    warn: (message, meta?) => emit("warn", message, context, meta),
    error: (message, meta?) => emit("error", message, context, meta),
  };
}
