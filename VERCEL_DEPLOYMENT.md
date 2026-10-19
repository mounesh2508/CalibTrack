# Deploying CalibTrack on Vercel

This repository is configured for one-click deployment on **Vercel** with full static asset optimization, serverless API functions (`/api`), and dual PostgreSQL / MySQL database support.

---

## Quick Deploy (Vercel Dashboard)

1. Push this repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your repository.
4. Vercel automatically detects the framework settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `vite build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click **Deploy**.

---

## Database Configuration (PostgreSQL or MySQL)

CalibTrack supports **dual database connectivity**:

### Option 1: PostgreSQL (Recommended for Vercel)
You can connect any managed PostgreSQL provider (e.g. **Supabase**, **Neon**, or **Vercel Postgres**):
- In Vercel Project Settings -> **Environment Variables**, add:
  ```env
  POSTGRES_URL=postgresql://user:password@host:port/database?sslmode=require
  ```
  *(Or `DATABASE_URL`)*

### Option 2: MySQL
You can connect any managed MySQL provider (e.g. **PlanetScale**, **Aiven**, **AWS RDS**):
- In Vercel Project Settings -> **Environment Variables**, add:
  ```env
  DATABASE_URL=mysql://user:password@host:3306/database
  ```

### Option 3: Zero-Config Resilient In-Memory Mode
If no database environment variables are configured, CalibTrack **automatically activates its resilient laboratory store** pre-seeded with 15 verified laboratory instruments, ISO 17025 certificates, and full audit logs. The deployment will never crash on cold starts.

---

## Verifying Pre-Deployment Health Locally

Before deploying, you can run the automated end-to-end verification suite:

```bash
# 1. Type check
npm run lint

# 2. Production build verification
npm run build

# 3. End-to-end API and ML model verification
npm run test:e2e
```

All 11 automated test suites will execute and report passing status.
