# Verification record

Date: 5 September 2026.

The sections below record the original launch baseline. See [Phase 2 corrections](phase-2-corrections.md) for the current staging release, and [Phase 2 verification](phase-2-verification.md) for the preceding release and production launch gate.

## Implemented and checked

- Astro production build: 24 generated routes.
- TypeScript / Astro diagnostics: no errors, warnings or hints.
- ESLint: passed.
- npm dependency audit after upgrading to Astro 7.3.1: zero known vulnerabilities.
- Unit and D1 integration suite: 24 passing tests. Includes bounded requests, original Unicode preservation, explicit consent, Turnstile hostname checks, persisted submissions, signed administrator JWTs, publication filtering, checkout failure, signed payment events, duplicate events, late failures and refunds.
- Chrome desktop and mobile viewport: interaction and WCAG-tagged axe checks passed.
- Microsoft Edge: 12 checks passed.
- Firefox: 12 checks passed after permitting the browser process to run outside the restrictive filesystem sandbox. The initial sandboxed Firefox process could not finish startup; that was a test-environment failure.
- WebKit desktop and iPhone viewport emulation: 24 checks passed. These are WebKit engine checks on Windows, not physical Safari/iPhone certification.
- Homepage visual review at desktop and mobile sizes: no horizontal page overflow or browser console errors. Screenshots are in `docs/screenshots/`.

The initial tests identified inline-script/CSP incompatibility and text contrast issues. Small scripts are now emitted as external assets; muted text colours were darkened to meet the checked contrast thresholds. These failures were corrected rather than suppressed.

## Staging

Deployment: https://igbo-ai-staging.emailgalaxyway.workers.dev

Database: `igbo-ai-staging`, region WEUR. Initial migration applied to this new, isolated database. No existing databases were modified.

Public static assets and Worker APIs are deployed together. Staging has `noindex` headers. Form collection and payments remain off pending provider/policy activation. No AI inference, microphone collection or third-party analytics is enabled.

Cloudflare Access application `1a749048-d394-4ff1-a524-06dc216db3b1` protects `/admin*` and `/api/admin/*`. The approved `Igbo AI administrators` policy allows only `admin@igbo.ai`. The staging Worker independently validates the application audience and issuer. Deployment version: `2360aaf8-20e1-40b3-9917-52c1fbfd0661`.

Live anonymous checks: homepage and collaboration return 200; `/admin`, `/admin/`, `/api/admin/dashboard` and `/%61dmin/` redirect to Access. The email-code sign-in page renders successfully. A focused hosted Playwright Access test passed. After the owner signed in, the administrator dashboard, all seven roadmap records and protected site settings loaded successfully. Forms and payments remain disabled with consent version `prelaunch-v1`.

## Remaining production checks

- Repeat the verified staging Access flow on the production hostname after deployment.
- Real transactional email acknowledgement and notification delivery.
- Provider sandbox checkout, vendor webhook verification, refunds and email receipts.
- Owner-approved legal entity, privacy/terms, retention and consent versions.
- Approved research citations and linguistic review of Igbo examples.
- Production domain/DNS, deployment branch and rollback ownership.
- Real-device microphone, recording and playback checks when speech features are introduced.

Automated accessibility checks are a useful baseline, not a complete accessibility certification. Human screen-reader testing and real-device review remain appropriate before the full production launch.
