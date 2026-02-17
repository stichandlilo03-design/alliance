const { query } = require('./_db');

// ─── Helpers ───
function sendJSON(res, success, data = null, error = null, status = 200) {
  res.status(status).json({ success, data, error });
}

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function uniqid() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

function now() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function rowToUser(row) {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    email: row.email,
    fullname: row.fullname,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    dob: row.dob,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    country: row.country,
    ssn: row.ssn,
    accountType: row.account_type,
    accountNumber: row.account_number,
    routingNumber: row.routing_number,
    balance: row.balance,
    checkingBalance: row.checking_balance,
    savingsBalance: row.savings_balance,
    transactions: row.transactions || [],
    marketing: row.marketing,
    status: row.status,
    taxCode: row.tax_code,
    statusReason: row.status_reason || '',
    createdAt: row.created_at,
  };
}

function safeUser(user) {
  const copy = { ...user };
  delete copy.password;
  return copy;
}

function rowToFlow(row) {
  return {
    id: row.id,
    username: row.username || '',
    type: row.type || '',
    amount: row.amount || 0,
    description: row.description || '',
    status: row.status || 'pending',
    createdAt: row.created_at,
    ...(row.data || {}),
  };
}

function rowToCheck(row) {
  return {
    id: row.id,
    username: row.username || '',
    amount: row.amount || 0,
    checkNumber: row.check_number || '',
    description: row.description || '',
    status: row.status || 'pending',
    image: row.image || '',
    createdAt: row.created_at,
    ...(row.data || {}),
  };
}

const ADMIN_USERNAME = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASS || 'admin123';

// ═══════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const method = req.method;
  const endpointParam = req.query.endpoint || '';
  const pathParts = endpointParam.split('/').filter(Boolean);
  const endpoint = pathParts[0] || '';
  const body = req.body || {};

  try {
    switch (endpoint) {

      // ──────────────── LOGIN ────────────────
      case 'login': {
        if (method !== 'POST') return sendJSON(res, false, null, 'Method not allowed', 405);
        const { username, password } = body;

        const result = await query(
          'SELECT * FROM users WHERE (username = $1 OR email = $1) AND password = $2 LIMIT 1',
          [username, password]
        );

        if (result.rows.length > 0) {
          return sendJSON(res, true, { user: safeUser(rowToUser(result.rows[0])) });
        }
        return sendJSON(res, false, null, 'Invalid username or password');
      }

      // ──────────────── REGISTER ────────────────
      case 'register': {
        if (method !== 'POST') return sendJSON(res, false, null, 'Method not allowed', 405);

        const r1 = await query('SELECT id FROM users WHERE username = $1 LIMIT 1', [body.username]);
        if (r1.rows.length > 0) return sendJSON(res, false, null, 'Username already exists');

        const r2 = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [body.email]);
        if (r2.rows.length > 0) return sendJSON(res, false, null, 'Email already exists');

        const id = uniqid();
        const createdAt = now();

        await query(`
          INSERT INTO users (id, username, password, email, fullname, first_name, last_name,
            phone, dob, address, city, state, zip, country, ssn,
            account_type, account_number, routing_number,
            balance, checking_balance, savings_balance,
            transactions, marketing, status, tax_code, status_reason, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
        `, [
          id, body.username || '', body.password || '', body.email || '',
          body.fullname || '', body.firstName || '', body.lastName || '',
          body.phone || '', body.dob || '', body.address || '',
          body.city || '', body.state || '', body.zip || '',
          body.country || '', body.ssn || '',
          body.accountType || '', body.accountNumber || '', body.routingNumber || '',
          parseFloat(body.balance || 0), parseFloat(body.checkingBalance || 0), parseFloat(body.savingsBalance || 0),
          '[]', body.marketing || false, body.status || 'active',
          body.taxCode || '', body.statusReason || '', createdAt
        ]);

        const result = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
        return sendJSON(res, true, { user: safeUser(rowToUser(result.rows[0])) });
      }

      // ──────────────── USER (get/update/delete) ────────────────
      case 'user': {
        const username = pathParts[1];
        if (!username) return sendJSON(res, false, null, 'Username required');

        if (method === 'GET') {
          const result = await query('SELECT * FROM users WHERE username = $1 LIMIT 1', [username]);
          if (result.rows.length === 0) return sendJSON(res, false, null, 'User not found');
          return sendJSON(res, true, { user: safeUser(rowToUser(result.rows[0])) });
        }

        if (method === 'PUT') {
          const existing = await query('SELECT * FROM users WHERE username = $1 LIMIT 1', [username]);
          if (existing.rows.length === 0) return sendJSON(res, false, null, 'User not found');

          const current = rowToUser(existing.rows[0]);
          const merged = { ...current, ...body };

          await query(`
            UPDATE users SET
              fullname = $1, first_name = $2, last_name = $3,
              phone = $4, dob = $5, address = $6,
              city = $7, state = $8, zip = $9,
              country = $10, ssn = $11,
              account_type = $12, account_number = $13, routing_number = $14,
              balance = $15, checking_balance = $16, savings_balance = $17,
              transactions = $18::jsonb, marketing = $19, status = $20, tax_code = $21,
              status_reason = $22
            WHERE username = $23
          `, [
            merged.fullname || '', merged.firstName || '', merged.lastName || '',
            merged.phone || '', merged.dob || '', merged.address || '',
            merged.city || '', merged.state || '', merged.zip || '',
            merged.country || '', merged.ssn || '',
            merged.accountType || '', merged.accountNumber || '', merged.routingNumber || '',
            parseFloat(merged.balance || 0), parseFloat(merged.checkingBalance || 0), parseFloat(merged.savingsBalance || 0),
            JSON.stringify(merged.transactions || []), merged.marketing || false,
            merged.status || 'active', merged.taxCode || '',
            merged.statusReason || '',
            username
          ]);

          const result = await query('SELECT * FROM users WHERE username = $1 LIMIT 1', [username]);
          return sendJSON(res, true, { user: safeUser(rowToUser(result.rows[0])) });
        }

        if (method === 'DELETE') {
          const result = await query('DELETE FROM users WHERE username = $1', [username]);
          if (result.rowCount === 0) return sendJSON(res, false, null, 'User not found');
          return sendJSON(res, true, { message: 'User deleted' });
        }

        return sendJSON(res, false, null, 'Method not allowed', 405);
      }

      // ──────────────── USERS (admin list) ────────────────
      case 'users': {
        if (method !== 'GET') return sendJSON(res, false, null, 'Method not allowed', 405);
        const result = await query('SELECT * FROM users ORDER BY created_at DESC');
        const users = result.rows.map(r => safeUser(rowToUser(r)));
        return sendJSON(res, true, { users });
      }

      // ──────────────── ADMIN LOGIN ────────────────
      case 'admin': {
        if (pathParts[1] === 'login' && method === 'POST') {
          const { username, password } = body;
          if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            return sendJSON(res, true, { admin: { username: ADMIN_USERNAME } });
          }
          return sendJSON(res, false, null, 'Invalid admin credentials');
        }
        return sendJSON(res, false, null, 'Endpoint not found');
      }

      // ──────────────── ADD TRANSACTION ────────────────
      case 'transaction': {
        if (method !== 'POST') return sendJSON(res, false, null, 'Method not allowed', 405);
        const username = pathParts[1];
        if (!username) return sendJSON(res, false, null, 'Username required');

        const existing = await query('SELECT transactions FROM users WHERE username = $1 LIMIT 1', [username]);
        if (existing.rows.length === 0) return sendJSON(res, false, null, 'User not found');

        const txns = existing.rows[0].transactions || [];
        const transaction = { ...body, id: uniqid(), date: now() };
        txns.push(transaction);

        await query('UPDATE users SET transactions = $1::jsonb WHERE username = $2', [JSON.stringify(txns), username]);
        return sendJSON(res, true, { transaction });
      }

      // ──────────────── GET TRANSACTIONS ────────────────
      case 'transactions': {
        if (method !== 'GET') return sendJSON(res, false, null, 'Method not allowed', 405);
        const username = pathParts[1];
        if (!username) return sendJSON(res, false, null, 'Username required');

        const result = await query('SELECT transactions FROM users WHERE username = $1 LIMIT 1', [username]);
        if (result.rows.length === 0) return sendJSON(res, false, null, 'User not found');
        return sendJSON(res, true, { transactions: result.rows[0].transactions || [] });
      }

      // ──────────────── BALANCE UPDATE ────────────────
      case 'balance': {
        if (method !== 'PUT') return sendJSON(res, false, null, 'Method not allowed', 405);
        const username = pathParts[1];
        if (!username) return sendJSON(res, false, null, 'Username required');

        const balance = parseFloat(body.balance);
        const checkBal = body.checkingBalance != null ? parseFloat(body.checkingBalance) : null;
        const saveBal = body.savingsBalance != null ? parseFloat(body.savingsBalance) : null;

        if (checkBal !== null && saveBal !== null) {
          await query('UPDATE users SET balance=$1, checking_balance=$2, savings_balance=$3 WHERE username=$4',
            [balance, checkBal, saveBal, username]);
        } else if (checkBal !== null) {
          await query('UPDATE users SET balance=$1, checking_balance=$2 WHERE username=$3',
            [balance, checkBal, username]);
        } else if (saveBal !== null) {
          await query('UPDATE users SET balance=$1, savings_balance=$2 WHERE username=$3',
            [balance, saveBal, username]);
        } else {
          await query('UPDATE users SET balance=$1 WHERE username=$2', [balance, username]);
        }

        return sendJSON(res, true, { balance });
      }

      // ──────────────── MONEYFLOW ────────────────
      case 'moneyflow': {
        if (method === 'GET') {
          const result = await query('SELECT * FROM moneyflow ORDER BY created_at DESC');
          return sendJSON(res, true, { flows: result.rows.map(rowToFlow) });
        }

        if (method === 'POST') {
          const id = uniqid();
          const createdAt = now();
          const { username, type, amount, description, status, ...extra } = body;

          await query(`
            INSERT INTO moneyflow (id, username, type, amount, description, status, data, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          `, [id, username||'', type||'', parseFloat(amount||0), description||'', status||'pending', JSON.stringify(extra), createdAt]);

          const result = await query('SELECT * FROM moneyflow WHERE id = $1', [id]);
          return sendJSON(res, true, { flow: rowToFlow(result.rows[0]) });
        }

        if (method === 'PUT' && pathParts[1]) {
          await query('UPDATE moneyflow SET status=$1 WHERE id=$2', [body.status, pathParts[1]]);
          const result = await query('SELECT * FROM moneyflow WHERE id=$1', [pathParts[1]]);
          if (result.rows.length === 0) return sendJSON(res, false, null, 'Flow not found');
          return sendJSON(res, true, { flow: rowToFlow(result.rows[0]) });
        }

        if (method === 'DELETE' && pathParts[1]) {
          const result = await query('DELETE FROM moneyflow WHERE id=$1', [pathParts[1]]);
          if (result.rowCount === 0) return sendJSON(res, false, null, 'Flow not found');
          return sendJSON(res, true, { message: 'Flow deleted' });
        }

        return sendJSON(res, false, null, 'Method not allowed', 405);
      }

      // ──────────────── CHECK DEPOSIT ────────────────
      case 'checkdeposit': {
        if (method === 'GET') {
          const result = await query('SELECT * FROM checkdeposits ORDER BY created_at DESC');
          return sendJSON(res, true, { checks: result.rows.map(rowToCheck) });
        }

        if (method === 'POST') {
          const id = uniqid();
          const createdAt = now();
          const { username, amount, checkNumber, description, status, image, ...extra } = body;

          await query(`
            INSERT INTO checkdeposits (id, username, amount, check_number, description, status, image, data, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          `, [id, username||'', parseFloat(amount||0), checkNumber||'', description||'', status||'pending', image||'', JSON.stringify(extra), createdAt]);

          const result = await query('SELECT * FROM checkdeposits WHERE id=$1', [id]);
          return sendJSON(res, true, { check: rowToCheck(result.rows[0]) });
        }

        if (method === 'PUT' && pathParts[1]) {
          await query('UPDATE checkdeposits SET status=$1 WHERE id=$2', [body.status, pathParts[1]]);
          const result = await query('SELECT * FROM checkdeposits WHERE id=$1', [pathParts[1]]);
          if (result.rows.length === 0) return sendJSON(res, false, null, 'Check not found');
          return sendJSON(res, true, { check: rowToCheck(result.rows[0]) });
        }

        if (method === 'DELETE' && pathParts[1]) {
          const result = await query('DELETE FROM checkdeposits WHERE id=$1', [pathParts[1]]);
          if (result.rowCount === 0) return sendJSON(res, false, null, 'Check not found');
          return sendJSON(res, true, { message: 'Check deleted' });
        }

        return sendJSON(res, false, null, 'Method not allowed', 405);
      }

      default:
        return sendJSON(res, false, null, 'Endpoint not found', 404);
    }
  } catch (err) {
    console.error('Server error:', err);
    return sendJSON(res, false, null, 'Internal server error: ' + err.message, 500);
  }
};
