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

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'adminUsers.json');
const PRICING_FILE = path.join(DATA_DIR, 'pricingConfig.json');

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mastercue.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MasterCue2026!';

// Database Connection Pool for PostgreSQL (Supabase / Neon / Railway / AWS RDS)
let pgPool: Pool | null = null;
let pgInitialized = false;

function getPgPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pgPool;
}

// Initialize PostgreSQL Tables if connected
async function initPgTables(pool: Pool) {
  if (pgInitialized) return;
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

    pgInitialized = true;
  } catch (err) {
    console.error('PostgreSQL initialization error:', err);
  }
}

// Local filesystem fallback helpers
function ensureLocalDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getLocalUsers(): AdminUserRecord[] {
  ensureLocalDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, salt);
    const defaultUser: AdminUserRecord = {
      id: 'admin-1',
      email: DEFAULT_ADMIN_EMAIL.toLowerCase(),
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify([defaultUser], null, 2), 'utf-8');
    return [defaultUser];
  }

  try {
    const content = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

// -------------------------------------------------------------
// Public Database Interface
// -------------------------------------------------------------

export function getDatabaseStatus(): { type: 'postgresql' | 'local'; connected: boolean } {
  const isPg = Boolean(process.env.DATABASE_URL);
  return {
    type: isPg ? 'postgresql' : 'local',
    connected: true,
  };
}

export async function findAdminByEmail(email: string): Promise<AdminUserRecord | null> {
  const cleanEmail = email.trim().toLowerCase();
  const pool = getPgPool();

  if (pool) {
    await initPgTables(pool);
    const res = await pool.query('SELECT id, email, password_hash as "passwordHash", created_at as "createdAt" FROM admin_users WHERE email = $1', [cleanEmail]);
    if (res.rows.length > 0) {
      return res.rows[0] as AdminUserRecord;
    }
    return null;
  }

  // Fallback to local store
  const users = getLocalUsers();
  return users.find((u) => u.email === cleanEmail) || null;
}

export async function loadPricingFromDB(): Promise<PricingConfig> {
  const pool = getPgPool();

  if (pool) {
    try {
      await initPgTables(pool);
      const res = await pool.query('SELECT config FROM pricing_configs WHERE id = $1', ['active']);
      if (res.rows.length > 0 && res.rows[0].config) {
        return res.rows[0].config as PricingConfig;
      }
    } catch (err) {
      console.warn('Failed to load from PostgreSQL, falling back:', err);
    }
  }

  // Fallback to local store
  ensureLocalDataDir();
  if (fs.existsSync(PRICING_FILE)) {
    try {
      const content = fs.readFileSync(PRICING_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.warn('Failed reading local pricing file, using default:', e);
    }
  }

  const defaults = getDefaultPricingConfig();
  fs.writeFileSync(PRICING_FILE, JSON.stringify(defaults, null, 2), 'utf-8');
  return defaults;
}

export async function savePricingToDB(config: PricingConfig): Promise<boolean> {
  const pool = getPgPool();

  if (pool) {
    try {
      await initPgTables(pool);
      await pool.query(
        `INSERT INTO pricing_configs (id, config, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) DO UPDATE SET config = $2, updated_at = NOW()`,
        ['active', JSON.stringify(config)]
      );
      return true;
    } catch (err) {
      console.error('Failed saving to PostgreSQL:', err);
      return false;
    }
  }

  // Fallback to local store
  ensureLocalDataDir();
  fs.writeFileSync(PRICING_FILE, JSON.stringify(config, null, 2), 'utf-8');
  return true;
}

export async function resetPricingInDB(): Promise<PricingConfig> {
  const defaults = getDefaultPricingConfig();
  await savePricingToDB(defaults);
  return defaults;
}
