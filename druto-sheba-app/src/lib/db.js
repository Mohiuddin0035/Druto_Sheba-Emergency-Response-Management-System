import { Pool } from 'pg';

let pool;

// We strictly initialize PostgreSQL connection pool
if (!global.pgPool && (process.env.PG_CONNECTION_STRING || process.env.PG_HOST)) {
  const isSSL = String(process.env.PG_SSL || '').trim().toLowerCase() === 'true';
  const isSupabase = String(process.env.PG_CONNECTION_STRING || process.env.PG_HOST || '').includes('supabase');
  const ssl = (isSSL || isSupabase) ? { rejectUnauthorized: false } : undefined;

  global.pgPool = process.env.PG_CONNECTION_STRING
    ? new Pool({
        connectionString: process.env.PG_CONNECTION_STRING,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
        keepAlive: true,
      })
    : new Pool({
        user: process.env.PG_USER || process.env.USER,
        host: process.env.PG_HOST,
        database: process.env.PG_DATABASE,
        password: process.env.PG_PASSWORD || '',
        port: parseInt(process.env.PG_PORT || '5432', 10),
        ssl,
        max: 5,
        idleTimeoutMillis: 300000,
        connectionTimeoutMillis: 30000,
      });
}
pool = global.pgPool;

/**
 * Strict query executor - directly talks to PostgreSQL.
 * Throws error if DB connection fails, ensuring zero silent mock fallbacks.
 */
export async function query(text, params = []) {
  if (!pool) {
    throw new Error('PostgreSQL Database pool is not initialized. Please verify your connection string.');
  }

  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('Database query failed:', err.message);
    throw err;
  }
}

/**
 * Strict transaction executor with BEGIN, COMMIT, and ROLLBACK
 */
export async function transaction(callback) {
  if (!pool) {
    throw new Error('Database pool not initialized.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Suggestion helper for severity based on medical keywords
 */
export function suggestSeverity(description = '') {
  const text = (description || '').toLowerCase();
  
  const rules = [
    { keywords: ['heart', 'chest', 'cardiac', 'stroke'], level: 'Critical', spec: 'Cardiology' },
    { keywords: ['brain', 'seizure', 'paralysis', 'head'], level: 'Critical', spec: 'Neurology' },
    { keywords: ['fracture', 'bone', 'accident', 'fall'], level: 'High', spec: 'Orthopedics' },
    { keywords: ['bleed', 'stab', 'gunshot', 'trauma'], level: 'Critical', spec: 'Trauma Surgery' },
    { keywords: ['fire', 'burn', 'acid'], level: 'High', spec: 'Burn Unit' },
    { keywords: ['child', 'baby', 'pediatric'], level: 'Medium', spec: 'Pediatrics' },
    { keywords: ['breath', 'asthma', 'lung'], level: 'High', spec: 'General Care' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(k => text.includes(k))) {
      return { severity: rule.level, specialization: rule.spec };
    }
  }

  return { severity: 'Medium', specialization: 'General Care' };
}

const db = {
  query,
  transaction,
  pool,
};

export default db;
