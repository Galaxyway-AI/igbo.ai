import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AppEnv } from './types';
export class HTTPError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function authenticate(request: Request, env: AppEnv) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.ADMIN_EMAILS)
    throw new HTTPError(
      503,
      'Administration is locked until Cloudflare Access is configured.',
    );
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN))
    throw new HTTPError(503, 'Administration is not configured.');
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token)
    throw new HTTPError(401, 'Sign in through Cloudflare Access to continue.');
  try {
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
    const keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: env.ACCESS_AUD,
      algorithms: ['RS256'],
    });
    const email =
      typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    if (
      !email ||
      !env.ADMIN_EMAILS.split(',')
        .map((s) => s.trim().toLowerCase())
        .includes(email)
    )
      throw Error();
    return email;
  } catch {
    throw new HTTPError(403, 'You do not have administrator access.');
  }
}
export function sameOrigin(request: Request, env: AppEnv) {
  const origin = request.headers.get('Origin');
  const url = new URL(request.url);
  const expected =
    env.ENVIRONMENT === 'development' ? url.origin : env.SITE_URL;
  if (origin !== expected)
    throw new HTTPError(
      403,
      'This request must come from the project website.',
    );
}
export async function readJSON(request: Request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json'))
    throw new HTTPError(415, 'Expected a JSON request.');
  if (Number(request.headers.get('Content-Length') || 0) > 65536)
    throw new HTTPError(413, 'Request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new HTTPError(400, 'Request body is required.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new HTTPError(413, 'Request is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HTTPError(400, 'Invalid JSON request.');
  }
}
export async function protectForm(
  request: Request,
  env: AppEnv,
  token: string | undefined,
) {
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY)
    throw new HTTPError(
      503,
      'The enquiry service is being prepared. Please contact support@igbo.ai in the meantime.',
    );
  const key = await hash(
    `${request.headers.get('CF-Connecting-IP') || 'unknown'}:${Math.floor(Date.now() / 600000)}`,
  );
  const expires = Math.floor(Date.now() / 1000) + 1200;
  const row = await env.DB.prepare(
    'INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',
  )
    .bind(key, expires)
    .first<{ count: number }>();
  if (row && row.count > 8)
    throw new HTTPError(
      429,
      'Too many attempts. Please try again in ten minutes.',
    );
  await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?')
    .bind(Math.floor(Date.now() / 1000))
    .run();
  if (!token) throw new HTTPError(400, 'Please complete the security check.');
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: request.headers.get('CF-Connecting-IP'),
        idempotency_key: crypto.randomUUID(),
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const result = (await response.json()) as {
    success: boolean;
    hostname?: string;
    action?: string;
  };
  if (
    !result.success ||
    result.hostname !== new URL(env.SITE_URL).hostname ||
    result.action !== 'submit'
  )
    throw new HTTPError(
      400,
      'The security check expired or was invalid. Please try again.',
    );
}
async function hash(value: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  ]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}
export function secure(response: Response, privateResponse = false) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'microphone=(), camera=(), geolocation=()');
  headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  );
  if (privateResponse) {
    headers.set('Cache-Control', 'no-store');
    headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  // Revalidate HTML after deployments; hashed asset files retain their caching.
  if (
    headers.get('Content-Type')?.includes('text/html') &&
    headers.get('Cache-Control') !== 'no-store'
  )
    headers.set('Cache-Control', 'no-cache');
  return new Response(response.body, { status: response.status, headers });
}
