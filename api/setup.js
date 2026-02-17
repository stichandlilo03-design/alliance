const { query } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ─── Create Tables ───
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        fullname TEXT DEFAULT '',
        first_name TEXT DEFAULT '',
        last_name TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        dob TEXT DEFAULT '',
        address TEXT DEFAULT '',
        city TEXT DEFAULT '',
        state TEXT DEFAULT '',
        zip TEXT DEFAULT '',
        country TEXT DEFAULT '',
        ssn TEXT DEFAULT '',
        account_type TEXT DEFAULT '',
        account_number TEXT DEFAULT '',
        routing_number TEXT DEFAULT '',
        balance DOUBLE PRECISION DEFAULT 0,
        checking_balance DOUBLE PRECISION DEFAULT 0,
        savings_balance DOUBLE PRECISION DEFAULT 0,
        transactions JSONB DEFAULT '[]'::jsonb,
        marketing BOOLEAN DEFAULT false,
        status TEXT DEFAULT 'active',
        tax_code TEXT DEFAULT '',
        status_reason TEXT DEFAULT '',
        created_at TEXT DEFAULT ''
      );
    `);

    // Add status_reason column if it doesn't exist (for existing tables)
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'status_reason'
        ) THEN
          ALTER TABLE users ADD COLUMN status_reason TEXT DEFAULT '';
        END IF;
      END $$;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS moneyflow (
        id TEXT PRIMARY KEY,
        username TEXT DEFAULT '',
        type TEXT DEFAULT '',
        amount DOUBLE PRECISION DEFAULT 0,
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        data JSONB DEFAULT '{}'::jsonb,
        created_at TEXT DEFAULT ''
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS checkdeposits (
        id TEXT PRIMARY KEY,
        username TEXT DEFAULT '',
        amount DOUBLE PRECISION DEFAULT 0,
        check_number TEXT DEFAULT '',
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        image TEXT DEFAULT '',
        data JSONB DEFAULT '{}'::jsonb,
        created_at TEXT DEFAULT ''
      );
    `);

    // ─── Seed Users (only if empty) ───
    const result = await query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      await query(`
        INSERT INTO users (id, username, password, email, fullname, first_name, last_name, phone, dob, address, city, state, zip, country, ssn, account_type, account_number, routing_number, balance, checking_balance, savings_balance, transactions, marketing, status, tax_code, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
      `, [
        '69365c10b328a', 'stevenkilan154', 'Goodlife8179@', 'stevenkila@gmail.com',
        'steven kilan', 'steven', 'kilan', '8036301295', '1990-10-12',
        '27 1231 The Bronx', 'Bronx County', 'NY', '10456', 'USA', '4478',
        'both', '****4007', '021000021', 45000000, 0, 0,
        JSON.stringify([{"id":"693660676f618","type":"deposit","amount":45000000,"description":"Mobile Deposit #728372892","date":"2025-12-08 13:21:43","status":"approved"}]),
        true, 'active', '', '2025-12-08 13:03:12'
      ]);

      await query(`
        INSERT INTO users (id, username, password, email, fullname, first_name, last_name, phone, dob, address, city, state, zip, country, ssn, account_type, account_number, routing_number, balance, checking_balance, savings_balance, transactions, marketing, status, tax_code, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
      `, [
        '6936cbd3ee503', 'ghchinter0011', 'Elephant01$', 'ghchinter@gmail.com',
        'Charles  Hintermeister', 'Charles ', 'Hintermeister', '9736199491', '1955-12-04',
        '37 no way', 'North berwick', 'ME', '03906', 'USA', '1070',
        'checking', '****2739', '021000021', 52000000, 0, 0,
        JSON.stringify([{"id":"6936cca4dc369","type":"deposit","amount":52000000,"description":"Mobile Deposit #728372892","date":"2025-12-08 21:03:32","status":"approved"}]),
        true, 'active', '', '2025-12-08 21:00:03'
      ]);
    }

    return res.status(200).json({
      success: true,
      message: `Database setup complete! ${count === 0 ? '2 seed users loaded.' : 'Tables already existed, no seed needed.'}`
    });
  } catch (err) {
    console.error('Setup error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
