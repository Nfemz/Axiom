import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import Redis from "ioredis";
import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

const BACKUP_DIR = process.env.BACKUP_DIR ?? "/var/lib/axiom/backups";
const BACKUP_QUEUE = "backup";

interface BackupInfo {
  createdAt: string;
  filename: string;
  path: string;
  sizeBytes: number;
}

async function listBackups(outputDir: string): Promise<BackupInfo[]> {
  let entries: string[];
  try {
    entries = await readdir(outputDir);
  } catch {
    return [];
  }

  const backupFiles = entries.filter(
    (f) => f.startsWith("axiom-backup-") && f.endsWith(".sql")
  );

  const infos: BackupInfo[] = [];
  for (const filename of backupFiles) {
    const filePath = join(outputDir, filename);
    const fileStat = await stat(filePath);
    infos.push({
      filename,
      path: filePath,
      createdAt: fileStat.birthtime.toISOString(),
      sizeBytes: fileStat.size,
    });
  }

  infos.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return infos;
}

/**
 * Enqueue a job to the BullMQ backup queue via raw Redis commands.
 * This avoids requiring bullmq as a dashboard dependency.
 */
async function enqueueBackupJob(action: string): Promise<string> {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const redis = new Redis(redisUrl);
  const jobId = `manual-${action}-${Date.now()}`;

  try {
    // BullMQ stores jobs as hashes at bull:<queue>:<jobId>
    // and adds them to the wait list. Using RPUSH + HSET mirrors
    // the minimal subset BullMQ workers expect.
    const jobKey = `bull:${BACKUP_QUEUE}:${jobId}`;
    const data = JSON.stringify({ type: action });

    await redis.hset(jobKey, {
      name: `manual-${action}`,
      data,
      opts: JSON.stringify({}),
      timestamp: Date.now().toString(),
      delay: "0",
      priority: "0",
      attemptsMade: "0",
    });

    await redis.rpush(`bull:${BACKUP_QUEUE}:wait`, jobId);

    return jobId;
  } finally {
    await redis.quit();
  }
}

export async function GET() {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  try {
    const backups = await listBackups(BACKUP_DIR);

    return NextResponse.json({
      backups,
      total: backups.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to list backups", details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) {
    return authError;
  }

  const body = await request.json();
  const action = body.action as string | undefined;

  if (!(action && ["backup", "verify"].includes(action))) {
    return NextResponse.json(
      { error: "Invalid action. Must be one of: backup, verify" },
      { status: 400 }
    );
  }

  try {
    const jobId = await enqueueBackupJob(action);

    return NextResponse.json(
      {
        status: "initiated",
        action,
        jobId,
        timestamp: new Date().toISOString(),
      },
      { status: 202 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to enqueue backup job", details: String(err) },
      { status: 500 }
    );
  }
}
