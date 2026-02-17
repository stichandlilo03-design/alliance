const { Redis } = require('@upstash/redis');
const fs = require('fs');
const path = require('path');

// ─── Persistent Storage via Upstash Redis ───
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Seed data directory (for initial load)
const SEED_DIR = path.join(__dirname, '..', 'data');

async function readJSON(key) {
  try {
    const data = await redis.get(key);
    if (data !== null && data !== undefined) {
      // @upstash/redis auto-parses JSON, so data may already be an object
      if (typeof data === 'string') {
        return JSON.parse(data);
      }
      return data;
    }

    // Key doesn't exist yet — load seed data
    const seedFile = path.join(SEED_DIR, key);
    if (fs.existsSync(seedFile)) {
      const seedData = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
      await redis.set(key, JSON.stringify(seedData));
      return seedData;
    }

    // No seed data either — start empty
    await redis.set(key, '[]');
    return [];
  } catch (err) {
    console.error(`readJSON error for ${key}:`, err);
    return [];
  }
}

async function writeJSON(key, data) {
  try {
    await redis.set(key, JSON.stringify(data));
  } catch (err) {
    console.error(`writeJSON error for ${key}:`, err);
  }
}

// ─── Response Helpers ───
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

// ─── Admin Credentials ───
const ADMIN_USERNAME = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASS || 'admin123';

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
        const users = await readJSON('users.json');

        const user = users.find(
          u => (u.username === username || u.email === username) && u.password === password
        );

        if (user) {
          const safeUser = { ...user };
          delete safeUser.password;
          return sendJSON(res, true, { user: safeUser });
        }
        return sendJSON(res, false, null, 'Invalid username or password');
      }

      // ──────────────── REGISTER ────────────────
      case 'register': {
        if (method !== 'POST') return sendJSON(res, false, null, 'Method not allowed', 405);
        const users = await readJSON('users.json');

        if (users.find(u => u.username === body.username)) {
          return sendJSON(res, false, null, 'Username already exists');
        }
        if (users.find(u => u.email === body.email)) {
          return sendJSON(res, false, null, 'Email already exists');
        }

        const newUser = {
          id: uniqid(),
          username: body.username || '',
          password: body.password || '',
          email: body.email || '',
          fullname: body.fullname || '',
          firstName: body.firstName || '',
          lastName: body.lastName || '',
          phone: body.phone || '',
          dob: body.dob || '',
          address: body.address || '',
          city: body.city || '',
          state: body.state || '',
          zip: body.zip || '',
          country: body.country || '',
          ssn: body.ssn || '',
          accountType: body.accountType || '',
          accountNumber: body.accountNumber || '',
          routingNumber: body.routingNumber || '',
          balance: parseFloat(body.balance || 0),
          checkingBalance: parseFloat(body.checkingBalance || 0),
          savingsBalance: parseFloat(body.savingsBalance || 0),
          transactions: [],
          marketing: body.marketing || false,
          status: body.status || 'active',
          taxCode: body.taxCode || '',
          createdAt: now(),
        };

        users.push(newUser);
        await writeJSON('users.json', users);

        const safeUser = { ...newUser };
        delete safeUser.password;
        return sendJSON(res, true, { user: safeUser });
      }

      // ──────────────── USER (get / update / delete) ────────────────
      case 'user': {
        const username = pathParts[1];
        if (!username) return sendJSON(res, false, null, 'Username required');

        const users = await readJSON('users.json');

        if (method === 'GET') {
          const user = users.find(u => u.username === username);
          if (!user) return sendJSON(res, false, null, 'User not found');
          const safeUser = { ...user };
          delete safeUser.password;
          return sendJSON(res, true, { user: safeUser });
        }

        if (method === 'PUT') {
          const idx = users.findIndex(u => u.username === username);
          if (idx === -1) return sendJSON(res, false, null, 'User not found');
          users[idx] = { ...users[idx], ...body };
          await writeJSON('users.json', users);
          const safeUser = { ...users[idx] };
          delete safeUser.password;
          return sendJSON(res, true, { user: safeUser });
        }

        if (method === 'DELETE') {
          const idx = users.findIndex(u => u.username === username);
          if (idx === -1) return sendJSON(res, false, null, 'User not found');
          users.splice(idx, 1);
          await writeJSON('users.json', users);
          return sendJSON(res, true, { message: 'User deleted' });
        }

        return sendJSON(res, false, null, 'Method not allowed', 405);
      }

      // ──────────────── USERS (list all - admin) ────────────────
      case 'users': {
        if (method !== 'GET') return sendJSON(res, false, null, 'Method not allowed', 405);
        const users = await readJSON('users.json');
        const safeUsers = users.map(u => {
          const copy = { ...u };
          delete copy.password;
          return copy;
        });
        return sendJSON(res, true, { users: safeUsers });
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

        const users = await readJSON('users.json');
        const idx = users.findIndex(u => u.username === username);
        if (idx === -1) return sendJSON(res, false, null, 'User not found');

        if (!users[idx].transactions) users[idx].transactions = [];

        const transaction = { ...body, id: uniqid(), date: now() };
        users[idx].transactions.push(transaction);
        await writeJSON('users.json', users);
        return sendJSON(res, true, { transaction });
      }

      // ──────────────── GET TRANSACTIONS ────────────────
      case 'transactions': {
        if (method !== 'GET') return sendJSON(res, false, null, 'Method not allowed', 405);
        const username = pathParts[1];
        if (!username) return sendJSON(res, false, null, 'Username required');

        const users = await readJSON('users.json');
        const user = users.find(u => u.username === username);
        if (!user) return sendJSON(res, false, null, 'User not found');
        return sendJSON(res, true, { transactions: user.transactions || [] });
      }

      // ──────────────── BALANCE UPDATE ────────────────
      case 'balance': {
        if (method !== 'PUT') return sendJSON(res, false, null, 'Method not allowed', 405);
        const username = pathParts[1];
        if (!username) return sendJSON(res, false, null, 'Username required');

        const users = await readJSON('users.json');
        const idx = users.findIndex(u => u.username === username);
        if (idx === -1) return sendJSON(res, false, null, 'User not found');

        users[idx].balance = parseFloat(body.balance);
        if (body.checkingBalance != null) users[idx].checkingBalance = parseFloat(body.checkingBalance);
        if (body.savingsBalance != null) users[idx].savingsBalance = parseFloat(body.savingsBalance);

        await writeJSON('users.json', users);
        return sendJSON(res, true, { balance: users[idx].balance });
      }

      // ──────────────── MONEYFLOW (CRUD) ────────────────
      case 'moneyflow': {
        const flows = await readJSON('moneyflow.json');

        if (method === 'GET') {
          return sendJSON(res, true, { flows });
        }

        if (method === 'POST') {
          const newFlow = { ...body, id: uniqid(), createdAt: now() };
          flows.push(newFlow);
          await writeJSON('moneyflow.json', flows);
          return sendJSON(res, true, { flow: newFlow });
        }

        if (method === 'PUT' && pathParts[1]) {
          const idx = flows.findIndex(f => f.id === pathParts[1]);
          if (idx === -1) return sendJSON(res, false, null, 'Flow not found');
          flows[idx].status = body.status;
          await writeJSON('moneyflow.json', flows);
          return sendJSON(res, true, { flow: flows[idx] });
        }

        if (method === 'DELETE' && pathParts[1]) {
          const idx = flows.findIndex(f => f.id === pathParts[1]);
          if (idx === -1) return sendJSON(res, false, null, 'Flow not found');
          flows.splice(idx, 1);
          await writeJSON('moneyflow.json', flows);
          return sendJSON(res, true, { message: 'Flow deleted' });
        }

        return sendJSON(res, false, null, 'Method not allowed', 405);
      }

      // ──────────────── CHECK DEPOSIT (CRUD) ────────────────
      case 'checkdeposit': {
        const checks = await readJSON('checkdeposits.json');

        if (method === 'GET') {
          return sendJSON(res, true, { checks });
        }

        if (method === 'POST') {
          const newCheck = { ...body, id: uniqid(), createdAt: now() };
          checks.push(newCheck);
          await writeJSON('checkdeposits.json', checks);
          return sendJSON(res, true, { check: newCheck });
        }

        if (method === 'PUT' && pathParts[1]) {
          const idx = checks.findIndex(c => c.id === pathParts[1]);
          if (idx === -1) return sendJSON(res, false, null, 'Check not found');
          checks[idx].status = body.status;
          await writeJSON('checkdeposits.json', checks);
          return sendJSON(res, true, { check: checks[idx] });
        }

        if (method === 'DELETE' && pathParts[1]) {
          const idx = checks.findIndex(c => c.id === pathParts[1]);
          if (idx === -1) return sendJSON(res, false, null, 'Check not found');
          checks.splice(idx, 1);
          await writeJSON('checkdeposits.json', checks);
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
