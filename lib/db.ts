import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { PricingConfig } from '@/types/admin';
import { getDefaultPricingConfig } from './defaultPricing';

export interface AdminUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mastercue.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MasterCue2026!';

// Resolve safe writable directory for serverless (Vercel / Lambda)
function getDataDir(): string {
  if (
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NODE_ENV === 'production'
  ) {
    if (fs.existsSync('/tmp')) {
      const tmpDir = path.join('/tmp', 'mastercue-data');
      if (!fs.existsSync(tmpDir)) {
        try {
          fs.mkdirSync(tmpDir, { recursive: true });
        } catch {}
      }
      return tmpDir;
    }
  }

  const localDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {}
  }
  return localDir;
}

function getUsersFile(): string {
  return path.join(getDataDir(), 'adminUsers.json');
}

function getPricingFile(): string {
  return path.join(getDataDir(), 'pricingConfig.json');
}

// In-memory fallback caches
let memoryUsers: AdminUserRecord[] | null = null;
let memoryPricing: PricingConfig | null = null;

// Database Connection Pool for PostgreSQL (Supabase / Neon / Railway / AWS RDS)
declare global {
  var __mastercue_pgPool: Pool | undefined;
  var __mastercue_pgInit: boolean | undefined;
}

function getPgPool(): Pool | null {
  const rawUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED;

  if (!rawUrl) return null;

  if (!globalThis.__mastercue_pgPool) {
    // Strip channel_binding and sslmode query params; pg handles SSL via ssl: { rejectUnauthorized: false }
    const cleanUrl = rawUrl
      .replace(/[?&]channel_binding=[^&]+/g, '')
      .replace(/[?&]sslmode=[^&]+/g, '');

    const pool = new Pool({
      connectionString: cleanUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 5000,
      keepAlive: true,
      statement_timeout: 8000,
    });

    pool.on('error', (err) => {
      console.error('PostgreSQL idle client disconnected, resetting pool:', err);
      globalThis.__mastercue_pgPool = undefined;
    });

    globalThis.__mastercue_pgPool = pool;
  }
  return globalThis.__mastercue_pgPool;
}

// Enterprise retry wrapper with exponential backoff for transient serverless disconnects
async function executeQueryWithRetry<T = any>(
  queryText: string,
  params: any[] = [],
  retries = 2
): Promise<any> {
  const pool = getPgPool();
  if (!pool) throw new Error('Database connection URL not configured');

  let lastError: any = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await pool.query(queryText, params);
    } catch (err: any) {
      lastError = err;
      console.warn(`PostgreSQL query attempt ${attempt} failed: ${err.message}`);
      if (
        err?.code === 'ECONNRESET' ||
        err?.code === '57P01' ||
        err?.code === 'EPIPE' ||
        err?.message?.includes('closed')
      ) {
        globalThis.__mastercue_pgPool = undefined;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 250 * attempt));
      }
    }
  }
  throw lastError;
}

// Initialize PostgreSQL Tables if needed (lazy/fallback)
async function initPgTables(pool: Pool) {
  if (globalThis.__mastercue_pgInit) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS pricing_configs (
        id VARCHAR(64) PRIMARY KEY,
        config JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default admin user in PostgreSQL if table is empty
    const usersCount = await pool.query('SELECT COUNT(*) FROM admin_users');
    if (parseInt(usersCount.rows[0].count, 10) === 0) {
      const defaultHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      await pool.query(
        'INSERT INTO admin_users (id, email, password_hash, created_at) VALUES ($1, $2, $3, NOW())',
        ['admin-1', DEFAULT_ADMIN_EMAIL.toLowerCase(), defaultHash]
      );
    }

    // Seed default pricing config in PostgreSQL if table is empty
    const pricingCount = await pool.query('SELECT COUNT(*) FROM pricing_configs');
    if (parseInt(pricingCount.rows[0].count, 10) === 0) {
      const defaultConfig = getDefaultPricingConfig();
      await pool.query(
        'INSERT INTO pricing_configs (id, config, updated_at) VALUES ($1, $2, NOW())',
        ['active', JSON.stringify(defaultConfig)]
      );
    }

    globalThis.__mastercue_pgInit = true;
  } catch (err) {
    console.error('PostgreSQL table initialization notice:', err);
  }
}

// Local filesystem fallback helpers
function getLocalUsers(): AdminUserRecord[] {
  if (memoryUsers && memoryUsers.length > 0) {
    return memoryUsers;
  }

  const usersFile = getUsersFile();
  if (fs.existsSync(usersFile)) {
    try {
      const content = fs.readFileSync(usersFile, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryUsers = parsed;
        return parsed;
      }
    } catch (e) {}
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, salt);
  const defaultUser: AdminUserRecord = {
    id: 'admin-1',
    email: DEFAULT_ADMIN_EMAIL.toLowerCase(),
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  };

  memoryUsers = [defaultUser];

  try {
    fs.writeFileSync(usersFile, JSON.stringify([defaultUser], null, 2), 'utf-8');
  } catch {}

  return [defaultUser];
}

// -------------------------------------------------------------
// Public Database Interface
// -------------------------------------------------------------

export async function getDatabaseStatus(): Promise<{
  type: 'postgresql' | 'local';
  connected: boolean;
  hasEnvUrl: boolean;
  latencyMs?: number;
  version?: number;
  lastUpdated?: string;
  error?: string;
}> {
  const isPg = Boolean(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED
  );
  if (!isPg) {
    return { type: 'local', connected: false, hasEnvUrl: false };
  }

  const pool = getPgPool();
  if (!pool) {
    return {
      type: 'postgresql',
      connected: false,
      hasEnvUrl: true,
      error: 'Connection string missing',
    };
  }

  const start = Date.now();
  try {
    const res = await executeQueryWithRetry(
      'SELECT config, updated_at FROM pricing_configs WHERE id = $1 LIMIT 1',
      ['active']
    );
    const latencyMs = Date.now() - start;
    let version = 1;
    let lastUpdated: string | undefined;
    if (res.rows.length > 0) {
      const cfg =
        typeof res.rows[0].config === 'string'
          ? JSON.parse(res.rows[0].config)
          : res.rows[0].config;
      version = cfg?.version || 1;
      lastUpdated = res.rows[0].updated_at || cfg?.lastUpdated;
    }
    return {
      type: 'postgresql',
      connected: true,
      hasEnvUrl: true,
      latencyMs,
      version,
      lastUpdated,
    };
  } catch (err: any) {
    return {
      type: 'postgresql',
      connected: false,
      hasEnvUrl: true,
      latencyMs: Date.now() - start,
      error: err?.message || 'Failed connecting to PostgreSQL',
    };
  }
}

export async function findAdminByEmail(email: string): Promise<AdminUserRecord | null> {
  const cleanEmail = email.trim().toLowerCase();
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await pool.query(
        'SELECT id, email, password_hash as "passwordHash", created_at as "createdAt" FROM admin_users WHERE email = $1',
        [cleanEmail]
      );
      if (res.rows.length > 0) {
        return res.rows[0] as AdminUserRecord;
      }
    } catch (err: any) {
      if (err?.code === '42P01') {
        // Table does not exist yet, initialize and retry once
        await initPgTables(pool);
        const retryRes = await pool.query(
          'SELECT id, email, password_hash as "passwordHash", created_at as "createdAt" FROM admin_users WHERE email = $1',
          [cleanEmail]
        );
        if (retryRes.rows.length > 0) return retryRes.rows[0] as AdminUserRecord;
      }
      console.warn('PostgreSQL query error, falling back to local user store:', err);
    }
  }

  // Fallback to local / memory store
  const users = getLocalUsers();
  return users.find((u) => u.email === cleanEmail) || null;
}

export async function loadPricingFromDB(): Promise<PricingConfig> {
  const pool = getPgPool();

  if (pool) {
    try {
      const res = await executeQueryWithRetry(
        'SELECT config FROM pricing_configs WHERE id = $1',
        ['active']
      );
      if (res.rows.length > 0 && res.rows[0].config) {
        let parsed = res.rows[0].config;
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        memoryPricing = parsed as PricingConfig;
        return memoryPricing;
      }
    } catch (err: any) {
      if (err?.code === '42P01') {
        await initPgTables(pool);
        const retryRes = await executeQueryWithRetry(
          'SELECT config FROM pricing_configs WHERE id = $1',
          ['active']
        );
        if (retryRes.rows.length > 0 && retryRes.rows[0].config) {
          let parsed = retryRes.rows[0].config;
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
          memoryPricing = parsed as PricingConfig;
          return memoryPricing;
        }
      }
      console.warn('PostgreSQL query error, falling back to local pricing store:', err);
    }
  }

  if (memoryPricing) {
    return memoryPricing;
  }

  // Fallback to local store (/tmp or data/)
  const pricingFile = getPricingFile();
  if (fs.existsSync(pricingFile)) {
    try {
      const content = fs.readFileSync(pricingFile, 'utf-8');
      const parsed = JSON.parse(content);
      memoryPricing = parsed;
      return parsed;
    } catch (e) {
      console.warn('Failed reading local pricing file, using default:', e);
    }
  }

  const defaults = getDefaultPricingConfig();
  memoryPricing = defaults;

  try {
    fs.writeFileSync(pricingFile, JSON.stringify(defaults, null, 2), 'utf-8');
  } catch {}

  return defaults;
}

export async function savePricingToDB(config: PricingConfig): Promise<boolean> {
  memoryPricing = config;
  const pool = getPgPool();

  if (pool) {
    try {
      // Direct fast atomic UPSERT with retry
      await executeQueryWithRetry(
        `INSERT INTO pricing_configs (id, config, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) DO UPDATE SET config = $2, updated_at = NOW()`,
        ['active', JSON.stringify(config)]
      );
      return true;
    } catch (err: any) {
      if (err?.code === '42P01') {
        await initPgTables(pool);
        await executeQueryWithRetry(
          `INSERT INTO pricing_configs (id, config, updated_at) 
           VALUES ($1, $2, NOW()) 
           ON CONFLICT (id) DO UPDATE SET config = $2, updated_at = NOW()`,
          ['active', JSON.stringify(config)]
        );
        return true;
      }
      console.error('Failed saving to PostgreSQL database:', err);
      throw new Error(`Cloud database save error: ${err?.message || 'PostgreSQL connection failed'}`);
    }
  }

  // Persist to safe location
  try {
    const pricingFile = getPricingFile();
    fs.writeFileSync(pricingFile, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('Disk write skipped on read-only serverless filesystem:', err?.message);
  }

  return true;
}

export async function resetPricingInDB(): Promise<PricingConfig> {
  const defaults = getDefaultPricingConfig();
  memoryPricing = defaults;
  await savePricingToDB(defaults);
  return defaults;
}

// Enterprise Health Monitor for Admin UI
export async function checkDBHealth(): Promise<{
  connected: boolean;
  type: 'neon-postgresql' | 'local-filesystem';
  latencyMs: number;
  lastUpdated?: string;
  version?: number;
  error?: string;
}> {
  const start = Date.now();
  const pool = getPgPool();
  if (!pool) {
    return {
      connected: false,
      type: 'local-filesystem',
      latencyMs: 0,
      error: 'DATABASE_URL environment variable is missing',
    };
  }

  try {
    const res = await executeQueryWithRetry(
      'SELECT config, updated_at FROM pricing_configs WHERE id = $1 LIMIT 1',
      ['active']
    );
    const latencyMs = Date.now() - start;
    if (res.rows.length > 0) {
      const cfg = typeof res.rows[0].config === 'string' ? JSON.parse(res.rows[0].config) : res.rows[0].config;
      return {
        connected: true,
        type: 'neon-postgresql',
        latencyMs,
        lastUpdated: res.rows[0].updated_at || cfg?.lastUpdated,
        version: cfg?.version || 1,
      };
    }
    return {
      connected: true,
      type: 'neon-postgresql',
      latencyMs,
    };
  } catch (err: any) {
    return {
      connected: false,
      type: 'local-filesystem',
      latencyMs: Date.now() - start,
      error: err?.message,
    };
  }
}
