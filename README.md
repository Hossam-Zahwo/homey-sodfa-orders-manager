# HOMEY & SODFA Orders Manager

Independent Next.js 16 dashboard on Vercel with **Neon PostgreSQL + secure username/password sessions**. Data remains independent of HOMEY and SODFA storefront databases. HOMEY published catalog can be read through a protected, optional server-side API.

## Infrastructure

- Neon Free project: `homey-sodfa-orders-manager` (project ID `rapid-lab-94017333`; database `orders_manager`).
- Tables: `public.orders`, `public.customers`, `public.audit_log`; see `neon/schema.sql` for reproducible definition.
- Authorized staff users live in `public.staff_users` and store **salted PBKDF2-SHA256 hashes**, never plaintext passwords. Sessions use HttpOnly, signed cookies and `NEON_AUTH_COOKIE_SECRET`. The second staff user is provisioned separately when supplied.
- Every order/customer/waybill API rechecks a signed staff cookie against Neon. No unauthenticated data API.
- All PostgreSQL queries happen server-side using `@neondatabase/serverless`; no database credentials are exposed to the browser.
- Vercel environment: `DATABASE_URL` (server-only), `NEON_AUTH_COOKIE_SECRET` (server-only signing secret), and optional `HOMEY_CATALOG_URL` + `HOMEY_CATALOG_KEY` (publishable, server-side).
- Restrict staff provisioning to trusted operators; maintain login rate limiting and secure cookie settings.
- Vercel deployment protection may additionally require Vercel authentication; if applicable, configure project-level access for the two users.

## Functionality

Separate HOMEY/SODFA order/customer records; add/edit/soft-delete, products and quantities, delivery, payment, prepayments, notes, source, date, search, CSV export, day/week/month/custom reports, and customer purchase history. Responsive Arabic layout.

## Verification

```bash
npm install
npm run typecheck
npm run build
```

Never treat a passing deployment as proof of working login or CRUD. Verify both authorized password logins, third-user rejection, API 401/403, and create/read/update/soft-delete using sample orders before entering customer data.

No secrets in GitHub or browser code. This is separate from HOMEY's production Supabase databases.


## HOMEY brand image (required local asset)
The UI uses the **original image** supplied by the store owner, not a recreation.
Place the file at the exact path `public/HOMEY-olive (3).png` in the Next.js project root.
The folder must be spelled `public` (**not** `puplic`). Keep the filename unchanged, including
spaces, parentheses, capitalization, and extension. Check `http://localhost:3001/HOMEY-olive%20(3).png`
(or substitute your local port) to confirm the asset loads.

The image file exists on the operator's computer; it is **not** bundled automatically by GitHub
code changes. Before any future production deployment, add and commit the image to the
same Git branch:

```powershell
git add -- "public/HOMEY-olive (3).png"
git commit -m "Add original HOMEY olive logo artwork"
git push origin feature/username-password-order-workflow
```

Responsive styles support desktop, tablet and mobile dashboards, forms and navigation.
A4 paper preview intentionally retains physical A4 size and scrolls horizontally on small
screens; print output remains 3 or 4 stickers per page.
