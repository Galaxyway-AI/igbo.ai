# Production launch record — 6 September 2026

**PRODUCTION LAUNCH SUCCESSFUL — [igbo.ai](https://igbo.ai) is live.**

Production was launched on 6 September 2026 from the approved main branch and verified after deployment. This record documents the deployed state; it does not change application behaviour or production configuration.

## Deployment record

- Canonical URL: [https://igbo.ai](https://igbo.ai)
- `www.igbo.ai` → `igbo.ai` permanent 308 redirect verified, including path and query preservation.
- Production Worker version: `79529880-8834-4f3a-82d0-c4e1b2e0b769`
- Deployment commit: `0b07fedb0169887a215b914c159212edb95778d9`
- Production D1: `igbo-ai` (`7cd832cb-b03c-4bd4-b242-873d9638c52a`)
- Staging remains a separate Worker and D1 database and continues to send `X-Robots-Tag: noindex, nofollow`.
- No staging submissions or test data were copied to production.

## Verified production services

- 13 published research resources are present, including **Nkọwa okwu — ibo-dict** as a separate Landscape resource.
- Landscape Review v0.1, roadmap, technology statuses and research resources are present.
- Cloudflare Access protects `/admin*` and `/api/admin/*`; the permitted administrator is `admin@igbo.ai`.
- Turnstile is configured with server-side Siteverify, hostname and action enforcement.
- Resend is configured and `igbo.ai` is verified for sending. The sender is `Igbo AI <kedu@igbo.ai>`.
- Cloudflare Web Analytics is configured for production public HTML only; it is absent from staging, admin responses and API responses.
- A real production collaboration submission and a real production sponsorship submission were manually completed through Turnstile. Both persisted correctly, appeared in the Research Desk, and delivered applicant acknowledgement and administrator notification emails.
- Production failure-mode checks reject missing Turnstile tokens without persisting records.

## Disabled launch features

The following remain disabled in production:

- payments and individual supporter registration;
- voice collection;
- AI inference and chat;
- ASR and TTS;
- public accounts and newsletter functionality;
- advertising and marketing pixels.

Collaboration and organisational sponsorship forms are enabled. The individual-support page displays Opening Soon and does not render a payment form.

## Operational notes

- Secrets are stored as encrypted Worker secrets and are not recorded in this repository or this document. Rotate them through the relevant provider dashboards if exposure is suspected.
- The production Worker version above is the rollback point. A Worker rollback does not roll back D1 migrations.
- Production D1 is separate from staging. Before any destructive data operation, create or confirm an available D1 recovery point and use the retention and legal-hold process in [data-retention.md](data-retention.md).
- Retention reviews remain manual and monthly, covering enquiry records, transactional email logs, security/application logs and admin audit records. Delete or anonymise information earlier when it is no longer needed, subject to legal holds and required records.
- Future activation of payments, supporter registration, voice, AI, ASR, TTS, accounts or newsletter features requires a separate review of provider configuration, consent/terms, privacy copy, access controls, tests and explicit deployment approval.

## Evidence and references

The production smoke tests were completed by the owner in the internal browser after launch. Public production checks verified the homepage, legal pages, canonical URLs, robots rules, sitemap hygiene, payment-form omission, analytics placement, Access protection, D1 content and the `www` redirect. The application test suite contains 41 passing tests; the previously validated browser suite contains 180 passing checks.

Relevant references:

- [Resend email API](https://resend.com/docs/api-reference/emails/send-email) and [domain verification](https://resend.com/docs/dashboard/domains/introduction)
- [Cloudflare Turnstile Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/about/)
- [Retention policy and review process](data-retention.md)
- [Consumer Rights Act explanatory notes, sections 62–65](https://www.legislation.gov.uk/ukpga/2015/15/pdfs/ukpgaen_20150015_en.pdf)
