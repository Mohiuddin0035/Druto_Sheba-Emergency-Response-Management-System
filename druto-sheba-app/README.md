# Druto Sheba

A Next.js emergency dispatch demo for patient SOS requests, dispatcher dashboards, ambulance fleet management, driver duty screens, hospital capacity, billing, and analytics.

## Recommended Stack

This project now uses a sharing-friendly stack:

- **Frontend/full-stack app:** Next.js + React
- **Default data mode:** local in-memory demo adapter in `src/lib/mockData.js`
- **Real database option:** Supabase Postgres or any hosted PostgreSQL database
- **Deployment option:** Vercel or any Node.js host that supports `npm run build` and `npm run start`

Why this setup: anyone can clone the project and run it immediately without creating a database first. When you need real persistence, add Supabase/Postgres environment variables and the same API routes will use the real database.

Useful docs:

- Next.js deployment: https://nextjs.org/docs/app/getting-started/deploying
- Next.js environment variables: https://nextjs.org/docs/app/guides/environment-variables
- Supabase database: https://supabase.com/docs/guides/database/overview
- Supabase seed data: https://supabase.com/docs/guides/local-development/seeding-your-database
- Vercel environment variables: https://vercel.com/docs/environment-variables

## Quick Start

Use Node.js 20.11+ and npm 10+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

If port 3000 is busy, Next.js will print another local URL.

## Verify Before Sharing

Run this before sending the project to another person or opening it in an AI IDE:

```bash
npm run check
```

That command runs ESLint and a production build.

## Demo Data

Dummy data is stored in:

```text
src/lib/mockData.js
```

It includes hospitals, patients, drivers, ambulances, emergency requests, trips, maintenance logs, billing rows, inventory, shift schedules, dispatch zones, and specializations.

The app uses demo mode automatically when `PG_HOST` is missing or when this is set:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

Copy `.env.example` to `.env.local` if you want local settings:

```bash
cp .env.example .env.local
```

## Real Database Setup

Use Supabase for the easiest shared database:

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. If you already tried setup and got partial-table errors, run `../emergency_supabase_reset.sql` once.
4. Run the root SQL files in this order:
   - `../emergency_schema.sql`
   - `../emergency_schema_expansion.sql`
   - `../emergency_seed_data.sql`
   - `../emergency_advanced_queries.sql`
5. Add your Supabase/Postgres values to `.env.local`.
6. Set `NEXT_PUBLIC_DEMO_MODE=false`.
7. Restart `npm run dev`.

For deployment, add the same environment variables in Vercel project settings.

## Main Routes

- `/` portal selector
- `/sos` patient SOS request
- `/track` live patient tracking
- `/dashboard` dispatcher command dashboard
- `/requests` emergency requests
- `/fleet` ambulance fleet
- `/duty` driver active duty
- `/maintenance` admin maintenance
- `/hospitals` hospital capacity
- `/billing` billing records
- `/analytics` analytics

## Troubleshooting

If another machine gets errors:

1. Check Node.js with `node -v`; use Node 20.11+.
2. Delete `node_modules` and reinstall with `npm install`.
3. Run `npm run check`.
4. If database credentials are not ready, keep `NEXT_PUBLIC_DEMO_MODE=true`.
5. If real database mode fails, confirm all SQL files were applied and `PG_HOST`, `PG_DATABASE`, `PG_USER`, and `PG_PASSWORD` are correct.
