const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
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

    // Prevent crash on idle client errors
    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err);
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
