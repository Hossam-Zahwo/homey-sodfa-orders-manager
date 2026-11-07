# HOMEY & SODFA — Orders Manager

Standalone Next.js 15 + TypeScript / TSX dashboard with server-side Google Sheets storage. This repository is **independent** from the HOMEY and SODFA storefronts.

## Current functionality

- Opens directly on the dashboard without a username/password screen (per owner request).
- Brand selection: HOMEY (olive-green) and SODFA (rose) with separate per-brand orders and KPIs.
- Record and edit customer name, phone, alternate phone, governorate, city, address, source, status, payment method, prepaid amount, shipping, discount and multiple products/quantities/prices.
- Order creation date can be chosen during entry.
- Brand-scoped totals: orders, confirmed/delivered, total ordered value and delivered value, filtered by today, current week, current month, all-time or custom dates.
- Customer purchase history: first order date, order count, lifetime ordered total and delivered value. Customer summary draws from saved orders, even if the customer does not have a separate customer record.
- CSV order export, editable order/customer records, soft deletes, audit sheet, and responsive mobile/desktop layout.

## Required Google Sheets configuration

1. Create a private Google Sheet. Never publish it on the web.
2. In Google Cloud enable the **Google Sheets API**, then create a service account and its JSON key.
3. Share the spreadsheet with the service-account **client_email** as Editor.
4. In **Netlify → Project configuration → Environment variables**, set:
   - `GOOGLE_SHEET_ID`: the spreadsheet ID in its URL
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: service account client_email
   - `GOOGLE_PRIVATE_KEY`: the multiline private key from the JSON (store only in secret environment variables, never GitHub)
5. Deploy, open the dashboard → Settings → **تهيئة Google Sheets** once to create Orders, Customers and Audit tabs. Then start adding orders.
6. Do not enable `NEXT_PUBLIC_DEMO_MODE=true` for real data: demo mode is read-only.

## Netlify Free deployment

- Import this **repository** `Hossam-Zahwo/homey-sodfa-orders-manager`, branch `main` (not `HOMLY-`, and not `orders-manager-render`).
- Framework: Next.js; build command: `npm run build`; publish directory: use Netlify's automatic Next.js handling.
- `netlify.toml` sets Node 22; no Vercel or Render project is needed.
- Build and verify the deployment using Netlify's Deploy log.

## IMPORTANT: Customer data privacy

**The current version has no login, by explicit request. Anyone who can reach the public Netlify URL can read, create, edit, and delete order/customer records once Google Sheets is connected.** This is unsafe for real customer addresses/phone numbers. Before entering real records, restrict site access through an appropriate site-wide access-control layer or enable authentication again. A private GitHub repository does **not** protect a public Netlify website. Do not share the live link publicly until access is restricted.

## Local development

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Do not commit .env files, service account keys or customer data.
