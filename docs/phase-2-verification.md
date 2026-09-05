# Phase 2 staging verification

5 September 2026. Staging Worker version: `7259f232-ead2-4845-9fc9-a2621aca94f1`.

## Delivered

- Research Desk metric cards, recent audit activity, grouped navigation, administrator identity, staging badge, sign out, contextual search and quick creation. Mobile navigation starts collapsed. Research updates support saved private previews and selectable maintained references. Status changes retain publication history; audit records capture before/after data. Supporter organisation display requires separate consent.
- Phase 0 remains In Progress with eight milestones: four Completed, one In Progress and three Planned. Existing phase and milestone identifiers are retained.
- Twelve maintained landscape references with source links, licence considerations, provisional roles and individual review dates. Category and access filters run over server-rendered content.
- Published “Igbo AI Landscape Review v0.1,” linked from the homepage, research page, landscape and journal. External projects are acknowledged as research references, not partners. No datasets or model weights were ingested.
- Six distinct technology explanations, pipelines, proposed outputs, dependencies and research questions. IgboSpeech has separate TTS and ASR diagrams; benchmark controls remain explicitly inactive concepts.
- Primary Technology navigation, corrected directional arrows, clear support-opening notice while payments are disabled, sponsorship email and expanded dataset governance.
- Staging noindex headers and robots exclusion, protected administrator routes, production canonical URLs and sitemap exclusions. Managed HTML disables caching so editorial changes appear promptly.

## Evidence

- Astro/TypeScript: no diagnostics. ESLint and production build pass; 26 static routes plus dynamic research articles.
- 30 unit and D1 integration tests pass, including migrations, private preview, publish/unpublish, escaped content, reference links, audit history, consent and payment lifecycle. Rendering tests run the bundled Worker in workerd through Miniflare.
- 102 browser checks pass across Chrome desktop/mobile, Edge, Firefox and WebKit desktop/mobile. After the final mobile-sidebar adjustment, all six Research Desk browser tests passed again.
- 32 deployed staging interaction/accessibility checks pass across Chrome desktop/mobile, including anonymous Cloudflare Access redirects and the email sign-in screen.
- The owner's existing authenticated browser session successfully loaded the deployed dashboard, real metrics, published article editor with all twelve references selected, and protected article preview. Article and landscape layouts were visually reviewed.
- Administrator browser workflow tests use isolated fixtures, not a production authentication bypass. Real JWT/Access protection is tested separately. No test enquiries or payments were submitted to staging.
- Staging D1 was exported to an ignored private backup before applying additive migrations 0002 and 0003. Both migrations succeeded. No production deployment or production database migration was performed.

WebKit emulation on Windows is not physical iPhone/Safari certification. Automated accessibility checks do not replace human assistive-technology review.

## Production launch gate

- Obtain owner approval of this staging release before deploying `igbo.ai`.
- Confirm domain/zone access, production D1, production Access policy and JWT audience; repeat protected access tests.
- Review research citations and Igbo examples with appropriate domain reviewers. The register is an initial assessment, not legal permission to reuse data or a reproduced model benchmark.
- Confirm production robots allows public indexing while excluding administration, API and internal templates. Verify sitemap and article canonical URLs on the final domain.
- Record deployment and rollback ownership; retain a database backup before migrations.
- Forms, payments and AI remain disabled. Provider setup, approved notices, retention, receiving entity and related activation requirements remain in `owner-inputs.md`.

Access policy/administrator membership changes are audited in Cloudflare Zero Trust. The application audit log covers content and application settings; it does not claim to mirror Cloudflare access-policy events.
