import type { AppEnv } from './types';
import { HTTPError } from './security';
import { escapeHTML } from './validation';
export async function publicAPI(path: string, env: AppEnv) {
  if (path === 'roadmap') {
    const phases = await env.DB.prepare(
      'SELECT * FROM roadmap_phases ORDER BY sort_order',
    ).all();
    const milestones = await env.DB.prepare(
      'SELECT title,status,phase_id FROM roadmap_milestones ORDER BY sort_order',
    ).all();
    return Response.json(
      phases.results.map((p) => ({
        ...p,
        milestones: milestones.results.filter((m) => m.phase_id === p.id),
      })),
    );
  }
  const queries: Record<string, string> = {
    supporters:
      "SELECT public_display_name,organisation,website FROM supporters s WHERE status='Approved' AND public_consent=1 AND anonymous=0 AND EXISTS(SELECT 1 FROM support_transactions t WHERE t.supporter_id=s.id AND t.status='Paid') ORDER BY created_at",
    updates:
      "SELECT slug,title,summary,published_at FROM research_updates WHERE status='Published' ORDER BY published_at DESC",
    resources:
      "SELECT title,summary,url,category,licence,doi FROM resources WHERE status='Published'",
    campaigns:
      "SELECT title,summary,target_minor,verified_total_minor,currency FROM funding_campaigns WHERE status='Published'",
    organisations:
      "SELECT title,summary,url,logo_url FROM organisations WHERE status='Published' AND relationship_confirmed=1",
    projects: 'SELECT slug,status FROM project_statuses',
  };
  if (!queries[path]) throw new HTTPError(404, 'Not found.');
  const { results } = await env.DB.prepare(queries[path]).all();
  return Response.json(results);
}
export async function articlePage(slug: string, env: AppEnv) {
  const row = await env.DB.prepare(
    "SELECT * FROM research_updates WHERE slug=? AND status='Published'",
  )
    .bind(slug)
    .first<{
      title: string;
      summary: string;
      content: string;
      published_at: string;
      author_organisation: string;
      seo_description: string;
      related_url: string;
    }>();
  if (!row) return null;
  const e = escapeHTML;
  const canonical = `${env.SITE_URL}/updates/${encodeURIComponent(slug)}`;
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(row.title)} — Igbo AI</title><meta name="description" content="${e(row.seo_description || row.summary)}"><link rel="canonical" href="${e(canonical)}"><meta property="og:type" content="article"><meta property="og:title" content="${e(row.title)}"><meta property="og:description" content="${e(row.summary)}"><meta property="og:url" content="${e(canonical)}"><meta property="og:image" content="${e(env.SITE_URL)}/social.png"><meta property="article:published_time" content="${e(row.published_at)}"><meta name="twitter:card" content="summary_large_image"><style>body{margin:0;background:#f8f7f2;color:#233b2d;font:16px/1.9 system-ui}main,nav{max-width:760px;margin:auto;padding:35px 24px}nav{border-bottom:1px solid #d5ddcf}a{color:#224c3b}h1{font:400 clamp(32px,5vw,52px)/1.25 Georgia}article{white-space:pre-wrap;color:#53624d}small{color:#718067}footer{padding-block:35px}</style></head><body><nav><a href="/">Igbo AI</a> · <a href="/updates">Research journal</a></nav><main><small>RESEARCH UPDATE · <time datetime="${e(row.published_at)}">${e(row.published_at.slice(0, 10))}</time></small><h1>${e(row.title)}</h1><p>${e(row.summary)}</p><p><small>${e(row.author_organisation || 'Igbo AI')}</small></p><article>${e(row.content)}</article>${row.related_url ? `<p><a href="${e(row.related_url)}" rel="noopener noreferrer">Related reference ↗</a></p>` : ''}<footer><a href="/updates">← All research updates</a><p><small>Igbo AI is an open language technology initiative led by Galaxyway AI.</small></p></footer></main></body></html>`,
    { headers: { 'Content-Type': 'text/html;charset=utf-8' } },
  );
}
