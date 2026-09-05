# Igbo AI

An open language technology initiative led by Galaxyway AI. This repository contains the public research website, preview Lab, Cloudflare Worker API, D1 migrations and protected administration interface.

## Current implementation

- 24 generated routes, including homepage, research, six technology pages, roadmap, collaboration, support, supporters, updates, ethics, about, policies and Lab.
- Original ivory / forest-green design, locally hosted Unicode-capable variable fonts, responsive navigation, keyboard focus and reduced-motion support.
- Structured collaboration and sponsorship submissions, validation, consent records, D1 rate limiting, Turnstile verification and transactional email outbox.
- Cloudflare Access JWT verification and explicit administrator allowlist. No development authentication bypass.
- Admin editors for roadmap/milestones, updates, resources, campaigns, organisations and project statuses; collaborator statuses/notes/tags; supporter approvals and audit log.
- Privacy-first supporter preferences, modular checkout gateway, signed payment webhook and public listing rules.
- Lab UI previews for conversation, speech and blind evaluation. Voice collection and inference remain disabled.

This is a locally testable implementation, not an already connected production service. Collection defaults to **off** because receiving entity details and policies still need owner approval. No production resources are created by local setup.

## Stack and structure

Astro 7 statically generates foundational public content. A TypeScript Cloudflare Worker serves those assets with security headers and handles dynamic APIs. Published journal articles are rendered as crawlable HTML at request time. D1 is the source of truth for changing programme content; foundational copy lives in source control. The public roadmap has a crawlable initial baseline and refreshes from D1 in the browser.

```
src/components/      Shared presentation components
src/layouts/         Page chrome and metadata
src/pages/           Public routes and admin shell
src/scripts/         Small client-side interactions
src/data/            Initial programme content and shared vocabularies
src/styles/          Responsive design system
worker/              Routing, validation, auth, providers and admin APIs
migrations/          Versioned relational schema and honest initial content
tests/               Unit, D1 integration and Playwright browser tests
docs/                Activation checklist and integration contracts
```

No R2, KV, Queues or Durable Objects are provisioned without a current need. Future audio storage should use private R2, random keys, strict size/type validation and a review queue. See the integration document.

## Local setup

Use Node.js 22.12+ (tested on 22.21.1) and npm.

```sh
npm ci
npm run types
npm run db:local
npm run build
npm run preview
```

The complete Worker preview is at `http://localhost:8787`. For frontend hot reload, run `npm run dev` in another terminal; Astro proxies `/api` to port 8787. To exercise mutations locally with local credentials, start the Worker with `--var ENVIRONMENT:development --var SITE_URL:http://localhost:8787`. The development origin exception is never enabled in production configuration.

On a restricted Windows workspace, set `ASTRO_TELEMETRY_DISABLED=1` and `WRANGLER_LOG_PATH` to a writable workspace log directory if global configuration writes are prohibited. Wrangler may require permission to initialise its own local configuration. These environment changes disable optional telemetry and relocate logs; they do not weaken application authentication.

Copy `.env.example` to `.dev.vars` for local secrets. Non-secret values live in `wrangler.jsonc`; secret values must be supplied using `wrangler secret put NAME`. Never commit `.dev.vars`, credentials or payment information.

## Database

`migrations/0001_initial.sql` creates relational records for collaborators, notes, supporters, transactions, explicit consent, organisations, roadmap phases/milestones, journal updates, resources, campaigns, project statuses, experiments, feedback, settings, audit logs, rate limits and email outbox.

The initial seed contains only the brief's planned phases and project statuses. There are no invented supporters, donations, publications, benchmarks or partnerships.

Use `npm run db:local` for local state. For each remote environment, create a D1 database with Wrangler, replace the placeholder database ID in that environment, then apply migrations to the matching remote binding. Verify the environment and database name before running remote migrations. Database schema changes should be backward compatible and backed up separately from Worker code rollbacks.

## Cloudflare deployment

1. Authenticate Wrangler against the intended account; confirm the account and zone.
2. Create distinct production and staging D1 databases. Replace both all-zero IDs in `wrangler.jsonc`.
3. Configure `SITE_URL` and all environment-specific public variables, then store secrets securely. Staging variables and databases must be configured separately.
4. Apply D1 migrations to staging, build, and deploy using `npm run deploy:staging`.
5. Protect `/admin*` **and** `/api/admin/*` with a Cloudflare Access application. Configure its audience, team domain and exact admin email allowlist.
6. Run the activation and browser checks in `docs/owner-inputs.md`.
7. Configure the `igbo.ai` custom domain on the production Worker and verify DNS. Deploy with `npm run deploy` only after staging approval and policy completion.

The Worker executes before assets so authentication cannot be bypassed by directly requesting `/admin/index.html`. Do not host `dist` separately as the production application: static hosting alone omits the API and Access enforcement. The admin shell itself contains no private records or credentials.

Staging and development responses carry `noindex`. The dynamic sitemap includes published updates and technology pages. Every public page has canonical, OpenGraph and Twitter metadata. `public/social.png` is a 1200×630 sharing image, generated from the editable SVG source with `node scripts/social.mjs`.

## Administration

Cloudflare Access verifies identity; the Worker independently verifies JWT signature, issuer, audience, expiry and membership of `ADMIN_EMAILS`. Empty configuration locks access with HTTP 503. Spoofed identity headers cannot grant access. Administrators use the same-origin `/admin` interface. State-changing requests require a matching Origin header and JSON body.

All public supporter approvals require explicit publication consent, non-anonymous preferences, a display name and a confirmed paid transaction. Public queries repeat these conditions. Refunded-only supporters disappear automatically. Organisation publication requires a confirmed relationship. Draft journal entries and resources remain private.

The admin interface loads up to 500 records per collection and searches those records locally; server pagination is a documented expansion point. Notes and audit records persist separately. Roadmap milestones can be edited as `Title | Status`, one per line. Monetary campaign values use minor units (pence), explicitly labelled in the editor. Article bodies use escaped plain text, preserving paragraphs and Unicode; richer authoring can be added behind the same record schema.

## Service activation

See `docs/integrations.md` for email, payment and AI contracts. No vendor credentials are exposed to the browser. Forms require Turnstile and an enabled site setting. Email acknowledgements are queued after the database transaction; delivery failure cannot discard an application. Gateway idempotency is required. Optional periodic retries can be enabled with a Worker Cron Trigger; recovery of stale `Sending` jobs is an operational requirement described in the integration document.

Payments remain disabled until a real provider gateway, webhook secret, receiving entity and policies are configured. The current adapter contract supports a vendor bridge, not an out-of-the-box Stripe account connection. There is no implication that money was received merely because the visitor returns from checkout.

AI provider interfaces cover conversation, ASR and TTS. No AI endpoint is activated, even if an API key is supplied. Activation requires a reviewed provider adapter, provenance display, inference limits, consent and associated tests. R2 uploads are likewise a future feature gated by contributor terms.

## Quality checks

```sh
npm run check
npm run lint
npm test
npm run build
npm run preview
npm run test:e2e
```

Playwright defaults to installed Google Chrome for desktop and mobile viewport coverage. It does not claim real mobile Safari coverage. Real-device microphone/audio testing is deferred until those services exist. Additional Firefox, Edge and WebKit runs are documented in the verification record.

Security tests cover consent, invalid URLs, Unicode preservation, bounded request parsing, origin validation, Turnstile hostname enforcement, persisted collaborations, publication filtering, unconfigured payments and admin denial. Test databases are isolated from local preview and production data.

## Continuous delivery and rollback

`.github/workflows/ci.yml` runs checks and builds on pull requests and pushes. No automatic production deployment is configured without a supplied repository/account. Connect a Cloudflare Workers Git build only after setting the correct build command and environment secrets. Protect the production branch and require passing CI.

Record the deployed Worker version. Use `wrangler versions list` and `wrangler rollback <VERSION_ID>` for code rollback after confirming the target environment. A Worker rollback does not undo D1 migrations; restore data only from an approved backup/recovery plan.

## Research and platform references

- [Existing Galaxyway AI programme record](https://www.galaxyway.ai/research/igbo-ai)
- [Astro on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)
- [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [Cloudflare Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

The framework, schemas and runtime types were checked against installed/current tooling during implementation. Review upstream changes before upgrading dependencies or compatibility dates.
