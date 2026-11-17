const { Pool } = require('pg');
const fs = require('fs');

const rawUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_V0LOXY2CPUSG@ep-lingering-water-bc5ylqw2-pooler.c-16.us-east-1.aws.neon.tech/neondb';
const cleanUrl = rawUrl.replace(/[?&]channel_binding=[^&]+/g, '').replace(/[?&]sslmode=[^&]+/g, '');

async function run() {
  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  const config = JSON.parse(fs.readFileSync('data/pricingConfig.json', 'utf8'));
  console.log('Writing to Neon DB...');
  await pool.query(
    'INSERT INTO pricing_configs (id, config, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET config = $2, updated_at = NOW()',
    ['active', JSON.stringify(config)]
  );

  const check = await pool.query('SELECT config FROM pricing_configs WHERE id = $1', ['active']);
  const loaded = check.rows[0].config;
  const parsed = typeof loaded === 'string' ? JSON.parse(loaded) : loaded;
  console.log('Neon DB Verification:');
  console.log('Shafts count:', parsed.shafts.length);
  console.log('Shafts:', parsed.shafts.map(s => `${s.name} (£${s.price})`));
  console.log('Ferrules count:', parsed.ferrules.length);
  console.log('Ferrules:', parsed.ferrules.map(f => `${f.name} (£${f.price})`));
  await pool.end();
}

run().catch((err) => {
  console.error('Error updating Neon:', err);
  process.exit(1);
});
