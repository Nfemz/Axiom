import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

let _db: ReturnType<typeof createDb> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function createDb(connectionString: string, ssl: boolean = false) {
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: ssl ? { rejectUnauthorized: false } : false,
  });
  _client = client;
  return drizzle(client, { schema });
}

export function getDb(connectionString?: string, ssl?: boolean) {
  if (_db) return _db;
  if (!connectionString) throw new Error("Database connection string required for first call");
  _db = createDb(connectionString, ssl);
  return _db;
}

export async function closeDb() {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}

export type Database = ReturnType<typeof createDb>;
