import { ZodError } from 'zod';
import type { AppEnv } from './types';
import {
  HTTPError,
  authenticate,
  sameOrigin,
  readJSON,
  protectForm,
  secure,
} from './security';
import {
  collaborationSchema,
  sponsorshipSchema,
  supporterSchema,
  publicPreferences,
} from './validation';
import { adminAPI } from './admin';
import { publicAPI, articlePage } from './public';
import { managedContent } from './content';
import { deliverOutbox, GatewayPaymentProvider } from './providers';
async function settings(env: AppEnv) {
  const { results } = await env.DB.prepare(
    'SELECT key,value FROM site_settings',
  ).all<{ key: string; value: string }>();
  return Object.fromEntries(results.map((r) => [r.key, r.value]));
}
export default {
  async fetch(
    request: Request,
    env: AppEnv,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    let path: string;
    try {
      path = decodeURIComponent(url.pathname).replace(/\/$/, '') || '/';
    } catch {
      return secure(new Response('Not found', { status: 404 }), true);
    }
    const privateResponse =
      path.startsWith('/admin') || path.startsWith('/api');
    try {
      if (
        path === '/admin' ||
        path.startsWith('/admin/') ||
        path.startsWith('/api/admin/')
      ) {
        const actor = await authenticate(request, env);
        if (path.startsWith('/api/admin/')) {
          if (!['GET', 'HEAD'].includes(request.method))
            sameOrigin(request, env);
          return secure(await adminAPI(request, env, actor), true);
        }
        return secure(await env.ASSETS.fetch(request), true);
      }
      if (path === '/api/config') {
        const state = await settings(env);
        return secure(
          Response.json({
            turnstileSiteKey: env.TURNSTILE_SITE_KEY,
            formsEnabled: state.forms_enabled === 'true',
            paymentsEnabled:
              state.payments_enabled === 'true' &&
              Boolean(
                env.PAYMENT_ENDPOINT &&
                env.PAYMENT_API_KEY &&
                env.PAYMENT_WEBHOOK_SECRET,
              ),
          }),
          true,
        );
      }
      if (path.startsWith('/api/public/')) {
        if (request.method !== 'GET')
          throw new HTTPError(405, 'Method not allowed.');
        return secure(
          await publicAPI(path.slice('/api/public/'.length), env),
          true,
        );
      }
      if (path === '/api/support/webhook') {
        if (request.method !== 'POST')
          throw new HTTPError(405, 'Method not allowed.');
        return secure(await paymentWebhook(request, env), true);
      }
      if (path.startsWith('/api/')) {
        if (request.method !== 'POST')
          throw new HTTPError(405, 'Method not allowed.');
        sameOrigin(request, env);
        if (path === '/api/collaborate' || path === '/api/sponsorship') {
          const state = await settings(env);
          if (state.forms_enabled !== 'true')
            throw new HTTPError(
              503,
              'Expressions of interest are not open on this preview yet. Please contact support@igbo.ai.',
            );
          const body = await readJSON(request);
          const data = path.endsWith('collaborate')
            ? collaborationSchema.parse(body)
            : sponsorshipSchema.parse(body);
          await protectForm(request, env, data['cf-turnstile-response']);
          const id = crypto.randomUUID();
          const entries = Object.entries(data).filter(
            ([key]) =>
              ![
                'contact_consent',
                'privacy_consent',
                'cf-turnstile-response',
              ].includes(key),
          );
          const table = path.endsWith('collaborate')
            ? 'collaborators'
            : 'sponsorship_enquiries';
          const statements = [
            env.DB.prepare(
              `INSERT INTO ${table}(id,${entries.map(([k]) => k).join(',')}) VALUES (?,${entries.map(() => '?').join(',')})`,
            ).bind(id, ...entries.map(([, v]) => v)),
            ...['contact', 'privacy'].map((purpose) =>
              env.DB.prepare(
                'INSERT INTO consent_records(id,subject_id,purpose,version,granted) VALUES(?,?,?,?,1)',
              ).bind(crypto.randomUUID(), id, purpose, state.consent_version),
            ),
          ];
          statements.push(
            env.DB.prepare(
              'INSERT INTO email_outbox(id,recipient,subject,body) VALUES(?,?,?,?)',
            ).bind(
              crypto.randomUUID(),
              data.email,
              'Your expression of interest — Igbo AI',
              'Thank you for your interest in Igbo AI. Your enquiry has been received. Our team will review it and respond when appropriate.\n\nIgbo AI is an open language technology initiative led by Galaxyway AI.',
            ),
          );
          if (env.ADMIN_NOTIFICATION_EMAIL)
            statements.push(
              env.DB.prepare(
                'INSERT INTO email_outbox(id,recipient,subject,body) VALUES(?,?,?,?)',
              ).bind(
                crypto.randomUUID(),
                env.ADMIN_NOTIFICATION_EMAIL,
                'New Igbo AI enquiry',
                `A new ${table === 'collaborators' ? 'collaboration' : 'sponsorship'} enquiry is ready for review in the protected administration dashboard. Reference: ${id}.`,
              ),
            );
          await env.DB.batch(statements);
          ctx.waitUntil(deliverOutbox(env));
          return secure(Response.json({ ok: true, id }, { status: 201 }), true);
        }
        if (path === '/api/support/checkout') {
          const state = await settings(env);
          if (
            state.payments_enabled !== 'true' ||
            !env.PAYMENT_ENDPOINT ||
            !env.PAYMENT_API_KEY ||
            !env.PAYMENT_WEBHOOK_SECRET
          )
            throw new HTTPError(
              503,
              'Support payments are not open yet. No payment has been taken. You can discuss sponsorship using the enquiry form below.',
            );
          const data = supporterSchema.parse(await readJSON(request));
          await protectForm(request, env, data['cf-turnstile-response']);
          const id = crypto.randomUUID(),
            transactionId = crypto.randomUUID();
          const pref = publicPreferences(data);
          await env.DB.batch([
            env.DB.prepare(
              'INSERT INTO supporters(id,private_name,email,organisation,public_display_name,website,public_consent,anonymous,display_amount,display_level,display_organisation) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
            ).bind(
              id,
              data.name,
              data.email,
              data.organisation,
              pref.public_display_name,
              pref.public_consent ? data.website : '',
              pref.public_consent,
              pref.anonymous,
              pref.display_amount,
              pref.display_level,
              pref.display_organisation,
            ),
            env.DB.prepare(
              'INSERT INTO support_transactions(id,supporter_id,amount_minor) VALUES(?,?,?)',
            ).bind(transactionId, id, data.amount * 100),
            env.DB.prepare(
              'INSERT INTO consent_records(id,subject_id,purpose,version,granted) VALUES(?,?,?,?,?)',
            ).bind(
              crypto.randomUUID(),
              id,
              'public_acknowledgement',
              state.consent_version,
              pref.public_consent,
            ),
            env.DB.prepare(
              'INSERT INTO consent_records(id,subject_id,purpose,version,granted) VALUES(?,?,?,?,1)',
            ).bind(crypto.randomUUID(), id, 'privacy', state.consent_version),
          ]);
          try {
            const checkout = await new GatewayPaymentProvider(env).checkout({
              transactionId,
              amountMinor: data.amount * 100,
              currency: 'GBP',
              email: data.email,
              successUrl: `${env.SITE_URL}/support?checkout=returned`,
              cancelUrl: `${env.SITE_URL}/support?checkout=cancelled`,
            });
            await env.DB.prepare(
              'UPDATE support_transactions SET provider_reference=? WHERE id=?',
            )
              .bind(checkout.reference, transactionId)
              .run();
            return secure(Response.json(checkout), true);
          } catch {
            await env.DB.prepare(
              "UPDATE support_transactions SET status='Failed' WHERE id=? AND status='Pending'",
            )
              .bind(transactionId)
              .run();
            throw new HTTPError(
              502,
              'Checkout could not be started. Please try again later.',
            );
          }
        }
        if (path.startsWith('/api/lab/'))
          throw new HTTPError(
            503,
            'The Lab is coming soon. No AI service or voice collection is active.',
          );
        throw new HTTPError(404, 'Endpoint not found.');
      }
      if (path.startsWith('/updates/')) {
        const article = await articlePage(path.slice(9), env);
        if (article) return secure(article, env.ENVIRONMENT !== 'production');
      }
      if (path === '/sitemap.xml') {
        const base = [
          '/',
          '/research',
          '/research/landscape',
          '/technology',
          '/roadmap',
          '/collaborate',
          '/support',
          '/supporters',
          '/updates',
          '/lab',
          '/about',
          '/ethics',
          '/open-source',
          '/participate',
          '/privacy',
          '/terms',
          '/support/transparency',
        ];
        const { results } = await env.DB.prepare(
          "SELECT slug FROM research_updates WHERE status='Published'",
        ).all<{ slug: string }>();
        const tech = await env.DB.prepare(
          'SELECT slug FROM project_statuses',
        ).all<{ slug: string }>();
        const urls = [
          ...base,
          ...results.map((r) => '/updates/' + r.slug),
          ...tech.results.map((r) => '/technology/' + r.slug),
        ];
        return secure(
          new Response(
            `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((p) => `<url><loc>https://igbo.ai${p}</loc></url>`).join('')}</urlset>`,
            { headers: { 'Content-Type': 'application/xml' } },
          ),
          env.ENVIRONMENT !== 'production',
        );
      }
      if (path === '/robots.txt')
        return secure(
          new Response(
            env.ENVIRONMENT === 'production'
              ? 'User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /research/article-template\nSitemap: https://igbo.ai/sitemap.xml\n'
              : 'User-agent: *\nDisallow: /\n',
            { headers: { 'Content-Type': 'text/plain' } },
          ),
          env.ENVIRONMENT !== 'production',
        );
      if (
        path === '/research/article-template' ||
        path.startsWith('/research/article-template/')
      )
        throw new HTTPError(404, 'Not found.');
      let response = await env.ASSETS.fetch(request);
      if (
        response.ok &&
        ([
          '/',
          '/updates',
          '/roadmap',
          '/research/landscape',
          '/support',
          '/support/index.html',
        ].includes(path) ||
          path.startsWith('/technology/'))
      )
        response = await managedContent(path, response, env);
      const secured = secure(response);
      if (env.ENVIRONMENT !== 'production')
        secured.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return secured;
    } catch (error) {
      const status =
        error instanceof HTTPError
          ? error.status
          : error instanceof ZodError
            ? 400
            : 500;
      const message =
        error instanceof HTTPError
          ? error.message
          : error instanceof ZodError
            ? 'Please check the required fields, lengths and URLs.'
            : 'The service is temporarily unavailable. Please try again later.';
      if (status === 500)
        console.error(
          JSON.stringify({ event: 'request_failed', path, status }),
        );
      const response = path.startsWith('/api')
        ? Response.json({ error: message }, { status })
        : new Response(
            `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Igbo AI — Access required</title><body style="background:#f8f7f2;color:#224c3b;font:16px/1.8 system-ui;padding:10vw"><h1>Private administration</h1><p>${message}</p><a href="/">Return to Igbo AI</a></body></html>`,
            { status, headers: { 'Content-Type': 'text/html;charset=utf-8' } },
          );
      return secure(
        response,
        privateResponse || env.ENVIRONMENT !== 'production',
      );
    }
  },
  async scheduled(
    _controller: ScheduledController,
    env: AppEnv,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(deliverOutbox(env));
  },
};
async function paymentWebhook(request: Request, env: AppEnv) {
  if (!env.PAYMENT_WEBHOOK_SECRET)
    throw new HTTPError(503, 'Payments not configured.');
  const timestamp = request.headers.get('X-Webhook-Timestamp') || '';
  const signature = request.headers.get('X-Webhook-Signature') || '';
  if (
    !/^\d+$/.test(timestamp) ||
    Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    throw new HTTPError(401, 'Invalid webhook signature.');
  const data = await readJSON(request);
  const { z } = await import('zod');
  const parsed = z
    .object({
      eventId: z.string().max(200),
      transactionId: z.string().uuid(),
      status: z.enum(['Paid', 'Refunded', 'Failed']),
      amountMinor: z.number().int().positive(),
      currency: z.literal('GBP'),
    })
    .parse(data);
  const canonical = JSON.stringify(data);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.PAYMENT_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const bytes = new Uint8Array(
    signature.match(/.{2}/g)!.map((n) => parseInt(n, 16)),
  );
  if (
    !(await crypto.subtle.verify(
      'HMAC',
      key,
      bytes,
      new TextEncoder().encode(`${timestamp}.${canonical}`),
    ))
  )
    throw new HTTPError(401, 'Invalid webhook signature.');
  const transaction = await env.DB.prepare(
    'SELECT amount_minor,currency FROM support_transactions WHERE id=?',
  )
    .bind(parsed.transactionId)
    .first<{ amount_minor: number; currency: string }>();
  if (
    !transaction ||
    transaction.amount_minor !== parsed.amountMinor ||
    transaction.currency !== parsed.currency
  )
    throw new HTTPError(400, 'Transaction mismatch.');
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE support_transactions SET status=? WHERE id=? AND NOT EXISTS(SELECT 1 FROM webhook_events WHERE id=?) AND status!='Refunded' AND NOT(status='Paid' AND ?='Failed')",
    ).bind(parsed.status, parsed.transactionId, parsed.eventId, parsed.status),
    env.DB.prepare('INSERT OR IGNORE INTO webhook_events(id) VALUES(?)').bind(
      parsed.eventId,
    ),
  ]);
  return Response.json({ ok: true });
}
