# Alliance FCU — Banking Site Prototype

A full-featured online banking prototype with user dashboard, admin panel, and persistent database storage. Built with vanilla HTML/CSS/JS frontend and Node.js serverless backend, deployed on **Vercel** with **Supabase Postgres**.

---

## 🗂️ Project Structure

```
alliance-fcu/
│
├── api/
│   ├── _db.js              # Database connection helper (Supabase Postgres)
│   ├── index.js             # Main API — all endpoints (login, register, users, transactions, etc.)
│   └── setup.js             # Database setup — creates tables & seeds initial data
│
├── data/
│   ├── users.json           # Seed data (initial users, loaded on first setup)
│   ├── moneyflow.json       # Seed data (empty)
│   └── checkdeposits.json   # Seed data (empty)
│
├── config.js                # Frontend API helper — auto-detects Vercel vs cPanel
├── vercel.json              # Vercel routing config
├── package.json             # Node.js dependencies (pg)
│
├── index.html               # Landing page
├── login.html               # User login
├── signup.html              # User registration
├── dashboard.html           # User dashboard (fetches live data from API)
├── account-details.html     # Account details
├── transfer.html            # Money transfers
├── paybills.html            # Bill payments
├── deposit.html             # Check deposits
├── statements.html          # Account statements
├── settings.html            # User settings
│
├── admin-login.html         # Admin login
├── admin-dashboard.html     # Admin panel (manage users, balances, status, transactions, tax codes)
│
├── db-viewer.html           # Database viewer utility
├── api-test.html            # API testing utility
└── api.php                  # Legacy PHP backend (for cPanel hosting, ignored by Vercel)
```

---

## 🚀 Deploy to Vercel (Step-by-Step)

### Prerequisites
- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account (free tier works)

### Step 1: Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to your GitHub repo
3. Configure:
   - **Framework Preset:** `Other`
   - **Build Command:** *(leave empty)*
   - **Output Directory:** *(leave empty or `.`)*
4. Click **Deploy**

### Step 3: Create Supabase Database

1. In Vercel Dashboard → your project → **Storage** tab
2. Click **Create Database** → select **Supabase** (Postgres)
3. Follow the prompts to create the database
4. Vercel will auto-add environment variables

### Step 4: Verify Environment Variables

Go to **Settings → Environment Variables** and confirm these exist:

| Variable | Description |
|---|---|
| `POSTGRES_URL` | Main database connection string |
| `POSTGRES_URL_NON_POOLING` | Direct connection (preferred) |

> **If they're missing**, copy the connection string from Supabase and add manually:
>
> **Name:** `POSTGRES_URL`
> **Value:** `postgres://postgres.XXXXX:PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`

Also add this variable to fix SSL certificate issues:

| Variable | Value |
|---|---|
| `NODE_TLS_REJECT_UNAUTHORIZED` | `0` |

Make sure all variables are enabled for **Production**, **Preview**, and **Development**.

### Step 5: Redeploy

After adding env vars, redeploy:
- Go to **Deployments** tab → click ⋮ on latest → **Redeploy**

### Step 6: Run Database Setup

Visit this URL **once** in your browser:

```
https://YOUR-PROJECT.vercel.app/api/setup
```

You should see:
```json
{"success": true, "message": "Database setup complete! 2 seed users loaded."}
```

This creates the `users`, `moneyflow`, and `checkdeposits` tables and loads seed data.

### Step 7: Test

- **User signup:** `https://YOUR-PROJECT.vercel.app/signup.html`
- **User login:** `https://YOUR-PROJECT.vercel.app/login.html`
- **Admin login:** `https://YOUR-PROJECT.vercel.app/admin-login.html`
  - Default credentials: `admin` / `admin123`

---

## 🔑 Admin Credentials

| Username | Password |
|---|---|
| `admin` | `admin123` |

To change admin credentials, set these environment variables in Vercel:

| Variable | Value |
|---|---|
| `ADMIN_USER` | your_admin_username |
| `ADMIN_PASS` | your_admin_password |

---

## 📡 API Endpoints

All endpoints use the format: `/api?endpoint=ENDPOINT_NAME`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `login` | User login |
| `POST` | `register` | User registration |
| `GET` | `user/{username}` | Get user data |
| `PUT` | `user/{username}` | Update user |
| `DELETE` | `user/{username}` | Delete user |
| `GET` | `users` | List all users (admin) |
| `POST` | `admin/login` | Admin login |
| `POST` | `transaction/{username}` | Add transaction |
| `GET` | `transactions/{username}` | Get user transactions |
| `PUT` | `balance/{username}` | Update balance |
| `GET/POST/PUT/DELETE` | `moneyflow` | Money flow management |
| `GET/POST/PUT/DELETE` | `checkdeposit` | Check deposit management |
| `GET` | `/api/setup` | Create tables & seed data |

---

## 🛡️ Admin Features

- **User Management** — Edit user info, balance, delete accounts
- **Transaction Management** — Add, edit, delete transactions for any user
- **Account Status Control** — Set accounts to:
  - ✅ **Active** — Full access
  - ⚠️ **Restricted** — View only, no transactions
  - ❄️ **Frozen** — Logged in but everything disabled
  - 🚫 **Suspended** — Suspension notice, no features
  - 🔒 **Closed** — Permanently closed
- **Tax Code Management** — Assign/edit tax codes per user
- **Dashboard Stats** — Total users, balances, pending deposits, flagged accounts

---

## 🔄 Switching Back to cPanel

The `config.js` auto-detects the hosting environment:
- On **Vercel** → routes to `/api` (serverless functions)
- On **cPanel** → routes to `api.php` (PHP backend)

To host on cPanel, just upload all files. The `api.php` file is still included and works as-is. No changes needed.

---

## ⚠️ Important Notes

1. **Run `/api/setup` after every fresh deploy** — This creates database tables. It's safe to run multiple times (won't overwrite existing data).

2. **Passwords are stored in plain text** — This is a prototype. For production, use bcrypt hashing.

3. **No real authentication tokens** — Sessions use localStorage. For production, implement JWT tokens.

4. **Admin auth is basic** — Credentials are checked against env vars. For production, use a proper auth system.

5. **Database is persistent** — Unlike the old `/tmp` file storage, Supabase Postgres keeps all data permanently across deployments.

---

## 🛠️ Local Development

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run locally
vercel dev
```

Then open `http://localhost:3000`

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js Serverless Functions (Vercel) |
| Database | Supabase Postgres |
| Hosting | Vercel |
| Fallback Backend | PHP (for cPanel hosting) |
