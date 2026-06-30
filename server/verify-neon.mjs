// Quick raw-Postgres connectivity check (no Prisma engine needed).
// Run: npm run db:verify
import 'dotenv/config';
import pg from 'pg';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL / DIRECT_URL in .env'); process.exit(1); }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  const v = await client.query('select version()');
  const t = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by 1"
  );
  console.log('Connected to Neon OK.');
  console.log('  ', v.rows[0].version);
  console.log('   public tables:', t.rows.map((r) => r.table_name).join(', ') || '(none yet — run `npm run db:push`)');
  await client.end();
} catch (e) {
  console.error('Connection FAILED:', e.message);
  process.exit(2);
}
