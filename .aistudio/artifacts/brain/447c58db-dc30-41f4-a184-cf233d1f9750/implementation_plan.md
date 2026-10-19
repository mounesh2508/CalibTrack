# Vercel Deployment Readiness & End-to-End Verification Plan

Prepare CalibTrack for production deployment on Vercel with external PostgreSQL / MySQL database connectivity, serverless API optimizations, automated end-to-end test verification, and complete deployment configuration.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions have been confirmed for the Vercel deployment:
> - **Database Architecture**: Full support for **external PostgreSQL** (Supabase, Neon, Vercel Postgres) and **MySQL** (PlanetScale, Aiven, RDS), with an automated fallback to the in-memory laboratory store if credentials are missing or temporarily unreachable, preventing any serverless crashes.
> - **Testing Scope**: A **full end-to-end test suite** validating the production Vite build, TypeScript type integrity, serverless route handlers, and ML prediction endpoints.

---

## 1. Overview & Core Concept

- **What It Does**: Hardens CalibTrack for seamless one-click Vercel deployment, allowing the application to operate as a high-performance static frontend powered by serverless backend endpoints with resilient database pooling.
- **Target Persona**: Lab Administrators and Metrology Teams deploying CalibTrack into production environments.
- **Key Value**:
  - **Zero Serverless Failures**: Handles cold starts, connection pooling timeouts, and database disconnects gracefully.
  - **Dual Database Flexibility**: Supports standard connection strings for both PostgreSQL (`postgres://` / `postgresql://`) and MySQL (`mysql://`).
  - **Verified Production Bundle**: Ensures error-free static compilation and valid client routing.

---

## 2. User Experience & Visual Design

- **Status & Health Monitoring**:
  - The application dashboard and settings automatically report live database connection health (e.g. `PostgreSQL Pool Connected`, `MySQL Connected`, or `Resilient Lab Store Active`).
- **Smooth SPA Routing on Vercel**:
  - Clean client-side navigation between `/dashboard`, `/equipment`, `/calibration`, `/reports`, `/calendar`, and `/settings` without 404s on page refresh via `vercel.json` rewrite rules.
- **Instant Response Times**:
  - Serverless cold-start mitigation with cached database initialization promises and streamlined asset delivery.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Universal PostgreSQL & MySQL Connection Driver**:
  - *Chosen Approach*: Support both `pg` (PostgreSQL) and `mysql2` (MySQL) connection strings through a unified database client adapter in `server/database/config.ts`.
  - *Why*: Gives users complete freedom to plug in any hosted database (Supabase, Neon, AWS RDS, PlanetScale) by just setting `DATABASE_URL` in Vercel environment variables.
- **Decision 2: Serverless Connection Pooling Limits**:
  - *Chosen Approach*: Enforce max connection pool size (`connectionLimit: 1` to `5`) suited for serverless microVM environments to prevent exhausting database connection pools under concurrent lambdas.
- **Decision 3: Standalone Automated Test Runner**:
  - *Chosen Approach*: Create `scripts/test-e2e.ts` that boots and tests all REST routes, ML prediction endpoints, and verify `npm run build` synchronously before deployment.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Vercel Deployment Model                         │
│                                                                        │
│   ┌───────────────────────────┐    ┌────────────────────────────────┐  │
│   │    Static Client SPA      │    │    Serverless API Function     │  │
│   │  (Vite Build -> dist/)    │    │      (api/index.ts)            │  │
│   │   - React 19 Frontend     │    │   - Express 4.x Sub-App        │  │
│   │   - Tailwind CSS v4       │    │   - ML Recommendation Engine   │  │
│   │   - Static Asset Cache    │    │   - Auth & Reminder Dispatch   │  │
│   └─────────────┬─────────────┘    └───────────────┬────────────────┘  │
│                 │                                  │                   │
│                 ▼                                  ▼                   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               vercel.json Rewrites & Headers                   │   │
│   │   /api/*  -> api/index.ts (Serverless Express Handler)         │   │
│   │   /*      -> /index.html (Client Single Page App Router)       │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    ┌───────────────────────────┐           ┌───────────────────────────┐
    │    External Database      │           │    Resilient In-Memory    │
    │  - PostgreSQL / Supabase  │   (or)    │    Laboratory Store       │
    │  - MySQL / PlanetScale    │           │  - 15 Instruments         │
    │  (via DATABASE_URL)       │           │  - Full Audit History     │
    └───────────────────────────┘           └───────────────────────────┘
```

---

## 5. Implementation Roadmap

1. **Universal Database Connectivity (`server/database/config.ts`)**:
   - Add PostgreSQL support via `pg` connection pool alongside existing MySQL support.
   - Detect protocol scheme (`postgres://`, `postgresql://`, `mysql://`) from `DATABASE_URL` or `POSTGRES_URL`.
   - Maintain seamless in-memory fallback if credentials are absent or remote host is down.
2. **Vercel Serverless Routing & Config (`vercel.json` & `api/index.ts`)**:
   - Audit and refine `vercel.json` rewrites and cache control headers.
   - Ensure `api/index.ts` safely resolves all routes with or without prefix stripping.
3. **End-to-End Automated Test Suite (`scripts/test-e2e.ts`)**:
   - Test `/api/dashboard/summary`
   - Test `/api/equipment` (CRUD & filtering)
   - Test `/api/equipment/:id/recommended-interval` (ML model)
   - Test `/api/equipment/:id/apply-interval` (ML application)
   - Test `/api/calibration-records`
   - Test `/api/reminders/settings` & preview
4. **Production Build & Type Check Verification**:
   - Run `npm run build` to confirm client compilation.
   - Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
5. **Deployment Guide & Environment Sample (`.env.example` & `VERCEL_DEPLOYMENT.md`)**:
   - Document step-by-step instructions for importing Git repo into Vercel and setting environment variables.
