# Production activation checklist

## Required to deploy

- [ ] Cloudflare account and zone access for `igbo.ai`.
- [x] Existing workers.dev staging URL retained for Phase 2 review.
- [ ] Owner approval of the Phase 2 staging release before final-domain deployment.
- [x] Staging D1 database created and migrated; production database still required.
- [x] Staging Cloudflare Access configured for `admin@igbo.ai`; owner sign-in and protected data verified. Production Access configuration still required.
- [x] Repository: `https://github.com/Galaxyway-AI/igbo.ai`; initial source branch: `main`.

## Required before collecting enquiries

- [x] Public contact and customer support address: `support@igbo.ai` (owner confirmed).
- [ ] Confirm the responsible legal entity and address.
- [ ] Approve privacy notice, terms, retention schedule, service providers and international transfer information.
- [ ] Provide Turnstile public/secret keys with the correct production and staging hostnames.
- [ ] Provide transactional email provider or gateway, verified sender and admin notification destination.
- [ ] Test acknowledgement delivery, spam controls and administrator review in staging.
- [ ] Set an approved consent version and enable forms in protected site settings.

## Required before payments

- [ ] Select payment provider and receiving account/entity.
- [ ] Provide payment adapter endpoint/key and webhook signing secret; test the gateway contract.
- [ ] Approve currency, allowed support values, support terms, refund/contact process and provider notices.
- [ ] Confirm public acknowledgement policy and contribution levels if used.
- [ ] Test payment, failure, refund, duplicate and delayed webhooks using provider sandbox mode.
- [ ] Enable payments only after all prerequisites pass.

## Brand and research inputs

- [ ] Approve the original Igbo AI wordmark and design.
- [ ] Supply an approved Galaxyway AI logo if desired; the current site uses a text acknowledgement.
- [ ] Review Igbo orthography and example phrases with a linguist/native speaker.
- [ ] Confirm resource-level citations, versions and licences for the landscape review.
- [ ] Supply approved updates, confirmed organisations and supporter listings with consent.
- [ ] Supply verified funding objectives/totals and statuses; no invented figures are seeded.
- [ ] Supply official social profiles. No social accounts are fabricated.

## Deferred speech features

- [ ] Approved adult contributor terms, voice rights, permitted training/synthesis/redistribution/commercial uses, retention and withdrawal process.
- [ ] Dialect taxonomy and reference-recording review.
- [ ] Reviewed AI provider adapter, model provenance and limitation notices.
- [ ] Private R2 storage, audio processing/review queue and upload abuse protections.
- [ ] Real-device Safari/Chrome microphone, recording and playback tests.

These future features are disabled rather than represented as working services.
