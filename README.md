# Next Portal (Next.js + Postgres)

This directory will contain the new Next.js-based CRM + Trips portal.

## What is ready now

- `db/schema.sql` defines the **Postgres database structure** for:
  - users, roles (with budgets and rank)
  - clients and their PSS units
  - queries
  - trips and approvals
  - generic requests
  - attachments (for queries, trips, clients)

## How to scaffold the Next.js app

Once your network can reach npm, run these commands from the **CRM repo root**:

1. Create the Next.js TypeScript app:

   ```bash
   npx create-next-app@latest next-portal --ts
   ```

2. Inside `next-portal`, install dependencies:

   ```bash
   cd next-portal
   npm install @prisma/client prisma pg highcharts highcharts-react-official
   npx prisma init
   ```

3. Translate `db/schema.sql` into `prisma/schema.prisma` (or use it directly as SQL migrations).

4. Build pages and API routes for:
   - Login & roles
   - Queries (add via form or Excel, search & update, analytics via Highcharts)
   - Trips (create, approvals, attachments)
   - Calendar view of trips
   - Admin (role budgets, approval hierarchy, client & PSS management)

The agent attempted to run `npx create-next-app` automatically but npm could not
reach `registry.npmjs.org` (network timeout). Once connectivity is fixed, rerun
the commands above to finish scaffolding the app.
