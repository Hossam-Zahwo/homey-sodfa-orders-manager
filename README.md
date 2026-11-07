# HOMEY & SODFA Orders Manager

Independent Next.js 16 dashboard on Vercel with **Neon PostgreSQL + Managed Better Auth**. Not connected to the HOMEY storefront, HOMEY Supabase Images, or Google Sheets.

## Infrastructure

- Neon Free project: `homey-sodfa-orders-manager` (project ID `rapid-lab-94017333`; database `orders_manager`).
- Tables: `public.orders`, `public.customers`, `public.audit_log`; see `neon/schema.sql` for reproducible definition.
- Managed Better Auth: magic links with account creation disabled. The two allowed users must be created/invited by admin, and their exact addresses entered in `ALLOWED_EMAILS`.
- Every order/customer API rechecks a verified Neon auth session and exact allowlist. No unauthenticated data API.
- All PostgreSQL queries happen server-side using `@neondatabase/serverless`; no database credentials are exposed to the browser.
- Vercel environment: `DATABASE_URL` (server-only, secret), `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (secret), `ALLOWED_EMAILS` (two exact emails).
- Neon Auth must trust `https://homey-sodfa-orders-manager.vercel.app`.
- Vercel deployment protection may additionally require Vercel authentication; if applicable, configure project-level access for the two users.

## Functionality

Separate HOMEY/SODFA order/customer records; add/edit/soft-delete, products and quantities, delivery, payment, prepayments, notes, source, date, search, CSV export, day/week/month/custom reports, and customer purchase history. Responsive Arabic layout.

## Verification

```bash
npm install
npm run typecheck
npm run build
```

Never treat a passing deployment as proof of working login or CRUD. Verify both authorized email links, third-user rejection, API 401/403, and create/read/update/soft-delete using sample orders before entering customer data.

No secrets in GitHub or browser code. This is separate from HOMEY's production Supabase databases.
