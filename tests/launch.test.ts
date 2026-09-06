import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResendEmailProvider } from '../worker/providers';
import { collaborationSchema, sponsorshipSchema } from '../worker/validation';
import worker from '../worker/index';
import { legalPages } from '../src/data/legal';
import type { AppEnv } from '../worker/types';
afterEach(() => vi.unstubAllGlobals());
describe('launch safeguards', () => {
  const enquiry = {
    name: 'Ada Example',
    email: 'ada@example.org',
    organisation: 'Example',
    message: 'A collaboration enquiry for the research project.',
    contact_consent: true,
    privacy_consent: true,
    collaboration_type: 'Native speaker',
  };
  it('requires adult confirmation for both public enquiry endpoints', () => {
    for (const schema of [collaborationSchema, sponsorshipSchema]) {
      expect(schema.safeParse(enquiry).success).toBe(false);
      expect(
        schema.safeParse({ ...enquiry, age_confirmed: false }).success,
      ).toBe(false);
      expect(
        schema.safeParse({ ...enquiry, age_confirmed: true }).success,
      ).toBe(true);
    }
  });
  it('sends the documented Resend payload with an idempotency key', async () => {
    const send = vi.fn(async () => Response.json({ id: 'mail-id' }));
    vi.stubGlobal('fetch', send);
    const env = {
      EMAIL_ENDPOINT: 'https://api.resend.com/emails',
      EMAIL_FROM: 'Igbo AI <kedu@igbo.ai>',
      RESEND_API_KEY: 'test-only',
    } as AppEnv;
    await new ResendEmailProvider(env).send({
      id: 'stable-id',
      to: 'ada@example.org',
      subject: 'Enquiry acknowledgement',
      text: 'Received.',
    });
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(new Headers(init.headers).get('Idempotency-Key')).toBe('stable-id');
    expect(JSON.parse(String(init.body))).toEqual({
      from: env.EMAIL_FROM,
      to: ['ada@example.org'],
      subject: 'Enquiry acknowledgement',
      text: 'Received.',
      reply_to: 'kedu@igbo.ai',
    });
  });
  it('does not send mail to an arbitrary gateway', async () => {
    const send = vi.fn();
    vi.stubGlobal('fetch', send);
    await expect(
      new ResendEmailProvider({
        EMAIL_ENDPOINT: 'https://example.org',
      } as AppEnv).send({
        id: 'id',
        to: 'ada@example.org',
        subject: 'test',
        text: 'test',
      }),
    ).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
  it('permanently redirects www on production preserving path and query', async () => {
    const response = await worker.fetch(
      new Request('https://www.igbo.ai/research/?topic=pronunciation'),
      { ENVIRONMENT: 'production' } as AppEnv,
      {} as ExecutionContext,
    );
    expect(response.status).toBe(308);
    expect(response.headers.get('Location')).toBe(
      'https://igbo.ai/research/?topic=pronunciation',
    );
    expect(response.headers.get('X-Robots-Tag')).toBeNull();
  });
  it('publishes the approved legal entity and no pre-launch policy', () => {
    for (const page of Object.values(legalPages)) {
      const text = JSON.stringify(page);
      for (const value of [
        'Galaxyway AI Ltd',
        '15966090',
        '18 Holly Hill Road',
        '6 September 2026',
      ])
        expect(text).toContain(value);
      expect(text).not.toMatch(/pre-launch|VAT/i);
    }
    expect(JSON.stringify(legalPages.privacy)).toContain(
      'legitimate interests',
    );
  });
});
