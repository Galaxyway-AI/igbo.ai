import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { applyMigrations, articleFixture } from './helpers';
import { adminAPI } from '../worker/admin';
import type { AppEnv } from '../worker/types';
let mf: Miniflare;
let env: AppEnv;
const data = {
  title: 'Workflow test',
  slug: 'workflow-test',
  summary: 'A private draft used to verify the publication workflow.',
  content:
    '## Methods\n\nAn escaped example <script>alert(1)</script> and Unicode: ọ́.',
  status: 'Draft',
  resource_ids: ['waxal'],
};
function edit(collection: string, id: string | undefined, body: unknown) {
  return adminAPI(
    new Request(
      `https://igbo.ai/api/admin/${collection}${id ? '/' + id : ''}`,
      {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    ),
    env,
    'test-admin@example.org',
  );
}
beforeAll(async () => {
  const code = await build({
    stdin: {
      contents: `import worker from './worker/index'; import {adminAPI} from './worker/admin'; export default {fetch(request,env,ctx){ const url=new URL(request.url); if(url.pathname.startsWith('/test-preview/')) return adminAPI(new Request('https://igbo.ai/api/admin/updates/'+url.pathname.split('/')[2]+'/preview'),env,'isolated-test'); if(url.pathname.startsWith('/test-production/')) {url.pathname=url.pathname.replace('/test-production','');return worker.fetch(new Request(url,request),{...env,ENVIRONMENT:'production',SITE_URL:'https://igbo.ai'},ctx);} return worker.fetch(request,env,ctx); }}`,
      resolveDir: process.cwd(),
    },
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    write: false,
  });
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: code.outputFiles[0].text,
      d1Databases: ['DB'],
      bindings: {
        ENVIRONMENT: 'staging',
        SITE_URL: 'https://staging.example.org',
      },
      serviceBindings: {
        ASSETS: (request) =>
          new Response(
            new URL(request.url).pathname.includes('article-template')
              ? articleFixture
              : '<!doctype html><html><body><div id="landscape-reviewed"></div><table><tbody id="landscape-rows"></tbody></table><div id="roadmap-phases"></div><div id="homepage-roadmap"></div><div id="updates-list"></div><div id="latest-research"></div><span data-tech-status>Planned</span></body></html>',
            { headers: { 'Content-Type': 'text/html' } },
          ),
      },
    }),
  );
  const db = await mf.getD1Database('DB');
  env = {
    DB: db,
    ENVIRONMENT: 'staging',
    SITE_URL: 'https://staging.example.org',
  } as AppEnv;
  await applyMigrations(db as unknown as D1Database, [
    '0001_initial.sql',
    '0002_research_metadata.sql',
    '0003_landscape_review.sql',
    '0004_ibo_dict.sql',
  ]);
}, 30000);
afterAll(async () => {
  await mf?.dispose();
});
describe('Phase 2 research activation', () => {
  it('maintains thirteen distinct sources including the gated ibo-dict dataset', async () => {
    const rows = await env.DB.prepare(
      "SELECT id FROM resources WHERE status='Published'",
    ).all();
    expect(rows.results).toHaveLength(13);
    const resource = await env.DB.prepare(
      "SELECT summary,notes,licence FROM resources WHERE id='ibo-dict'",
    ).first<{ summary: string; notes: string; licence: string }>();
    expect(resource?.summary).toContain('25,500');
    expect(resource?.notes).toContain('contact information');
    expect(resource?.licence).toContain('CC BY 4.0');
  });
  it('renders homepage progress from D1 and prevents stale managed HTML', async () => {
    await env.DB.prepare(
      "UPDATE roadmap_phases SET status='On Hold' WHERE id='phase-0'",
    ).run();
    try {
      const response = await mf.dispatchFetch('https://igbo.ai/');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      const html = await response.text();
      expect(html).toContain('On Hold');
      expect(html).toContain('INITIAL LANDSCAPE REVIEW COMPLETE');
    } finally {
      await env.DB.prepare(
        "UPDATE roadmap_phases SET status='In Progress' WHERE id='phase-0'",
      ).run();
    }
  });
  it('allows production public indexing while private administration remains noindex', async () => {
    for (const path of [
      '/',
      '/robots.txt',
      '/updates/igbo-ai-landscape-review-v0-1',
    ]) {
      const response = await mf.dispatchFetch(
        `https://igbo.ai/test-production${path}`,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Robots-Tag')).toBeNull();
      if (path === '/robots.txt')
        expect(await response.text()).not.toContain('Disallow: /\n');
      if (path.startsWith('/updates'))
        expect(await response.text()).not.toContain('name="robots"');
    }
    const admin = await mf.dispatchFetch(
      'https://igbo.ai/test-production/admin/',
    );
    expect(admin.status).toBe(503);
    expect(admin.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });
  it('migrates the initial review without marking the whole phase complete', async () => {
    const rows = (await (
      await mf.dispatchFetch('https://igbo.ai/api/public/roadmap')
    ).json()) as {
      id: string;
      status: string;
      milestones: { status: string }[];
    }[];
    const phase = rows.find((r) => r.id === 'phase-0')!;
    expect(phase.status).toBe('In Progress');
    expect(phase.milestones).toHaveLength(8);
    expect(
      phase.milestones.filter((m) => m.status === 'Completed'),
    ).toHaveLength(4);
    const html = await (
      await mf.dispatchFetch('https://igbo.ai/roadmap')
    ).text();
    expect(html).toContain('Initial dataset and model inventory');
    expect(html).toContain('Completed');
  });
  it('renders maintained references and review metadata in the public landscape', async () => {
    const html = await (
      await mf.dispatchFetch('https://igbo.ai/research/landscape')
    ).text();
    expect(html).toContain('Nkọwa okwu / IgboAPI');
    expect(html).toContain('CC BY-SA 4.0');
    expect(html).toContain('Last reviewed: 2026-09-05');
    expect(html).toContain('data-category="NLP"');
    expect(
      await env.DB.prepare('SELECT count(*) count FROM organisations').first(
        'count',
      ),
    ).toBe(0);
  });
  it('supports draft, private preview, publish, unpublish and audit history', async () => {
    const { id } = (await (await edit('updates', undefined, data)).json()) as {
      id: string;
    };
    const unpublished = (await (
      await mf.dispatchFetch('https://igbo.ai/api/public/updates')
    ).json()) as { slug: string }[];
    expect(unpublished.some((r) => r.slug === data.slug)).toBe(false);
    const preview = await (
      await mf.dispatchFetch(`https://igbo.ai/test-preview/${id}`)
    ).text();
    expect(preview).toContain('PRIVATE PREVIEW');
    expect(preview).toContain('Workflow test');
    expect(preview).toContain('&lt;script&gt;');
    expect(preview).toContain('name="robots"');
    await edit('updates', id, { ...data, status: 'Published' });
    const article = await mf.dispatchFetch(
      'https://igbo.ai/updates/workflow-test',
    );
    expect(article.headers.get('X-Robots-Tag')).toContain('noindex');
    const html = await article.text();
    expect(html).toContain('href="https://igbo.ai/updates/workflow-test"');
    expect(html).toContain('Google WAXAL');
    expect(html).not.toContain('<script>alert');
    const publishedAt = await env.DB.prepare(
      'SELECT published_at FROM research_updates WHERE id=?',
    )
      .bind(id)
      .first('published_at');
    await edit('updates', id, data);
    const after = (await (
      await mf.dispatchFetch('https://igbo.ai/api/public/updates')
    ).json()) as { slug: string }[];
    expect(after.some((r) => r.slug === data.slug)).toBe(false);
    expect(
      await env.DB.prepare(
        'SELECT published_at FROM research_updates WHERE id=?',
      )
        .bind(id)
        .first('published_at'),
    ).toBe(publishedAt);
    const log = await env.DB.prepare(
      "SELECT previous_value,new_value FROM audit_log WHERE entity_id=? AND action='unpublish'",
    )
      .bind(id)
      .first<{ previous_value: string; new_value: string }>();
    expect(JSON.parse(log!.previous_value).status).toBe('Published');
    expect(JSON.parse(log!.new_value).status).toBe('Draft');
  });
  it('returns genuine dashboard metrics and current milestone', async () => {
    const response = await adminAPI(
      new Request('https://igbo.ai/api/admin/dashboard'),
      env,
      'test-admin@example.org',
    );
    const dashboard = (await response.json()) as {
      metrics: { updates: { total: number } };
      phase: { status: string };
      next: { title: string };
      activity: unknown[];
    };
    expect(dashboard.metrics.updates.total).toBe(1);
    expect(dashboard.phase.status).toBe('In Progress');
    expect(dashboard.next.title).toContain('collaborator');
    expect(dashboard.activity.length).toBeGreaterThan(0);
  });
  it('keeps organisation acknowledgement private without separate consent', async () => {
    await env.DB.prepare(
      "INSERT INTO supporters(id,private_name,email,organisation,public_display_name,public_consent,anonymous,status) VALUES('consent-check','Private','test@example.org','Private Org','Public name',1,0,'Approved')",
    ).run();
    await env.DB.prepare(
      "INSERT INTO support_transactions(id,supporter_id,amount_minor,status) VALUES('consent-payment','consent-check',100,'Paid')",
    ).run();
    const rows = (await (
      await mf.dispatchFetch('https://igbo.ai/api/public/supporters')
    ).json()) as { organisation: string }[];
    expect(rows[0].organisation).toBe('');
  });
  it('keeps staging unindexed and sitemaps canonical without admin or templates', async () => {
    const robots = await mf.dispatchFetch('https://igbo.ai/robots.txt');
    expect(await robots.text()).toContain('Disallow: /\n');
    expect(robots.headers.get('X-Robots-Tag')).toContain('noindex');
    const sitemap = await mf.dispatchFetch('https://igbo.ai/sitemap.xml');
    const xml = await sitemap.text();
    expect(xml).toContain('https://igbo.ai/research/landscape');
    expect(xml).not.toContain('staging.example');
    expect(xml).not.toContain('/admin');
    expect(xml).not.toContain('article-template');
  });
});
