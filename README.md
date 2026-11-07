# HOMEY & SODFA Orders Manager

Independent internal order confirmation dashboard. Next.js 15, TypeScript/TSX, Google Sheets (server-side), responsive RTL interface.

## Configure

1. Create a **private** Google Spreadsheet (do not publish it or grant anyone-with-link access).
2. In Google Cloud Console create a project, enable **Google Sheets API**, create a **service account**, generate a JSON private key.
3. Share your sheet **only** with the service account `client_email` as Editor.
4. Copy `.env.example` to `.env.local`, fill `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, a strong `ADMIN_PASSWORD` and random `SESSION_SECRET` (32+ chars).
5. Run `npm install`, `npm run build`, `npm run dev`.
6. Sign in; press **تهيئة Google Sheets** once to create the Orders, Customers, Audit tabs. Then add records.
7. Configure the same environment variables securely in **Netlify > Project configuration > Environment variables** and deploy from its **own private GitHub repository**, NOT the storefront repo. Use the included netlify.toml; Netlify automatically detects Next.js runtime. The project must be separate from HOMEY and SODFA storefront deployments.

**Security:** No credentials in client code or GitHub. The session is HMAC-signed and HttpOnly. All data routes require login. Production requires HTTPS. Data is saved to Google Sheets only; the UI does not fabricate demo orders. Deletes are reversible soft-deletes. Audit changes are recorded on a best-effort basis.

**Limitations:** Google Sheets is not transactional; simultaneous edits can still race in edge cases. Version checks catch ordinary stale edits, but Google Sheets alone cannot guarantee atomic compare-and-swap or reliable multi-writer transactions. For high-volume concurrent order entry, move storage to a database. Single administrator account in this initial version. Google Sheets customer data must remain private and access restricted. Keep a backup/version history.

## Repo / deployment

Project name recommendation: `homey-sodfa-orders-manager` (separate GitHub private repo and separate Netlify project). Never overwrite `HOMLY-` or the existing HOMEY Vercel project.

## Important separation and cleanup

The previously created `orders-manager-render` branch in `Hossam-Zahwo/HOMLY-` is a temporary preview only. The HOMEY production branch is `main` and must stay unchanged. Once a private independent repo is created and Netlify is pointed to it, remove the old Netlify project `tiny-biscochitos-cb3c43` and delete the temporary `orders-manager-render` branch from the HOMEY repository. Never deploy `main` of HOMEY to the orders dashboard.
