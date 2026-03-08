// ---------------------------------------------------------------------------
// Axiom Orchestrator – Database Backup Service (T131)
// ---------------------------------------------------------------------------
// Automated daily backup via pg_dump, with retention pruning and integrity
// verification.
// ---------------------------------------------------------------------------

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, stat, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createLogger, DEFAULT_BACKUP_RETENTION_DAYS } from "@axiom/shared";
import type { ConnectionOptions } from "bullmq";
import { createQueue, createWorker, QUEUE_NAMES } from "../comms/queues.js";

const execFileAsync = promisify(execFile);
const log = createLogger("db-backup");

// ── Types ───────────────────────────────────────────────────────────────────

export interface BackupConfig {
  connectionString: string;
  outputDir: string;
}

export interface BackupInfo {
  filename: string;
  path: string;
  createdAt: Date;
  sizeBytes: number;
}

// ── Create Backup ───────────────────────────────────────────────────────────

export async function createBackup(config: BackupConfig): Promise<string> {
  await mkdir(config.outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `axiom-backup-${timestamp}.sql`;
  const outputPath = join(config.outputDir, filename);

  log.info("Starting database backup", { outputPath });

  await execFileAsync("pg_dump", [config.connectionString, "-f", outputPath]);

  log.info("Database backup completed", { outputPath });
  return outputPath;
}

// ── List Backups ────────────────────────────────────────────────────────────

export async function listBackups(outputDir: string): Promise<BackupInfo[]> {
  let entries: string[];
  try {
    entries = await readdir(outputDir);
  } catch {
    return [];
  }

  const backupFiles = entries.filter(
    (f) => f.startsWith("axiom-backup-") && f.endsWith(".sql"),
  );

  const infos: BackupInfo[] = [];
  for (const filename of backupFiles) {
    const filePath = join(outputDir, filename);
    const fileStat = await stat(filePath);
    infos.push({
      filename,
      path: filePath,
      createdAt: fileStat.birthtime,
      sizeBytes: fileStat.size,
    });
  }

  infos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return infos;
}

// ── Prune Old Backups ───────────────────────────────────────────────────────

export async function pruneOldBackups(
  outputDir: string,
  retentionDays: number = DEFAULT_BACKUP_RETENTION_DAYS,
): Promise<number> {
  const backups = await listBackups(outputDir);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  let pruned = 0;
  for (const backup of backups) {
    if (backup.createdAt < cutoff) {
      await unlink(backup.path);
      pruned++;
      log.info("Pruned old backup", { filename: backup.filename });
    }
  }

  log.info("Backup pruning complete", { pruned, retentionDays });
  return pruned;
}

// ── Verify Backup ───────────────────────────────────────────────────────────

export async function verifyBackup(backupPath: string): Promise<boolean> {
  try {
    const fileStat = await stat(backupPath);

    if (fileStat.size === 0) {
      log.warn("Backup file is empty", { backupPath });
      return false;
    }

    log.info("Backup verified", {
      backupPath,
      sizeBytes: fileStat.size,
    });
    return true;
  } catch {
    log.warn("Backup file not found or inaccessible", { backupPath });
    return false;
  }
}

// ── Backup Scheduler ───────────────────────────────────────────────────────

export async function scheduleBackupJobs(
  config: BackupConfig,
  connection: ConnectionOptions,
): Promise<void> {
  const queue = createQueue(QUEUE_NAMES.BACKUP, connection);

  // Daily backup at 2 AM UTC
  await queue.upsertJobScheduler("daily-backup", {
    pattern: "0 2 * * *",
  }, {
    name: "daily-backup",
    data: { type: "backup" },
  });

  // Weekly verification on Sundays at 4 AM UTC
  await queue.upsertJobScheduler("weekly-verify", {
    pattern: "0 4 * * 0",
  }, {
    name: "weekly-verify",
    data: { type: "verify" },
  });

  createWorker(
    QUEUE_NAMES.BACKUP,
    async (job: { data: { type: string } }) => {
      if (job.data.type === "backup") {
        const backupPath = await createBackup(config);
        await pruneOldBackups(config.outputDir);
        log.info("Scheduled backup completed", { backupPath });
      } else if (job.data.type === "verify") {
        const backups = await listBackups(config.outputDir);
        if (backups.length > 0) {
          const valid = await verifyBackup(backups[0].path);
          log.info("Scheduled backup verification", { valid, backup: backups[0].filename });
        }
      }
    },
    connection,
  );

  log.info("Backup jobs scheduled");
}
