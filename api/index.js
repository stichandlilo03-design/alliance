const { sql } = require('@vercel/postgres');

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

// Convert DB row (snake_case) → frontend format (camelCase)
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

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASS || 'admin123';

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
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

        const { rows } = await sql`
          SELECT * FROM users
          WHERE (username = ${username} OR email = ${username})
          AND password = ${password}
          LIMIT 1
        `;

        if (rows.length > 0) {
          return sendJSON(res, true, { user: safeUser(rowToUser(rows[0])) });
        }
        return sendJSON(res, false, null, 'Invalid username or password');
      }

      // ──────────────── REGISTER ────────────────
      case 'register': {
        if (method !== 'POST') return sendJSON(res, false, null, 'Method not allowed', 405);

        // Check username
        const { rows: existUser } = await sql`
          SELECT id FROM users WHERE username = ${body.username} LIMIT 1
        `;
        if (existUser.length > 0) return sendJSON(res, false, null, 'Username already exists');

        // Check email
        const { rows: existEmail } = await sql`
          SELECT id FROM users WHERE email = ${body.email} LIMIT 1
        `;
        if (existEmail.length > 0) return sendJSON(res, false, null, 'Email already exists');

        const id = uniqid();
        const createdAt = now();

        await sql`
          INSERT INTO users (
            id, username, password, email, fullname, first_name, last_name,
            phone, dob, address, city, state, zip, country, ssn,
            account_type, account_number, routing_number,
            balance, checking_balance, savings_balance,
            transactions, marketing, status, tax_code, created_at
          ) VALUES (
            ${id}, ${body.username || ''}, ${body.password || ''}, ${body.email || ''},
            ${body.fullname || ''}, ${body.firstName || ''}, ${body.lastName || ''},
            ${body.phone || ''}, ${body.dob || ''}, ${body.address || ''},
            ${body.city || ''}, ${body.state || ''}, ${body.zip || ''},
            ${body.country || ''}, ${body.ssn || ''},
            ${body.accountType || ''}, ${body.accountNumber || ''}, ${body.routingNumber || ''},
            ${parseFloat(body.balance || 0)}, ${parseFloat(body.checkingBalance || 0)}, ${parseFloat(body.savingsBalance || 0)},
            '[]'::jsonb, ${body.marketing || false}, ${body.status || 'active'},
            ${body.taxCode || ''}, ${createdAt}
          )
        `;

        const { rows } = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
        return sendJSON(res, true, { user: safeUser(rowToUser(rows[0])) });
      }

      // ──────────────── USER (get / update / delete) ────────────────
      case 'user': {
        const username = pathParts[1];
        if (!username) return sendJSON(res, false, null, 'Username required');

        if (method === 'GET') {
          const { rows } = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
          if (rows.length === 0) return sendJSON(res, false, null, 'User not found');
          return sendJSON(res, true, { user: safeUser(rowToUser(rows[0])) });
        }

        if (method === 'PUT') {
          // Check user exists
          const { rows: existing } = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
          if (existing.length === 0) return sendJSON(res, false, null, 'User not found');

          const current = rowToUser(existing[0]);
          const merged = { ...current, ...body };

          await sql`
            UPDATE users SET
              fullname = ${merged.fullname || ''},
              first_name = ${merged.firstName || ''},
              last_name = ${merged.lastName || ''},
              phone = ${merged.phone || ''},
              dob = ${merged.dob || ''},
              address = ${merged.address || ''},
              city = ${merged.city || ''},
              state = ${merged.state || ''},
              zip = ${merged.zip || ''},
              country = ${merged.country || ''},
              ssn = ${merged.ssn || ''},
              account_type = ${merged.accountType || ''},
              account_number = ${merged.accountNumber || ''},
              routing_number = ${merged.routingNumber || ''},
              balance = ${parseFloat(merged.balance || 0)},
              checking_balance = ${parseFloat(merged.checkingBalance || 0)},
              savings_balance = ${parseFloat(merged.savingsBalance || 0)},
              transactions = ${JSON.stringify(merged.transactions || [])}::jsonb,
              marketing = ${merged.marketing || false},
              status = ${merged.status || 'active'},
              tax_code = ${merged.taxCode || ''}
            WHERE username = ${username}
          `;

          const { rows } = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
          return sendJSON(res, true, { user: safeUser(rowToUser(rows[0])) });
        }

        if (method === 'DELETE') {
          const { rowCount } = await sql`DELETE FROM users WHERE username = ${username}`;
          if (rowCount === 0) return sendJSON(res, false, null, 'User not found');
          return sendJSON(res, true, { message: 'User deleted' });
        }

        return sendJSON(res, false, null, 'Method not allowed', 405);
      }

      // ──────────────── USERS (list all - admin) ────────────────
      case 'users': {
        if (method !== 'GET') return sendJSON(res, false, null, 'Method not allowed', 405);
        const { rows } = await sql`SELECT * FROM users ORDER BY created_at DESC`;
        const users = rows.map(r => safeUser(rowToUser(r)));
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

        const { rows: existing } = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
        if (existing.length === 0) return sendJSON(res, false, null, 'User not found');

        const currentTxns = existing[0].transactions || [];
        const transaction = { ...body, id: uniqid(), date: now() };
        currentTxns.push(transaction);

        await sql`
          UPDATE users SET transactions = ${JSON.stringify(currentTxns)}::jsonb
          WHERE username = ${username}
        `;

        return sendJSON(res, true, { transaction });
      }

      // ──────────────── GET TRANSACTIONS ────────────────
      case 'transactions': {
        if (method !== 'GET') return sendJSON(res, false, null, 'Method not allowed', 405);
        const username = pathParts[1];
        if (!username) return sendJSON(res, false, null, 'Username required');

        const { rows } = await sql`SELECT transactions FROM users WHERE username = ${username} LIMIT 1`;
        if (rows.length === 0) return sendJSON(res, false, null, 'User not found');
        return sendJSON(res, true, { transactions: rows[0].transactions || [] });
      }

      // ──────────────── BALANCE UPDATE ────────────────
      case 'balance': {
        if (method !== 'PUT') return sendJSON(res, false, null, 'Method not allowed', 405);
        const username = pathParts[1];
        if (!username) return sendJSON(res, false, null, 'Username required');

        const balance = parseFloat(body.balance);
        const checkingBalance = body.checkingBalance != null ? parseFloat(body.checkingBalance) : null;
        const savingsBalance = body.savingsBalance != null ? parseFloat(body.savingsBalance) : null;

        // Build update
        if (checkingBalance !== null && savingsBalance !== null) {
          await sql`
            UPDATE users SET balance = ${balance}, checking_balance = ${checkingBalance}, savings_balance = ${savingsBalance}
            WHERE username = ${username}
          `;
        } else if (checkingBalance !== null) {
          await sql`
            UPDATE users SET balance = ${balance}, checking_balance = ${checkingBalance}
            WHERE username = ${username}
          `;
        } else if (savingsBalance !== null) {
          await sql`
            UPDATE users SET balance = ${balance}, savings_balance = ${savingsBalance}
            WHERE username = ${username}
          `;
        } else {
          await sql`
            UPDATE users SET balance = ${balance}
            WHERE username = ${username}
          `;
        }

        return sendJSON(res, true, { balance });
      }

      // ──────────────── MONEYFLOW (CRUD) ────────────────
      case 'moneyflow': {
        if (method === 'GET') {
          const { rows } = await sql`SELECT * FROM moneyflow ORDER BY created_at DESC`;
          const flows = rows.map(rowToFlow);
          return sendJSON(res, true, { flows });
        }

        if (method === 'POST') {
          const id = uniqid();
          const createdAt = now();
          // Store known fields in columns, everything else in data jsonb
          const { username, type, amount, description, status, ...extra } = body;

          await sql`
            INSERT INTO moneyflow (id, username, type, amount, description, status, data, created_at)
            VALUES (
              ${id}, ${username || ''}, ${type || ''}, ${parseFloat(amount || 0)},
              ${description || ''}, ${status || 'pending'}, ${JSON.stringify(extra)}::jsonb, ${createdAt}
            )
          `;

          const { rows } = await sql`SELECT * FROM moneyflow WHERE id = ${id}`;
          return sendJSON(res, true, { flow: rowToFlow(rows[0]) });
        }

        if (method === 'PUT' && pathParts[1]) {
          const flowId = pathParts[1];
          await sql`UPDATE moneyflow SET status = ${body.status} WHERE id = ${flowId}`;
          const { rows } = await sql`SELECT * FROM moneyflow WHERE id = ${flowId}`;
          if (rows.length === 0) return sendJSON(res, false, null, 'Flow not found');
          return sendJSON(res, true, { flow: rowToFlow(rows[0]) });
        }

        if (method === 'DELETE' && pathParts[1]) {
          const flowId = pathParts[1];
          const { rowCount } = await sql`DELETE FROM moneyflow WHERE id = ${flowId}`;
          if (rowCount === 0) return sendJSON(res, false, null, 'Flow not found');
          return sendJSON(res, true, { message: 'Flow deleted' });
        }

        return sendJSON(res, false, null, 'Method not allowed', 405);
      }

      // ──────────────── CHECK DEPOSIT (CRUD) ────────────────
      case 'checkdeposit': {
        if (method === 'GET') {
          const { rows } = await sql`SELECT * FROM checkdeposits ORDER BY created_at DESC`;
          const checks = rows.map(rowToCheck);
          return sendJSON(res, true, { checks });
        }

        if (method === 'POST') {
          const id = uniqid();
          const createdAt = now();
          const { username, amount, checkNumber, description, status, image, ...extra } = body;

          await sql`
            INSERT INTO checkdeposits (id, username, amount, check_number, description, status, image, data, created_at)
            VALUES (
              ${id}, ${username || ''}, ${parseFloat(amount || 0)}, ${checkNumber || ''},
              ${description || ''}, ${status || 'pending'}, ${image || ''},
              ${JSON.stringify(extra)}::jsonb, ${createdAt}
            )
          `;

          const { rows } = await sql`SELECT * FROM checkdeposits WHERE id = ${id}`;
          return sendJSON(res, true, { check: rowToCheck(rows[0]) });
        }

        if (method === 'PUT' && pathParts[1]) {
          const checkId = pathParts[1];
          await sql`UPDATE checkdeposits SET status = ${body.status} WHERE id = ${checkId}`;
          const { rows } = await sql`SELECT * FROM checkdeposits WHERE id = ${checkId}`;
          if (rows.length === 0) return sendJSON(res, false, null, 'Check not found');
          return sendJSON(res, true, { check: rowToCheck(rows[0]) });
        }

        if (method === 'DELETE' && pathParts[1]) {
          const checkId = pathParts[1];
          const { rowCount } = await sql`DELETE FROM checkdeposits WHERE id = ${checkId}`;
          if (rowCount === 0) return sendJSON(res, false, null, 'Check not found');
          return sendJSON(res, true, { message: 'Check deleted' });
        }

        return sendJSON(res, false, null, 'Method not allowed', 405);
      }

      // ──────────────── DEFAULT ────────────────
      default:
        return sendJSON(res, false, null, 'Endpoint not found', 404);
    }
  } catch (err) {
    console.error('Server error:', err);
    return sendJSON(res, false, null, 'Internal server error: ' + err.message, 500);
  }
};
