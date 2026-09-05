import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { articleFixture } from './helpers';
import worker from '../worker/index';
import {
  collaborationSchema,
  supporterSchema,
  publicPreferences,
  escapeHTML,
} from '../worker/validation';
import { authenticate, readJSON } from '../worker/security';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { adminAPI } from '../worker/admin';
import type { AppEnv } from '../worker/types';
let mf: Miniflare;
let env: AppEnv;
const context = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
} as unknown as ExecutionContext;
const valid = {
  name: 'Ada Example',
  email: 'ada@example.org',
  collaboration_type: 'Native speaker',
  message: 'I would like to help review Igbo pronunciation.',
  contact_consent: true,
  privacy_consent: true,
  'cf-turnstile-response': 'verified-token',
};
function request(path: string, body?: unknown, origin = 'https://igbo.ai') {
  return new Request('https://igbo.ai' + path, {
    method: body ? 'POST' : 'GET',
    headers: body
      ? { 'Content-Type': 'application/json', Origin: origin }
      : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}
beforeAll(async () => {
  const bundled = await build({
    entryPoints: ['worker/index.ts'],
    bundle: true,
    format: 'esm',
    write: false,
    platform: 'neutral',
    target: 'es2022',
  });
  mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: 'test',
          modules: true,
          script: bundled.outputFiles[0].text,
          d1Databases: ['DB'],
          compatibilityDate: '2026-09-05',
          bindings: { ENVIRONMENT: 'production', SITE_URL: 'https://igbo.ai' },
          serviceBindings: {
            ASSETS: () =>
              new Response(articleFixture, {
                headers: { 'Content-Type': 'text/html' },
              }),
          },
        },
      ],
    }),
  );
  const db = await mf.getD1Database('DB');
  for (const migration of ['0001_initial.sql', '0002_research_metadata.sql']) {
    const sql = await readFile(
      new URL(`../migrations/${migration}`, import.meta.url),
      'utf8',
    );
    for (const statement of sql.split(';').filter((s) => s.trim()))
      await db.prepare(statement).run();
  }
  env = {
    DB: db,
    ASSETS: {
      fetch: async (input: RequestInfo | URL) =>
        new Response(
          (input instanceof Request ? input.url : String(input)).includes(
            '/research/article-template/',
          )
            ? '<!doctype html><html><head><title>Research update</title><meta name="description"><meta property="og:description"><meta property="og:title"><meta property="og:url"><meta property="og:type"><meta name="robots"><link rel="canonical"></head><body><span id="article-status"></span><h1 id="article-title"></h1><p id="article-summary"></p><p id="article-meta"></p><div id="article-body"></div><section id="article-references"></section></body></html>'
            : 'asset',
        ),
    },
    ENVIRONMENT: 'production',
    SITE_URL: 'https://igbo.ai',
    TURNSTILE_SITE_KEY: 'test-key',
    TURNSTILE_SECRET_KEY: 'test-secret',
    ACCESS_TEAM_DOMAIN: '',
    ACCESS_AUD: '',
    ADMIN_EMAILS: '',
    EMAIL_ENDPOINT: '',
    EMAIL_FROM: '',
    ADMIN_NOTIFICATION_EMAIL: '',
    PAYMENT_ENDPOINT: '',
    AI_ENDPOINT: '',
  } as AppEnv;
});
afterAll(async () => {
  await mf?.dispose();
});
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
  context.waitUntil = vi.fn();
});
describe('input integrity', () => {
  it('enforces body limits even without a Content-Length header', async () => {
    const r = new Request('https://igbo.ai/api/collaborate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'x'.repeat(70000) }),
    });
    await expect(readJSON(r)).rejects.toMatchObject({ status: 413 });
  });
  it('preserves original decomposed Igbo text', () => {
    const text = 'ọ\u0301 bụ ị\u0300 — Igbo pronunciation review';
    expect(collaborationSchema.parse({ ...valid, message: text }).message).toBe(
      text,
    );
  });
  it('requires explicit consent and rejects unsafe URLs', () => {
    expect(
      collaborationSchema.safeParse({ ...valid, contact_consent: false })
        .success,
    ).toBe(false);
    expect(
      collaborationSchema.safeParse({
        ...valid,
        website: 'javascript:alert(1)',
      }).success,
    ).toBe(false);
  });
  it('defaults supporters to private and overrides stale public options', () => {
    const data = supporterSchema.parse({
      name: 'Ada',
      email: 'a@example.org',
      amount: 25,
      privacy_consent: true,
      display_amount: true,
      public_display_name: 'Accidental public name',
    });
    expect(publicPreferences(data)).toEqual({
      public_consent: 0,
      anonymous: 1,
      public_display_name: '',
      display_amount: 0,
      display_level: 0,
      display_organisation: 0,
    });
  });
  it('requires display name for public consent', () => {
    expect(
      supporterSchema.safeParse({
        name: 'Ada',
        email: 'a@example.org',
        amount: 25,
        privacy_consent: true,
        public_consent: true,
      }).success,
    ).toBe(false);
  });
  it('escapes untrusted article content', () =>
    expect(escapeHTML('<script>"x"</script>')).toBe(
      '&lt;script&gt;&quot;x&quot;&lt;/script&gt;',
    ));
});
describe('public API and persistence', () => {
  it('retrieves all roadmap phases and related milestones', async () => {
    const r = await worker.fetch(request('/api/public/roadmap'), env, context);
    const data = (await r.json()) as { milestones: unknown[] }[];
    expect(data).toHaveLength(7);
    expect(data[0].milestones).toHaveLength(3);
  });
  it('rejects collection until enabled', async () => {
    const r = await worker.fetch(
      request('/api/collaborate', valid),
      env,
      context,
    );
    expect(r.status).toBe(503);
  });
  it('rejects cross-origin submissions', async () => {
    const r = await worker.fetch(
      request('/api/collaborate', valid, 'https://attacker.example'),
      env,
      context,
    );
    expect(r.status).toBe(403);
  });
  it('stores collaboration and consent atomically with pending acknowledgement', async () => {
    await env.DB.prepare(
      "UPDATE site_settings SET value='true' WHERE key='forms_enabled'",
    ).run();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ success: true, hostname: 'igbo.ai', action: 'submit' }),
      ),
    );
    const r = await worker.fetch(
      request('/api/collaborate', valid),
      env,
      context,
    );
    expect(r.status).toBe(201);
    const { id } = (await r.json()) as { id: string };
    expect(
      await env.DB.prepare('SELECT name FROM collaborators WHERE id=?')
        .bind(id)
        .first('name'),
    ).toBe(valid.name);
    const consents = await env.DB.prepare(
      'SELECT * FROM consent_records WHERE subject_id=?',
    )
      .bind(id)
      .all();
    expect(consents.results).toHaveLength(2);
    expect(
      await env.DB.prepare('SELECT status FROM email_outbox WHERE recipient=?')
        .bind(valid.email)
        .first('status'),
    ).toBe('Pending');
  });
  it('rejects forged Turnstile hostname without storing data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          success: true,
          hostname: 'attacker.example',
          action: 'submit',
        }),
      ),
    );
    const r = await worker.fetch(
      request('/api/collaborate', valid),
      env,
      context,
    );
    expect(r.status).toBe(400);
  });
  it('does not initiate unconfigured payments', async () =>
    expect(
      (
        await worker.fetch(
          request('/api/support/checkout', { amount: 25 }),
          env,
          context,
        )
      ).status,
    ).toBe(503));
});
describe('administration and publication', () => {
  it('accepts only a correctly signed, current JWT for an allowed administrator', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          keys: [{ ...jwk, kid: 'test-key', use: 'sig', alg: 'RS256' }],
        }),
      ),
    );
    const configured = {
      ...env,
      ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com',
      ACCESS_AUD: 'expected-aud',
      ADMIN_EMAILS: 'admin@example.org',
    };
    const token = await new SignJWT({ email: 'admin@example.org' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer('https://example.cloudflareaccess.com')
      .setAudience('expected-aud')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
    const r = new Request('https://igbo.ai/admin', {
      headers: { 'Cf-Access-Jwt-Assertion': token },
    });
    expect(await authenticate(r, configured)).toBe('admin@example.org');
    await expect(
      authenticate(r, { ...configured, ACCESS_AUD: 'wrong-aud' }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      authenticate(r, {
        ...configured,
        ADMIN_EMAILS: 'someone-else@example.org',
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('fails closed without Access configuration', async () => {
    expect((await worker.fetch(request('/admin'), env, context)).status).toBe(
      503,
    );
    expect(
      (await worker.fetch(request('/api/admin/collaborators'), env, context))
        .status,
    ).toBe(503);
  });
  it('does not trust an Access email header', async () => {
    const r = new Request('https://igbo.ai/admin', {
      headers: { 'Cf-Access-Authenticated-User-Email': 'admin@example.org' },
    });
    await expect(
      authenticate(r, {
        ...env,
        ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com',
        ACCESS_AUD: 'aud',
        ADMIN_EMAILS: 'admin@example.org',
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('rejects malformed JWTs', async () => {
    const r = new Request('https://igbo.ai/admin', {
      headers: { 'Cf-Access-Jwt-Assertion': 'fake.jwt.token' },
    });
    await expect(
      authenticate(r, {
        ...env,
        ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com',
        ACCESS_AUD: 'aud',
        ADMIN_EMAILS: 'admin@example.org',
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('publishes updates through validated admin workflow and escapes HTML in crawlable articles', async () => {
    const data = {
      title: 'Research methods',
      slug: 'research-methods',
      summary: 'A note on the proposed evaluation method.',
      content: 'A long research note. <script>alert(1)</script>',
      status: 'Draft',
    };
    const created = await adminAPI(
      request('/api/admin/updates', data),
      env,
      'admin@example.org',
    );
    const { id } = (await created.json()) as { id: string };
    let rows = await (
      await worker.fetch(request('/api/public/updates'), env, context)
    ).json();
    expect(rows).toEqual([]);
    await adminAPI(
      new Request('https://igbo.ai/api/admin/updates/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status: 'Published' }),
      }),
      env,
      'admin@example.org',
    );
    rows = await (
      await worker.fetch(request('/api/public/updates'), env, context)
    ).json();
    expect(rows).toHaveLength(1);
    const article = await mf.dispatchFetch(
      'https://igbo.ai/updates/research-methods',
    );
    expect(article.status).toBe(200);
    expect(await article.text()).toContain('&lt;script&gt;');
  });
  it('never publishes unconsented supporters even if status is approved', async () => {
    await env.DB.prepare(
      "INSERT INTO supporters(id,private_name,email,public_display_name,status) VALUES('s1','Private Name','private@example.org','Unsafe','Approved')",
    ).run();
    const r = await worker.fetch(
      request('/api/public/supporters'),
      env,
      context,
    );
    expect(await r.json()).toEqual([]);
  });
  it('refuses approval without consent and paid transaction', async () => {
    await expect(
      adminAPI(
        new Request('https://igbo.ai/api/admin/supporters/s1', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Approved' }),
        }),
        env,
        'admin@example.org',
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('protects private responses from caching', async () => {
    const r = await worker.fetch(request('/api/admin/dashboard'), env, context);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(r.headers.get('X-Robots-Tag')).toContain('noindex');
  });
});
