# HOMEY & SODFA Orders Manager

**Independent order management site**, Next.js + TypeScript + **Supabase PostgreSQL and Supabase Auth**, deployed on **Vercel**. The HOMEY storefront, its repository, and its databases are never modified.

## New database (separate from HOMEY)

Create a **brand-new Supabase project** named `homey-sodfa-orders-manager` in the chosen account/organization. Do not use either of the existing HOMEY databases.

Run the SQL in [supabase/schema.sql](supabase/schema.sql) in **the new project's** SQL Editor once. This adds `orders`, `customers` and `audit_log`. Row Level Security is enabled, and anonymous/authenticated roles have no table access. The Next.js API (server only) accesses the tables with the secret service-role key **after** checking the caller's verified Supabase Auth session and email allowlist.

## Vercel environment variables

Only on the **independent Orders Manager Vercel project** (not the HOMEY project):

- `NEXT_PUBLIC_SUPABASE_URL` = the new project's URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = new project's public anon/publishable key
- `SUPABASE_URL` = same project URL (server-only)
- `SUPABASE_SERVICE_ROLE_KEY` = new project's **secret** service role key; never `NEXT_PUBLIC_`
- `ALLOWED_EMAILS` = two exact emails separated by a comma

The dashboard uses Supabase Auth **email magic-link/OTP** sign-in: no app-specific password. Go to Supabase Authentication → URL Configuration, set the Site URL to the correct Vercel production domain, and add that URL to Redirect URLs. Enable Email provider. Only the two allowlisted, email-verified addresses can read/change orders. Consider disabling public signup and inviting only the authorized users once email delivery is confirmed; the backend allowlist is mandatory regardless.

**Keep service-role key out of GitHub, chats, screenshots, and browser code.** A private GitHub repository alone is not access control.

## Order workflow and analytics

- Orders: brand HOMEY/SODFA, date, customer name/phone/address/governorate, multiple line items, prices, shipping, discounts, partial payment, status, notes and ownership.
- Reports: selected brand's orders and sales by day/week/month/custom dates.
- Customers: first order date, lifetime order count and lifetime order/delivered value.
- Export CSV. Soft-delete data remains recoverable by admin.
- Responsive UI for mobile and desktop.
- Direct access via session for the two email accounts only.

## Develop and deploy

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

The application can be deployed safely **without Supabase credentials**: it shows a clear setup-required screen and cannot expose or save customer data. It is NOT operational until a brand-new Supabase project is created, SQL is applied, and the Vercel environment variables are configured. Then test login with the two authorized accounts; a third account must receive 403. Only use fake test data first.

## Cost warning

Supabase Free permits two active free projects **across organizations owned/administered by the same account**; projects may pause for inactivity. The person choosing the organization must make sure a new Free project can be created **without a nonzero charge**. Vercel Hobby may restrict business use; check your plan terms. Do not enable billing or paid resources automatically.

Google Sheets and Netlify Identity are **not used** by this migration.
