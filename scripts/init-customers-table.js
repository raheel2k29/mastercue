const { Pool } = require('pg');

const rawUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_V0LOXY2CPUSG@ep-lingering-water-bc5ylqw2-pooler.c-16.us-east-1.aws.neon.tech/neondb';
const cleanUrl = rawUrl.replace(/[?&]channel_binding=[^&]+/g, '').replace(/[?&]sslmode=[^&]+/g, '');
const pool = new Pool({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  console.log('Connecting to Neon PostgreSQL to initialize customers table...');
  await pool.query(`
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
  console.log('Customers table and orders customer_id column verified in Neon PostgreSQL!');
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log('Current public tables in Neon DB:', res.rows.map(r => r.table_name));
  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
