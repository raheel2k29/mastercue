const { Pool } = require('pg');

const rawUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_V0LOXY2CPUSG@ep-lingering-water-bc5ylqw2-pooler.c-16.us-east-1.aws.neon.tech/neondb';
const cleanUrl = rawUrl.replace(/[?&]channel_binding=[^&]+/g, '').replace(/[?&]sslmode=[^&]+/g, '');
const pool = new Pool({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  console.log('Connecting to Neon PostgreSQL to initialize orders table...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) PRIMARY KEY,
      order_number VARCHAR(32) UNIQUE NOT NULL,
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
  `);
  console.log('Orders table verified in Neon PostgreSQL!');
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log('Public tables in Neon DB:', res.rows.map(r => r.table_name));
  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
