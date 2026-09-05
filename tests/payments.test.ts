import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile } from 'node:fs/promises';
import worker from '../worker/index';
import { adminAPI } from '../worker/admin';
import type { AppEnv } from '../worker/types';
let mf: Miniflare;
let env: AppEnv;
const id = 'a8b676a1-aab0-4e23-8d70-1b48b97bdbf2';
const ctx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext;
beforeAll(async () => {
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response("ok")}}',
      d1Databases: ['DB'],
    }),
  );
  const db = await mf.getD1Database('DB');
  const sql = await readFile(
    new URL('../migrations/0001_initial.sql', import.meta.url),
    'utf8',
  );
  for (const statement of sql.split(';').filter((s) => s.trim()))
    await db.prepare(statement).run();
  env = {
    DB: db,
    SITE_URL: 'https://igbo.ai',
    ENVIRONMENT: 'production',
    PAYMENT_WEBHOOK_SECRET: 'test-only-signing-secret',
  } as AppEnv;
  await db
    .prepare(
      "INSERT INTO supporters(id,private_name,email,public_display_name,public_consent,anonymous) VALUES('public-supporter','Private Name','private@example.org','Public Name',1,0)",
    )
    .run();
  await db
    .prepare(
      "INSERT INTO support_transactions(id,supporter_id,amount_minor) VALUES(?,'public-supporter',2500)",
    )
    .bind(id)
    .run();
});
afterAll(async () => mf?.dispose());
async function webhook(
  status: string,
  eventId: string,
  amountMinor = 2500,
  secret = env.PAYMENT_WEBHOOK_SECRET!,
) {
  const data = {
    eventId,
    transactionId: id,
    status,
    amountMinor,
    currency: 'GBP',
  };
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify(data);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = [
    ...new Uint8Array(
      await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(`${timestamp}.${body}`),
      ),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
  return worker.fetch(
    new Request('https://igbo.ai/api/support/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Signature': signature,
      },
      body,
    }),
    env,
    ctx,
  );
}
describe('verified payment lifecycle', () => {
  it('rejects invalid signatures and amount mismatches', async () => {
    expect(
      (await webhook('Paid', 'bad-signature', 2500, 'wrong-secret')).status,
    ).toBe(401);
    expect((await webhook('Paid', 'wrong-amount', 100)).status).toBe(400);
  });
  it('records paid once and allows explicitly consented approval', async () => {
    expect((await webhook('Paid', 'paid-event')).status).toBe(200);
    await webhook('Paid', 'paid-event');
    expect(
      await env.DB.prepare(
        'SELECT count(*) AS count FROM webhook_events',
      ).first('count'),
    ).toBe(1);
    const approve = new Request(
      'https://igbo.ai/api/admin/supporters/public-supporter',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved' }),
      },
    );
    expect((await adminAPI(approve, env, 'admin@example.org')).status).toBe(
      200,
    );
    const r = await worker.fetch(
      new Request('https://igbo.ai/api/public/supporters'),
      env,
      ctx,
    );
    const supporters = await r.json();
    expect(supporters).toEqual([
      { public_display_name: 'Public Name', organisation: '', website: '' },
    ]);
    expect(JSON.stringify(supporters)).not.toContain('private@example.org');
  });
  it('ignores late failure events after confirmed payment', async () => {
    await webhook('Failed', 'late-failure');
    expect(
      await env.DB.prepare('SELECT status FROM support_transactions WHERE id=?')
        .bind(id)
        .first('status'),
    ).toBe('Paid');
  });
  it('removes refunded supporters and cannot resurrect refunded transactions', async () => {
    await webhook('Refunded', 'refund-event');
    await webhook('Paid', 'late-paid-event');
    expect(
      await env.DB.prepare('SELECT status FROM support_transactions WHERE id=?')
        .bind(id)
        .first('status'),
    ).toBe('Refunded');
    const r = await worker.fetch(
      new Request('https://igbo.ai/api/public/supporters'),
      env,
      ctx,
    );
    expect(await r.json()).toEqual([]);
  });
});
