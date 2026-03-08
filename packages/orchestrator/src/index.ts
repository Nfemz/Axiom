import { createServer } from "node:http";
import { createLogger } from "@axiom/shared";
import { closeAllQueues } from "./comms/queues.js";
import { closeRedis, getRedis } from "./comms/redis.js";
import { loadConfig } from "./config.js";
import { closeDb, getDb } from "./db/drizzle.js";
import { handleHealthCheck } from "./health/handler.js";

const log = createLogger("orchestrator");

async function start() {
  log.info("Starting Axiom Orchestrator...");

  const config = loadConfig();
  log.info("Configuration loaded", { env: config.NODE_ENV });

  // Initialize database
  getDb(config.DATABASE_URL, config.DATABASE_SSL);
  log.info("Database connected");

  // Initialize Redis
  const redis = getRedis(config.REDIS_URL, config.REDIS_TLS);
  await redis.ping();
  log.info("Redis connected");

  // Start HTTP server for health endpoint
  const server = createServer(async (req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      await handleHealthCheck(req, res);
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  });

  server.listen(config.ORCHESTRATOR_PORT, () => {
    log.info(`Health endpoint listening on port ${config.ORCHESTRATOR_PORT}`);
  });

  log.info("Axiom Orchestrator started successfully");

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log.info(`Received ${signal}, shutting down gracefully...`);

    server.close(() => {
      log.info("HTTP server closed");
    });

    await closeAllQueues();
    log.info("BullMQ queues closed");

    await closeRedis();
    log.info("Redis connections closed");

    await closeDb();
    log.info("Database connection closed");

    log.info("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  log.error("Failed to start orchestrator", { error: String(err) });
  process.exit(1);
});
