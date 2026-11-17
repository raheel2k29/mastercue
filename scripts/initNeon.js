const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const connStr =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_V0LOXY2CPUSG@ep-lingering-water-bc5ylqw2-pooler.c-16.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: connStr.replace(/[?&]channel_binding=[^&]+/g, ''),
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log('Connecting to Neon PostgreSQL...');
  const nowRes = await pool.query('SELECT NOW()');
  console.log('Connection OK. DB Server Time:', nowRes.rows[0].now);

  console.log('Creating schema tables...');
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
  console.log('Tables created: admin_users, pricing_configs');

  // Seed default admin if missing
  const userCheck = await pool.query('SELECT COUNT(*) FROM admin_users');
  if (parseInt(userCheck.rows[0].count, 10) === 0) {
    console.log('Seeding default administrator...');
    const hash = await bcrypt.hash('MasterCue2026!', 10);
    await pool.query(
      'INSERT INTO admin_users (id, email, password_hash, created_at) VALUES ($1, $2, $3, NOW())',
      ['admin-1', 'admin@mastercue.com', hash]
    );
    console.log('Admin user seeded: admin@mastercue.com / MasterCue2026!');
  } else {
    console.log('Admin user already exists in Neon.');
  }

  // Seed default pricing if missing
  const priceCheck = await pool.query('SELECT COUNT(*) FROM pricing_configs');
  if (parseInt(priceCheck.rows[0].count, 10) === 0) {
    console.log('Seeding initial pricing configuration...');
    // Load local pricingConfig.json or fallback
    const fs = require('fs');
    const path = require('path');
    let configData = null;
    const localFile = path.join(__dirname, '..', 'data', 'pricingConfig.json');
    if (fs.existsSync(localFile)) {
      configData = JSON.parse(fs.readFileSync(localFile, 'utf-8'));
    }
    if (configData) {
      await pool.query(
        'INSERT INTO pricing_configs (id, config, updated_at) VALUES ($1, $2, NOW())',
        ['active', JSON.stringify(configData)]
      );
      console.log('Pricing configuration seeded successfully.');
    }
  } else {
    console.log('Pricing configuration already exists in Neon.');
  }

  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  console.log('Active tables in Neon:', tables.rows.map((r) => r.table_name));

  await pool.end();
  console.log('All migrations completed successfully!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  pool.end();
  process.exit(1);
});
