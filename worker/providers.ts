import type { AppEnv } from './types';
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
export interface ConversationProvider {
  respond(
    messages: ChatMessage[],
    signal?: AbortSignal,
  ): Promise<{ text: string; provider: string; model: string }>;
}
export interface SpeechRecognitionProvider {
  transcribe(
    audio: ArrayBuffer,
    mimeType: string,
  ): Promise<{ text: string; dialect?: string }>;
}
export interface SpeechSynthesisProvider {
  speak(
    text: string,
    options: { dialect?: string; voice?: string },
  ): Promise<{
    audio: ArrayBuffer;
    mimeType: string;
    transcript: string;
    provider: string;
  }>;
}
export interface EmailProvider {
  send(message: {
    id: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<void>;
}
export interface PaymentProvider {
  checkout(input: {
    transactionId: string;
    amountMinor: number;
    currency: string;
    email: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string; reference: string }>;
}
export class GatewayEmailProvider implements EmailProvider {
  constructor(private env: AppEnv) {}
  async send(message: {
    id: string;
    to: string;
    subject: string;
    text: string;
  }) {
    requireHTTPS(this.env.EMAIL_ENDPOINT);
    const response = await fetch(this.env.EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.EMAIL_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': message.id,
      },
      body: JSON.stringify({ ...message, from: this.env.EMAIL_FROM }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error('Email delivery failed');
  }
}
export class GatewayPaymentProvider implements PaymentProvider {
  constructor(private env: AppEnv) {}
  async checkout(input: Parameters<PaymentProvider['checkout']>[0]) {
    requireHTTPS(this.env.PAYMENT_ENDPOINT);
    const r = await fetch(this.env.PAYMENT_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.PAYMENT_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.transactionId,
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw Error('Checkout unavailable');
    const data = (await r.json()) as { url: string; reference: string };
    if (
      typeof data.reference !== 'string' ||
      data.reference.length > 200 ||
      new URL(data.url).protocol !== 'https:'
    )
      throw Error('Invalid checkout');
    return data;
  }
}
function requireHTTPS(endpoint: string) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw Error(
      'Integration endpoints must use HTTPS without embedded credentials.',
    );
  }
}
export async function deliverOutbox(env: AppEnv) {
  if (!env.EMAIL_ENDPOINT || !env.EMAIL_API_KEY || !env.EMAIL_FROM) return;
  const provider = new GatewayEmailProvider(env);
  const { results } = await env.DB.prepare(
    "SELECT * FROM email_outbox WHERE status='Pending' AND attempts<5 ORDER BY created_at LIMIT 20",
  ).all<{ id: string; recipient: string; subject: string; body: string }>();
  for (const row of results) {
    const claim = await env.DB.prepare(
      "UPDATE email_outbox SET status='Sending',attempts=attempts+1 WHERE id=? AND status='Pending' RETURNING id",
    )
      .bind(row.id)
      .first();
    if (!claim) continue;
    try {
      await provider.send({
        id: row.id,
        to: row.recipient,
        subject: row.subject,
        text: row.body,
      });
      await env.DB.prepare("UPDATE email_outbox SET status='Sent' WHERE id=?")
        .bind(row.id)
        .run();
    } catch {
      await env.DB.prepare(
        "UPDATE email_outbox SET status='Pending' WHERE id=?",
      )
        .bind(row.id)
        .run();
      console.error(
        JSON.stringify({ event: 'email_delivery_failed', id: row.id }),
      );
    }
  }
}
