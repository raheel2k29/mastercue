import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { PricingConfig } from '@/types/admin';
import { OrderRecord, OrderStatus } from '@/types/order';
import { CustomerRecord } from '@/types/customer';
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

function getOrdersFile(): string {
  return path.join(getDataDir(), 'orders.json');
}

function getCustomersFile(): string {
  return path.join(getDataDir(), 'customers.json');
}

// In-memory fallback caches
let memoryUsers: AdminUserRecord[] | null = null;
let memoryPricing: PricingConfig | null = null;
let memoryOrders: OrderRecord[] | null = null;
let memoryCustomers: CustomerRecord[] | null = null;

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
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        order_number VARCHAR(32) UNIQUE NOT NULL,
        customer_id VARCHAR(64),
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(64),
        shipping_address JSONB NOT NULL,
        cue_configuration JSONB NOT NULL,
        pricing_breakdown JSONB NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL,
        currency VARCHAR(8) DEFAULT '£',
        payment_method VARCHAR(64) DEFAULT 'invoice_bank_transfer',
        status VARCHAR(32) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);

      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(64),
        shipping_address JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);

      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id VARCHAR(64);
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

// -------------------------------------------------------------
// Orders Data Layer (Neon PostgreSQL + Fallback Persistence)
// -------------------------------------------------------------

function getLocalOrders(): OrderRecord[] {
  if (memoryOrders && memoryOrders.length > 0) {
    return memoryOrders;
  }
  const ordersFile = getOrdersFile();
  if (fs.existsSync(ordersFile)) {
    try {
      const content = fs.readFileSync(ordersFile, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        memoryOrders = parsed;
        return parsed;
      }
    } catch {}
  }
  memoryOrders = [];
  return [];
}

function mapRowToOrder(row: any): OrderRecord {
  const customer =
    typeof row.shipping_address === 'string'
      ? JSON.parse(row.shipping_address)
      : row.shipping_address;
  const cue =
    typeof row.cue_configuration === 'string'
      ? JSON.parse(row.cue_configuration)
      : row.cue_configuration;
  const pricing =
    typeof row.pricing_breakdown === 'string'
      ? JSON.parse(row.pricing_breakdown)
      : row.pricing_breakdown;

  const isPriority =
    row.service_level === 'priority' ||
    Boolean(cue?.priorityService) ||
    Boolean(pricing?.priorityServicePrice && Number(pricing.priorityServicePrice) > 0);

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id || undefined,
    customer,
    cue,
    pricing,
    serviceLevel: isPriority ? 'priority' : 'standard',
    targetCompletionWeeks: isPriority ? 6 : (row.target_completion_weeks ? Number(row.target_completion_weeks) : 12),
    paymentMethod: row.payment_method || 'invoice_bank_transfer',
    notes: row.notes || '',
    status: (row.status as OrderStatus) || 'pending',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export async function createOrder(order: OrderRecord): Promise<OrderRecord> {
  const pool = getPgPool();
  let dbSaved = false;

  if (pool) {
    try {
      await initPgTables(pool);
      await executeQueryWithRetry(
        `INSERT INTO orders (
          id, order_number, customer_id, customer_name, customer_email, customer_phone,
          shipping_address, cue_configuration, pricing_breakdown,
          total_price, currency, payment_method, status, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
        [
          order.id,
          order.orderNumber,
          order.customerId || null,
          order.customer.fullName,
          order.customer.email.toLowerCase(),
          order.customer.phone || null,
          JSON.stringify(order.customer),
          JSON.stringify(order.cue),
          JSON.stringify(order.pricing),
          order.pricing.total,
          order.pricing.currency || '£',
          order.paymentMethod || 'invoice_bank_transfer',
          order.status || 'pending',
          order.notes || null,
        ]
      );
      dbSaved = true;
    } catch (err: any) {
      console.error('PostgreSQL createOrder failed, falling back to disk backup:', err?.message);
    }
  }

  // Double safety net: local file / in-memory backup
  try {
    const orders = getLocalOrders();
    // Prepend new order
    orders.unshift(order);
    memoryOrders = orders;
    const ordersFile = getOrdersFile();
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('Orders disk write skipped:', err?.message);
  }

  return order;
}

export async function getOrders(limit = 100, offset = 0): Promise<OrderRecord[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      await initPgTables(pool);
      const res = await executeQueryWithRetry(
        'SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      if (res.rows && res.rows.length > 0) {
        return res.rows.map(mapRowToOrder);
      }
    } catch (err: any) {
      console.error('PostgreSQL getOrders failed, using local orders:', err?.message);
    }
  }

  return getLocalOrders().slice(offset, offset + limit);
}

export async function getOrderById(id: string): Promise<OrderRecord | null> {
  const pool = getPgPool();
  if (pool) {
    try {
      await initPgTables(pool);
      const res = await executeQueryWithRetry(
        'SELECT * FROM orders WHERE id = $1 OR order_number = $1 LIMIT 1',
        [id]
      );
      if (res.rows && res.rows.length > 0) {
        return mapRowToOrder(res.rows[0]);
      }
    } catch (err: any) {
      console.error('PostgreSQL getOrderById failed:', err?.message);
    }
  }

  const local = getLocalOrders().find((o) => o.id === id || o.orderNumber === id);
  return local || null;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<boolean> {
  const pool = getPgPool();
  if (pool) {
    try {
      await executeQueryWithRetry(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 OR order_number = $2',
        [status, id]
      );
    } catch (err: any) {
      console.error('PostgreSQL updateOrderStatus failed:', err?.message);
    }
  }

  try {
    const orders = getLocalOrders();
    const target = orders.find((o) => o.id === id || o.orderNumber === id);
    if (target) {
      target.status = status;
      target.updatedAt = new Date().toISOString();
      memoryOrders = orders;
      fs.writeFileSync(getOrdersFile(), JSON.stringify(orders, null, 2), 'utf-8');
    }
  } catch {}

  return true;
}

export async function markOrderPaid(id: string, paymentIntentId?: string): Promise<boolean> {
  const pool = getPgPool();
  if (pool) {
    try {
      await executeQueryWithRetry(
        "UPDATE orders SET status = 'confirmed', updated_at = NOW() WHERE id = $1 OR order_number = $1",
        [id]
      );
    } catch (err: any) {
      console.error('PostgreSQL markOrderPaid failed:', err?.message);
    }
  }

  try {
    const orders = getLocalOrders();
    const target = orders.find((o) => o.id === id || o.orderNumber === id);
    if (target) {
      target.status = 'confirmed';
      target.updatedAt = new Date().toISOString();
      memoryOrders = orders;
      fs.writeFileSync(getOrdersFile(), JSON.stringify(orders, null, 2), 'utf-8');
    }
  } catch {}

  return true;
}

// -------------------------------------------------------------
// Customers & Account Layer (Neon PostgreSQL + Fallback)
// -------------------------------------------------------------

function getLocalCustomers(): CustomerRecord[] {
  if (memoryCustomers && memoryCustomers.length > 0) {
    return memoryCustomers;
  }
  const file = getCustomersFile();
  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (Array.isArray(parsed)) {
        memoryCustomers = parsed;
        return parsed;
      }
    } catch {}
  }
  memoryCustomers = [];
  return [];
}

function mapRowToCustomer(row: any): CustomerRecord {
  const shippingAddress =
    typeof row.shipping_address === 'string'
      ? JSON.parse(row.shipping_address)
      : row.shipping_address;

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    phone: row.phone || undefined,
    shippingAddress: shippingAddress || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export async function createCustomerAccount(customer: CustomerRecord): Promise<CustomerRecord> {
  const pool = getPgPool();
  if (pool) {
    try {
      await initPgTables(pool);
      await executeQueryWithRetry(
        `INSERT INTO customers (
          id, email, password_hash, full_name, phone, shipping_address, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          full_name = EXCLUDED.full_name,
          phone = COALESCE(EXCLUDED.phone, customers.phone),
          shipping_address = COALESCE(EXCLUDED.shipping_address, customers.shipping_address),
          updated_at = NOW()`,
        [
          customer.id,
          customer.email.toLowerCase(),
          customer.passwordHash,
          customer.fullName,
          customer.phone || null,
          customer.shippingAddress ? JSON.stringify(customer.shippingAddress) : null,
        ]
      );

      // Link any existing unlinked orders matching this email
      await executeQueryWithRetry(
        `UPDATE orders SET customer_id = $1 WHERE LOWER(customer_email) = $2 AND (customer_id IS NULL OR customer_id = '')`,
        [customer.id, customer.email.toLowerCase()]
      );
    } catch (err: any) {
      console.error('PostgreSQL createCustomerAccount failed:', err?.message);
    }
  }

  try {
    const list = getLocalCustomers();
    const existingIdx = list.findIndex((c) => c.email.toLowerCase() === customer.email.toLowerCase());
    if (existingIdx >= 0) {
      list[existingIdx] = customer;
    } else {
      list.push(customer);
    }
    memoryCustomers = list;
    fs.writeFileSync(getCustomersFile(), JSON.stringify(list, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('Customer disk write skipped:', err?.message);
  }

  return customer;
}

export async function findCustomerByEmail(email: string): Promise<CustomerRecord | null> {
  if (!email) return null;
  const pool = getPgPool();
  if (pool) {
    try {
      await initPgTables(pool);
      const res = await executeQueryWithRetry(
        'SELECT * FROM customers WHERE LOWER(email) = $1 LIMIT 1',
        [email.trim().toLowerCase()]
      );
      if (res.rows && res.rows.length > 0) {
        return mapRowToCustomer(res.rows[0]);
      }
    } catch (err: any) {
      console.error('PostgreSQL findCustomerByEmail failed:', err?.message);
    }
  }

  const local = getLocalCustomers().find((c) => c.email.toLowerCase() === email.trim().toLowerCase());
  return local || null;
}

export async function findCustomerById(id: string): Promise<CustomerRecord | null> {
  if (!id) return null;
  const pool = getPgPool();
  if (pool) {
    try {
      await initPgTables(pool);
      const res = await executeQueryWithRetry(
        'SELECT * FROM customers WHERE id = $1 LIMIT 1',
        [id]
      );
      if (res.rows && res.rows.length > 0) {
        return mapRowToCustomer(res.rows[0]);
      }
    } catch (err: any) {
      console.error('PostgreSQL findCustomerById failed:', err?.message);
    }
  }

  const local = getLocalCustomers().find((c) => c.id === id);
  return local || null;
}

export async function getAllCustomers(): Promise<CustomerRecord[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      await initPgTables(pool);
      const res = await executeQueryWithRetry(
        'SELECT * FROM customers ORDER BY created_at DESC'
      );
      if (res.rows && res.rows.length > 0) {
        return res.rows.map(mapRowToCustomer);
      }
    } catch (err: any) {
      console.error('PostgreSQL getAllCustomers failed:', err?.message);
    }
  }

  return getLocalCustomers();
}

export async function getCustomerOrders(email: string, customerId?: string): Promise<OrderRecord[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      await initPgTables(pool);
      let res;
      if (customerId) {
        res = await executeQueryWithRetry(
          'SELECT * FROM orders WHERE customer_id = $1 OR LOWER(customer_email) = $2 ORDER BY created_at DESC',
          [customerId, email.trim().toLowerCase()]
        );
      } else {
        res = await executeQueryWithRetry(
          'SELECT * FROM orders WHERE LOWER(customer_email) = $1 ORDER BY created_at DESC',
          [email.trim().toLowerCase()]
        );
      }
      if (res.rows && res.rows.length > 0) {
        return res.rows.map(mapRowToOrder);
      }
    } catch (err: any) {
      console.error('PostgreSQL getCustomerOrders failed:', err?.message);
    }
  }

  const lower = email.trim().toLowerCase();
  return getLocalOrders().filter(
    (o) => o.customer.email.toLowerCase() === lower || (customerId && o.customerId === customerId)
  );
}
