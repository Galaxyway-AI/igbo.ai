# Phase 2 completion and consistency pass

6 September 2026. Staging Worker version: `f84ca1ef-c4ba-438b-90fe-9c705f63af5a`. Staging only; production remains on hold.

## Changes

1. The staging D1 audit found Phase 0 already had the requested eight milestones: four Completed, one In Progress and three Planned, with the overall phase In Progress. The homepage roadmap now reads the same D1 records instead of maintaining separate preview values. Its latest-review card explicitly says “INITIAL LANDSCAPE REVIEW COMPLETE.”
2. All six technology pages now include distinct proposed processing architectures and success headings. IgboPronounce has the complete pronunciation-record fields; IgboTone separates lexical disambiguation, restoration and downstream consumers; IgboPhonemizer explains G2P and the proposed `igbo-phonemizer` output. Long pipelines use clear vertical steps.
3. IgboSpeech explicitly labels separate TTS and ASR tracks and lists the requested speech research topics. IgboSpeechBench lists ten benchmark dimensions, explains blind evaluation and retains its inactive A/B concept. IgboLM lists possible later capabilities and explicitly says that training a large LLM is not the current priority.
4. Migration 0004 adds Nkọwa okwu — ibo-dict as a distinct thirteenth resource. The [dataset card](https://huggingface.co/datasets/nkowaokwu/ibo-dict) was checked on 5 September: reported recording counts, CC BY 4.0 and gated access conditions are recorded as an initial assessment. IgboAPI remains a separate record. No gated conditions were accepted and no recordings were downloaded.
5. Support copy now explicitly states that no payments are currently collected through the website and uses the requested funding purposes. The implemented payment form remains hidden while payments are disabled; sponsorship is available by email.
6. Dataset governance now explicitly includes access conditions, review date and every requested provenance/permissions field, with individual assessment and no legal guarantee.
7. HTML responses revalidate after deployments; managed D1 content remains no-store. Hashed static assets retain caching.
8. Quick creation now focuses the first text field without competing smooth-scroll animations. Article reference selection appears after editorial fields. This resolves a Firefox reference-checkbox interaction found during verification.

The approved public palette, typography and overall layout are retained. Primary Technology navigation, internal/external arrows and the existing Research Desk upgrades were verified rather than replaced.

## Live administration and indexing evidence

The owner's signed-in staging browser was refreshed after deployment. It displayed grouped navigation, correctly labelled metric cards, one published update, no invented supporters or partners, Phase 0 In Progress and recent activity including the ibo-dict migration. The Create menu listed explicit content types. The saved research update exposed a protected preview link and Published status. Supporter consent visibility is covered by isolated browser fixtures and backend approval tests; staging has no real supporter records to inspect.

The deployed authenticated administrator HTML contains `meta name="robots" content="noindex,nofollow"`. Anonymous `/admin/` requests return a 302 Cloudflare Access login redirect; that edge redirect itself does not include X-Robots-Tag. Protected Worker responses also set noindex/no-store, tested independently. Public staging HTML is checked for `X-Robots-Tag: noindex, nofollow`. The sitemap excludes admin and internal article templates and uses production canonical URLs.

Production-mode Worker tests verify that public pages and research articles do not inherit staging noindex, public robots is not globally disallowed, and private administration remains noindex. Production itself has not been deployed.

## Validation and release

- 33 application / D1 integration tests passed.
- Astro/TypeScript diagnostics, ESLint and the 26-route build passed.
- All 162 hosted browser checks passed on the final staging build across Chrome desktop/mobile, Edge, Firefox and WebKit desktop/mobile. These include all six technology pages, roadmap/homepage consistency, the thirteenth dataset and filters, support, ethics, navigation, access protection and noindex headers. Research Desk mutation/consent tests use isolated browser fixtures; live signed-in UI verification is documented above.
- The refreshed internal-browser Landscape tab showed “13 resources shown” and the separate ibo-dict source link.
- A private staging database export was saved before additive migration 0004. Migration succeeded.

An initial resumed browser run could not connect because the overnight local preview had stopped. A later local preview process also stopped during testing. Final verification uses deployed staging. A filter test selector was corrected; the Firefox interaction issue was fixed in the application rather than suppressed.

## Owner inputs

No new owner input is required for this correction pass. Production still needs explicit owner approval and the domain/database/Access launch steps in `owner-inputs.md`. Enquiry and payment activation still need approved entity/policy details and configured providers. Forms, payments and AI capabilities remain disabled.
