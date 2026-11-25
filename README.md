# KCC Holding Tax Management (HTMS)

Front end for Khulna City Corporation's Holding Tax Management System, built with React and Vite.

**Live demo:** https://alam689.github.io/KCC-Holding-Tax-Management/

Sign in with `alam`, `assessor` or `collector` and password `demo1234` (demo accounts only).

## What's in it

- Location registry: thana, wards, roads, buildings
- Holdings: taxpayers, field survey, assessment (annual value), ownership transfer
- Billing: quarterly bill generation with arrears, surcharge and rebate; printable bills
- Collections: payment against a bill, printable money receipt, cancellation
- Settings: business profile, users, roles & permissions, per-user overrides, codes, system config, activity log
- Dashboard: quarterly receivable vs collection, monthly collection, receivable vs collection pie

Data structures follow the `htms` PostgreSQL schema (same table and column names).

## Demo data

This is front end only. All data lives in the browser's localStorage and starts from built-in sample data
(synthetic names). Settings → Activity Log → *Reset demo data* restores it. Passwords are compared in plain
text for the demo; a real backend must authenticate against hashed passwords.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5175
npm run build      # production build in dist/
```

Pushing to `main` builds the site and publishes it to the `gh-pages` branch (see `.github/workflows/deploy.yml`).
