import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let _db: ReturnType<typeof createDb> | null = null;

function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client);
}

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is required");
  _db = createDb(url);
  return _db;
}

export type DashboardDatabase = ReturnType<typeof createDb>;
