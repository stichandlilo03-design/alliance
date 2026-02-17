const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    // Try multiple env var names (Vercel/Supabase use different ones)
    const connectionString =
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL;

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

async function query(text, params = []) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

module.exports = { query };
