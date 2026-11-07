# HOMEY & SODFA Orders Manager

An independent Next.js + TypeScript order dashboard. The HOMEY storefront repository and Vercel deployment are unaffected.

## Access: exactly two invited people, Netlify Free

The dashboard uses **Netlify Identity** and a Netlify Edge guard. It is not protected just by hiding a login screen: every `/api/*` route and direct `/.netlify/functions/*` entry is blocked unless Netlify Identity verifies a user whose email is in `ALLOWED_EMAILS`. If the allowlist is absent, the guard denies all access.

**Required site-owner steps** (Netlify site configuration cannot be changed from GitHub):
1. Netlify → [Orders Manager Identity](https://app.netlify.com/projects/homey-sodfa-orders-manager/identity): **Enable Identity**.
2. Project configuration → Identity → Registration: set **Invite only**, not Open.
3. Registration → External providers: enable **Google**.
4. Identity → Users: invite the two authorized Google-account email addresses.
5. Netlify → Environment variables: set `ALLOWED_EMAILS` to the exact same two addresses separated by a comma, e.g. `first@example.com,second@example.com`. Scope must include Functions / Edge Functions.
6. Redeploy production from the independent repo's `main` branch after setting the environment variable.
7. Keep Netlify **Project visibility = Public** if both invited Identity users are to access the site on Free. **Public project visibility does not grant data access**: Identity and Edge guard gate data requests; an unauthorized visitor sees the sign-in screen. Netlify Private on Free permits only the Netlify team owner, which is unsuitable for two people.
8. Test with private browsing: unauthenticated `/api/orders` must give 403/503; each invited Google user must access orders; any third Google account must fail.

Google login is separate from the Netlify **team member** login. No app-specific username/password is created.

## Google Sheets

The Google spreadsheet has already been prepared with `Orders`, `Customers`, `Audit` tabs:
https://docs.google.com/spreadsheets/d/1WTIAYqLYQlRaOTmDtM65j2gAmeQx4X2st08qzc3hF5E/edit

Create a Google Cloud project (without enabling Billing), enable Google Sheets API, create a service-account credential, and share only this spreadsheet with its service account address as Editor. Set the following **Netlify secret environment variables**:
- `GOOGLE_SHEET_ID=1WTIAYqLYQlRaOTmDtM65j2gAmeQx4X2st08qzc3hF5E`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` (service account client_email)
- `GOOGLE_PRIVATE_KEY` (private_key from its JSON key; preserve newlines)
Never commit the JSON key or paste it in a public chat. You may need to redeploy for variables to apply.

After sign-in and secure connectivity, use the dashboard Settings → **تهيئة Google Sheets** if the tabs are missing. Enter one fake test order, verify in Sheets, then remove it.

## Features

- HOMEY olive and SODFA rose themes, independent brand-scoped orders/customers.
- Orders: customer names/phones/address, governorate, creation date, products/quantities/prices, shipping, discounts, prepaid, statuses.
- Reports: daily, weekly, monthly, custom date filters; order count, gross order totals, delivered revenue.
- Customer history: first order date, lifetime orders, lifetime order/delivered totals.
- CSV exports, mobile/desktop responsive interface.

## Deployment

GitHub: https://github.com/Hossam-Zahwo/homey-sodfa-orders-manager (branch `main`).
Netlify: https://app.netlify.com/projects/homey-sodfa-orders-manager/deploys

Netlify Free and Identity are available at no additional cost within free usage limits. Do not upgrade, add a billing card, or activate paid cloud resources.

**Important:** Access depends on Netlify Identity being enabled and invited users being configured; committing the code alone does not activate Identity. Until server-side access has been verified and Sheets secrets installed, **do not enter real customer data**.
