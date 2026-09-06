# Production launch preparation — 6 September 2026

**NOT READY FOR PRODUCTION — Turnstile, Resend, analytics token and production Access/domain setup remain missing or unverified.** Production deployment remains on hold.

## Prepared

- Approved Privacy Policy and Terms of Use dated 6 September 2026; Galaxyway AI Ltd (15966090), registered office and ICO ZC229446. No VAT information, telephone or personal name published.
- General kedu@igbo.ai; privacy support@igbo.ai; collaboration collaborate@igbo.ai; sponsorship sponsorship@igbo.ai. Only kedu was explicitly confirmed active; other mailbox delivery needs confirmation.
- Server-validated 18+ confirmation, policy/contact acknowledgements, no sensitive material notice and no-agreement sponsorship terms. Ordinary enquiries rely on legitimate interests, not consent. No date of birth collected.
- Turnstile Siteverify, hostname/action enforcement, origin checks, schema validation, D1 rate limits and bound SQL. No form bodies or email content logged.
- Payments and supporter registration disabled; payment form omitted from HTML. Voice, chat, ASR/TTS, public accounts and newsletter disabled. Future voice purposes and withdrawal constraints documented without a final contributor agreement.
- Resend adapter, environment-based secret, acknowledgement outbox, internal notifications and 15-minute retries. No real email sent in preparation.
- Cloudflare Web Analytics is the only analytics integration: configured-token gate, production public HTML only, no staging/admin beacon. No marketing pixels or generic cookie banner. Actual activation requires the account token.
- Production-only HTTP 308 www-to-apex redirect preserving path/query. Production canonical, robots and sitemap checks. Staging HTTP noindex; authenticated/noindex admin excluded from sitemap.
- Separate production D1 igbo-ai, ID 7cd832cb-b03c-4bd4-b242-873d9638c52a, seeded from migrations 0001–0006. Verified 13 published resources, one article, zero collaborators, sponsorship enquiries or supporters. No staging data copied.
- [Retention policy and review/delete/anonymise process](data-retention.md), including legal holds and provider-log responsibilities.

## Exact remaining configuration

1. Turnstile site keys are blank and staging secret list was empty. Configure appropriate staging/production widgets and TURNSTILE_SECRET_KEY via Wrangler secrets. Retain existing server Siteverify, do not use test keys on deployed sites. Validate real browser submissions before calling forms active.
2. Set RESEND_API_KEY securely; verify the sending domain for Igbo AI <kedu@igbo.ai>. Public DNS shows Cloudflare routing/SPF but expected resend._domainkey.igbo.ai and send.igbo.ai records were not found. Custom selectors may differ; account verification is required. Use Resend's exact records; do not overwrite existing MX/SPF blindly. Disable open/click tracking. Confirm processor terms, international safeguards and log retention. Test both acknowledgement and notification delivery after configuration.
3. Set the Cloudflare Web Analytics token for igbo.ai in CLOUDFLARE_ANALYTICS_TOKEN. Use manual injection as implemented, avoiding duplicate automatic injection. No other analytics is configured.
4. Production Access: configure /admin* and /api/admin/* for admin@igbo.ai only, then set production team domain/audience. These production bindings remain blank and fail closed. Staging Access is already enforced.
5. Domain: Cloudflare nameservers confirmed. Apex and www HTTP checks returned 403, so no live permanent redirect is verified. Custom-domain bindings for both names are prepared in production configuration; review existing zone rules before applying them. Staging explicitly has no custom-domain routes. The redirect code is tested but not live. Do not deploy or bind production until explicit owner approval.
6. Confirm collaborate/support/sponsorship mailbox routing and monitoring, Cloudflare/Resend retention and safeguards, and a monthly retention-review owner. Legal copy is ready; operational promises require account verification.

## Evidence limits

Signed-in admin inspection from the preceding correction pass is not a fresh authenticated inspection. No signed-in internal browser tab was available during preparation. Anonymous Access protection and isolated workflow tests are checked separately. Verification: 41 application tests passed across four files; type checks and lint passed; build generated 26 routes; all 180 browser checks passed in 2.2 minutes across Chromium desktop/mobile, Edge, Firefox and WebKit desktop/mobile. Staging and production configuration dry runs passed. Production www redirect and analytics were tested in isolated production-mode requests, not as live activated services. Staging deployment version: 36a3dbdb-3e73-4fd9-a090-006cb76db42c. Live legal/support responses sent X-Robots-Tag: noindex, nofollow; payment HTML was absent; sitemap excluded admin. Cloudflare Access returned a protected 302 login redirect, which itself has no robots header. Worker admin noindex remains tested.

No production website deployment was performed. GitHub CI validates only; it does not deploy production.

## References checked

- [Resend email API](https://resend.com/docs/api-reference/emails/send-email) and [domain verification](https://resend.com/docs/dashboard/domains/introduction).
- [Cloudflare Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) and [Web Analytics](https://developers.cloudflare.com/web-analytics/about/).
- [Consumer Rights Act explanatory notes, sections 62–65](https://www.legislation.gov.uk/ukpga/2015/15/pdfs/ukpgaen_20150015_en.pdf). Liability wording preserves mandatory rights. The substantive legal content was supplied by the owner; implementation does not certify legal compliance.
