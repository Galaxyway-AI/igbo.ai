# Integration contracts

## Email

`EmailProvider` is independent of the frontend. `ResendEmailProvider` sends Resend-format HTTPS JSON to `EMAIL_ENDPOINT` (restricted to `https://api.resend.com/emails`) using a bearer `RESEND_API_KEY` and `Idempotency-Key` equal to the outbox ID.

Request: `{ from, to: [recipient], subject, text, reply_to }`. The outbox ID is carried in the Idempotency-Key header, not the JSON payload. A 2xx response means accepted by Resend, not proof of inbox delivery. Configure a verified sending domain and RESEND_API_KEY before delivery is active.

Successful form submission stores acknowledgement and admin notification jobs in the same D1 batch. `waitUntil` attempts delivery after persistence. Failed delivery returns the job to `Pending`, with a maximum of five attempts. The configured 15-minute scheduled handler retries pending jobs. A crashed delivery can leave a `Sending` job: an operator must inspect the provider by idempotency key and recover the job without creating a second message. Before high-volume launch, add timestamp-based lease recovery and a dedicated queue consumer. Do not log message bodies or recipient details.

## Payments

`PaymentProvider` receives `{ transactionId, amountMinor, currency, email, successUrl, cancelUrl }` and returns `{ url, reference }`. The configured HTTPS gateway must create a checkout session with exact server-provided amount/currency and a stable idempotency key. Stripe or another provider can be connected behind this contract without altering public UI.

`PAYMENT_ENDPOINT` is a trusted operator-controlled URL, not visitor input. Configure an HTTPS endpoint and keep its API key secret. Gateway failures are surfaced honestly and never imply support was received.

The gateway calls `POST /api/support/webhook` with JSON:

```json
{
  "eventId": "unique-provider-event",
  "transactionId": "UUID",
  "status": "Paid",
  "amountMinor": 2500,
  "currency": "GBP"
}
```

Allowed statuses: `Paid`, `Refunded`, `Failed`. The gateway must verify the payment vendor's signature first, map only verified events to this contract, and associate the internal transaction ID with the vendor session. Partial refunds are not supported by this initial contract; mark the transaction refunded when acknowledgement should cease, or extend the adapter/state machine before offering partial refunds.

Include `X-Webhook-Timestamp` (Unix seconds) and `X-Webhook-Signature` (lowercase hex HMAC-SHA256). Signed input is `${timestamp}.${JSON.stringify(parsedBody)}` using the exact property order transmitted. Timestamps outside five minutes are rejected. The Worker validates amount/currency, deduplicates event IDs and prevents a refunded transaction returning to paid. Prefer a versioned raw-body signature contract if gateways cannot guarantee canonical JSON serialisation.

Only confirmed paid transactions can qualify for public acknowledgement. Returning from checkout is not payment confirmation. Public consent is separate from payment and recorded with its version. Private preferences always override stale display options.

## AI

`ConversationProvider`, `SpeechRecognitionProvider`, and `SpeechSynthesisProvider` define independent interfaces. Responses must include provider/model metadata or speech provenance. The current Lab is intentionally a non-inference interface preview. The `/api/lab/*` routes return 503. Setting `AI_ENDPOINT` alone does not activate them.

Before activation implement and test a provider adapter, request validation, abuse limits, bounded audio sizes, timeouts/cancellation, privacy disclosure, recording permissions and voice consent. Keep provider credentials on the Worker. Never label third-party speech as a released Igbo AI model.

## Future audio / experiments

R2 should store private audio under random server-generated IDs with verified MIME/container/codec and length limits. Do not trust uploaded filenames. Signed reads should be short lived and scope limited; collect explicit consent before accepting the first byte. Put inspection/transcoding and human review behind a queue. No audio upload route or R2 bucket is enabled now.

The schema includes experiment IDs, protocol/consent versions and anonymous response linkage. Blind comparisons must randomise sample presentation without revealing model identity, and preserve model/sample mapping on the server. Feedback records are separate from collaboration contacts.

## Privacy-respectful analytics and monitoring

Cloudflare Web Analytics is the sole allowed analytics integration. The Worker injects its beacon only into production public HTML with a configured CLOUDFLARE_ANALYTICS_TOKEN. Staging and admin are excluded. No marketing pixels or extra analytics event adapter is enabled. Workers observability records safe event codes and opaque IDs, not request bodies, tokens, email addresses or payment data. See launch-readiness.md for missing account setup.
