# AI Business Analytics — preview branch

Scope: HOMEY + SODFA CRM/ERP/SaaS, orders, marketing and website operations.

## Current state
- Implemented `lib/analytics/core.ts` as a deterministic, read-only aggregation foundation.
- This is **not yet an authenticated analytics page**, live AI analyst, daily schedule, API integration or deployment.
- Branch is isolated from `main`; **do not merge or connect production credentials** without review.
- CRM/ERP application repository has not been uniquely identified. This branch lives in the connected Orders Manager repository as a safe integration staging point, not a claim that it is the CRM application.

## Sources to integrate (read-only scoped adapters)
- HOMEY and SODFA order sources; provider shipment and settlement reconciliation.
- Website analytics: GA4, Search Console, product funnels, Core Web Vitals and SEO.
- Marketing: Meta Ads + Conversions API diagnostics; Google Ads; TikTok Ads; email, WhatsApp campaign IDs; organic/referral traffic.
- Commerce channels: website, Amazon, social and manually entered orders.
- Expenses, cost of goods, inventory, suppliers and verified refunds.

## Security acceptance criteria
- Each query must be server-side; no AI model receives database credentials, tokens, phone numbers or customer addresses.
- Access scoped by organization/brand and permission, verified server-side on every request.
- Expose aggregate metrics only to the AI, minimize PII, prompt injection defenses, bounded queries and audit trail.
- Read-only integration credentials, encrypted at rest. No LLM-generated SQL executed against production.
- No double counting: canonical order ID, source event IDs, normalized timezone/currency, platform attribution separated from booked revenue.
- Missing cost fields produce 'unknown', not fabricated profits; forecast and recommendations expose confidence/limitations.
- Daily reports require a configured scheduler, idempotency and alert deduplication.

## Release gate
Identify actual CRM/ERP repo, secure staging environment, connection authorizations, integration API contracts, test fixtures and automated tests. Only then implement and verify authenticated analytics page and daily AI analyst. No production deploy without explicit approval.
