import type { AppEnv } from './types';
import { HTTPError } from './security';
import { escapeHTML } from './validation';
export async function articlePage(
  identifier: string,
  env: AppEnv,
  preview = false,
) {
  const row = await env.DB.prepare(
    `SELECT * FROM research_updates WHERE ${preview ? 'id=?' : "slug=? AND status='Published'"}`,
  )
    .bind(identifier)
    .first<Record<string, string>>();
  if (!row) return null;
  const e = escapeHTML;
  const canonical = `https://igbo.ai/updates/${encodeURIComponent(row.slug)}`;
  const resources = await env.DB.prepare(
    "SELECT r.* FROM resources r JOIN research_update_resources l ON l.resource_id=r.id WHERE l.update_id=? AND r.status='Published' ORDER BY r.title",
  )
    .bind(row.id)
    .all<Record<string, string>>();
  const html = row.content
    .split(/\n\s*\n/)
    .map((p) =>
      p.startsWith('## ')
        ? `<h2>${e(p.slice(3))}</h2>`
        : `<p>${e(p).replaceAll('\n', '<br>')}</p>`,
    )
    .join('');
  const source = await env.ASSETS.fetch(
    new Request(new URL('/research/article-template/', env.SITE_URL)),
  );
  const rendered = new HTMLRewriter()
    .on('title', {
      element(el) {
        el.setInnerContent(`${e(row.title)} — Igbo AI`, { html: true });
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute('href', canonical);
      },
    })
    .on('meta[name="robots"]', {
      element(el) {
        if (!preview) el.remove();
      },
    })
    .on('meta[name="description"],meta[property="og:description"]', {
      element(el) {
        el.setAttribute('content', row.seo_description || row.summary);
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        el.setAttribute('content', row.title);
      },
    })
    .on('meta[property="og:url"]', {
      element(el) {
        el.setAttribute('content', canonical);
      },
    })
    .on('meta[property="og:type"]', {
      element(el) {
        el.setAttribute('content', 'article');
      },
    })
    .on('head', {
      element(el) {
        el.append(
          `<meta property="article:published_time" content="${e(row.published_at || '')}"><meta property="article:modified_time" content="${e(row.updated_at)}">`,
          { html: true },
        );
      },
    })
    .on('#article-title', {
      element(el) {
        el.setInnerContent(e(row.title), { html: true });
      },
    })
    .on('#article-summary', {
      element(el) {
        el.setInnerContent(e(row.summary), { html: true });
      },
    })
    .on('#article-status', {
      element(el) {
        el.setInnerContent(
          preview ? 'PRIVATE PREVIEW · ' + e(row.status) : 'RESEARCH UPDATE',
          { html: true },
        );
      },
    })
    .on('#article-meta', {
      element(el) {
        el.setInnerContent(
          `${e(row.author_organisation)} · ${row.published_at ? 'Published ' + e(row.published_at.slice(0, 10)) : 'Unpublished draft'} · Updated ${e(row.updated_at.slice(0, 10))}`,
          { html: true },
        );
      },
    })
    .on('#article-body', {
      element(el) {
        el.setInnerContent(html, { html: true });
      },
    })
    .on('#article-references', {
      element(el) {
        el.setInnerContent(
          resources.results.length
            ? `<h2>Sources & references</h2><p>External work reviewed; inclusion does not imply partnership or permission to reuse.</p><ol>${resources.results.map((r) => `<li><a href="${e(r.url)}" target="_blank" rel="noopener noreferrer">${e(r.title)} ↗</a> — ${e(r.organisation)}. ${e(r.licence)}. Last reviewed: ${e(r.last_reviewed_at || 'Not recorded')}.</li>`).join('')}</ol>`
            : '',
          { html: true },
        );
      },
    })
    .transform(source);
  rendered.headers.delete('ETag');
  rendered.headers.delete('Last-Modified');
  rendered.headers.set('Cache-Control', 'no-store');
  return rendered;
}
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
      "SELECT public_display_name,CASE WHEN display_organisation=1 THEN organisation ELSE '' END AS organisation,website FROM supporters s WHERE status='Approved' AND public_consent=1 AND anonymous=0 AND EXISTS(SELECT 1 FROM support_transactions t WHERE t.supporter_id=s.id AND t.status='Paid') ORDER BY created_at",
    updates:
      "SELECT slug,title,summary,published_at FROM research_updates WHERE status='Published' ORDER BY published_at DESC",
    resources:
      "SELECT id,title,organisation,summary,url,category,licence,licence_url,access_status,potential_role,notes,last_reviewed_at,verified,doi FROM resources WHERE status='Published'",
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
