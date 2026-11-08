import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const { Pool } = pg;

export type DrizzleDatabase = ReturnType<typeof drizzlePg<typeof schema>>;

let dbInstance: any = null;
let poolInstance: pg.Pool | null = null;
let pgliteInstance: PGlite | null = null;
let activeMode: 'POSTGRES' | 'PGLITE' = 'POSTGRES';

export async function initDatabase(): Promise<{ db: DrizzleDatabase; mode: 'POSTGRES' | 'PGLITE' }> {
  if (dbInstance) {
    return { db: dbInstance, mode: activeMode };
  }

  // Attempt PostgreSQL connection if DATABASE_URL is configured
  if (env.DATABASE_URL) {
    try {
      const pool = new Pool({
        connectionString: env.DATABASE_URL,
        connectionTimeoutMillis: 3000
      });

      // Probe connection
      const client = await pool.connect();
      client.release();

      poolInstance = pool;
      dbInstance = drizzlePg(pool, { schema });
      activeMode = 'POSTGRES';
      console.log('✅ [Database] Connected to external PostgreSQL via DATABASE_URL.');
      return { db: dbInstance, mode: activeMode };
    } catch (err: any) {
      console.warn(`⚠️ [Database] Failed to connect to DATABASE_URL (${err.message}). Falling back to embedded PGlite...`);
    }
  }

  // Embedded WebAssembly PostgreSQL fallback (PGlite)
  const dataDir = path.resolve(process.cwd(), '.data/pglite');
  fs.mkdirSync(dataDir, { recursive: true });

  console.log(`⚡ [Database] Initializing persistent embedded WebAssembly PostgreSQL (PGlite) at ${dataDir}`);
  const pglite = new PGlite(dataDir);
  pgliteInstance = pglite;
  dbInstance = drizzlePglite(pglite, { schema });
  activeMode = 'PGLITE';
  return { db: dbInstance, mode: activeMode };
}

export function getDatabase(): DrizzleDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

export function getDatabaseMode(): 'POSTGRES' | 'PGLITE' {
  return activeMode;
}

export async function closeDatabase(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
  dbInstance = null;
}
