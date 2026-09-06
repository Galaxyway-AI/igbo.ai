# Final pre-production verification

Date: 6 September 2026. Production remains on hold.

## Scoped changes

- Kept the existing, separate Nkọwa okwu — ibo-dict entry and IgboAPI entry: 13 published landscape references. The dataset records the approximately 25,500 word and 25,000 sentence recordings, CC BY 4.0, gated access and provisional investigation/reuse assessment. Added explicit recording-permission review to its assessment. No partnership is claimed.
- Migration 0005 adds ibo-dict to Landscape Review v0.1 Sources & References. A remote staging database backup was taken before applying it.
- The Worker now removes the entire individual payment form from support-page HTML unless the payment flag and provider configuration are present. This also covers the index.html route. Opening-soon information and organisational sponsorship remain visible. The underlying implementation remains available for later configuration.
- Added regression coverage for article references and removal of payment HTML, including a enabled flag without provider configuration. No redesign or refactor.

## Deployment and verification

Staging only: https://igbo-ai-staging.emailgalaxyway.workers.dev

Worker version: 3dbf9f6a-e3db-4749-81a0-40a8108f0575.

- Astro/TypeScript check: zero errors, warnings or hints. ESLint passed. Build passed (26 routes).
- Application/Worker/D1 tests: 35 passed across three files.
- Browser checks: 162 passed in 2.1 minutes across Chromium desktop/mobile, Edge, Firefox and WebKit desktop/mobile. Public checks ran against deployed staging; admin interaction checks use isolated fixtures.
- Live HTTP GET checks confirmed X-Robots-Tag: noindex, nofollow on public staging pages and sitemap.xml. Browser regression checks cover seven representative public routes, including the dynamic research article.
- Live support HTML contains neither the support-form element nor Continue to secure checkout. Browser checks require zero form elements, not merely invisibility.
- sitemap.xml excludes admin routes. Production-mode Worker regression tests confirm public responses omit staging noindex, production robots.txt permits public indexing, and private administration remains noindex. No production deployment was performed.

## Administration evidence and limits

Anonymous deployed /admin/ and /api/admin/overview requests return HTTP 302 to the configured Cloudflare Access login. The Access-generated redirect does not itself send X-Robots-Tag. It does not expose the Research Desk document. Worker administration responses are noindex and the admin document has a noindex,nofollow meta directive; automated authentication tests remain enforced.

The signed-in Research Desk was inspected during the preceding correction pass, including dashboard cards, grouped navigation, Create choices and the published update preview. This final pass has no signed-in internal browser tab available, so the protected deployed UI could not be freshly inspected externally. The unchanged admin build is exercised with isolated browser fixtures for metric cards, grouped sidebar, Create, draft creation/preview links and supporter consent visibility; Worker/D1 tests cover preview, publish and unpublish; those fixtures are not evidence of a new authenticated live session. No real supporter record was created or approved for testing.

Production approval and deployment remain on hold.
