import type { AppEnv } from './types';
import { escapeHTML as e } from './validation';
import { publicAPI } from './public';
export async function managedContent(
  path: string,
  response: Response,
  env: AppEnv,
) {
  let rewriter = new HTMLRewriter();
  if (path === '/support' || path === '/support/index.html') {
    const enabled = await env.DB.prepare(
      "SELECT value FROM site_settings WHERE key='payments_enabled'",
    ).first<string>('value');
    if (
      enabled !== 'true' ||
      !env.PAYMENT_ENDPOINT ||
      !env.PAYMENT_API_KEY ||
      !env.PAYMENT_WEBHOOK_SECRET
    ) {
      rewriter = rewriter.on('#support-form', {
        element(el) {
          el.remove();
        },
      });
    }
  }
  if (path === '/research/landscape') {
    const data = await env.DB.prepare(
      "SELECT * FROM resources WHERE status='Published' ORDER BY category,title",
    ).all<Record<string, string | number | null>>();
    const rows = data.results;
    const html = rows
      .map(
        (r) =>
          `<tr data-category="${e(String(r.category))}" data-access="${e(String(r.access_status))}"><th scope="row"><a href="${e(String(r.url))}" target="_blank" rel="noopener noreferrer">${e(String(r.title))} ↗</a><small>${e(String(r.organisation))}</small></th><td>${e(String(r.category))}</td><td>${e(String(r.summary))}</td><td>${e(String(r.licence))}${r.licence_url ? `<br><a href="${e(String(r.licence_url))}" target="_blank" rel="noopener noreferrer">Terms / licence ↗</a>` : ''}<details><summary>Assessment notes</summary><p>${e(String(r.notes))}</p></details></td><td><span class="status">${e(String(r.potential_role))}</span></td><td>${r.verified ? 'Source verified; reuse audit still required' : 'Initial assessment'}<small>Last reviewed: ${e(String(r.last_reviewed_at || 'Not recorded'))}</small></td></tr>`,
      )
      .join('');
    const latest = rows
      .map((r) => String(r.last_reviewed_at || ''))
      .sort()
      .at(-1);
    rewriter = rewriter
      .on('#landscape-rows', {
        element(el) {
          el.setInnerContent(html, { html: true });
        },
      })
      .on('#landscape-reviewed', {
        element(el) {
          el.setInnerContent(
            latest
              ? `Last reviewed: ${e(latest)} (most recent resource review). Individual dates appear below.`
              : 'No review date recorded.',
            { html: true },
          );
        },
      });
  }
  if (path === '/roadmap') {
    const rows = (await (await publicAPI('roadmap', env)).json()) as {
      id: string;
      title: string;
      status: string;
      description: string;
      target_date: string | null;
      milestones: { title: string; status: string }[];
    }[];
    const html = rows
      .map(
        (p, i) =>
          `<details class="phase-details" id="${e(p.id)}" ${i === 0 ? 'open' : ''}><summary><span>${String(i).padStart(2, '0')}</span><h2>${e(p.title)}</h2><span class="status">${e(p.status)}</span></summary><div class="phase-body"><p>${e(p.description)}</p><ul>${p.milestones.map((m) => `<li>${e(m.title)} <small>— ${e(m.status)}</small></li>`).join('')}</ul><div class="phase-meta">Target: ${e(p.target_date || 'To be confirmed')}</div></div></details>`,
      )
      .join('');
    rewriter = rewriter.on('#roadmap-phases', {
      element(el) {
        el.setInnerContent(html, { html: true });
      },
    });
  }
  if (path === '/' || path === '/updates') {
    if (path === '/') {
      const phases = await env.DB.prepare(
        'SELECT id,title,description,status FROM roadmap_phases ORDER BY sort_order LIMIT 4',
      ).all<Record<string, string>>();
      rewriter = rewriter.on('#homepage-roadmap', {
        element(el) {
          el.setInnerContent(
            phases.results
              .map(
                (p, i) =>
                  `<a href="/roadmap#${e(p.id)}" class="preview-phase${i === 0 ? ' current' : ''}"><div class="phase-line"><span>${String(i).padStart(2, '0')}</span><i></i></div><span class="status">${e(p.status)}</span><h3>${e(p.title)}</h3><p>${e(p.description)}</p></a>`,
              )
              .join(''),
            { html: true },
          );
        },
      });
    }
    const rows = await env.DB.prepare(
      "SELECT slug,title,summary,published_at FROM research_updates WHERE status='Published' ORDER BY published_at DESC LIMIT 30",
    ).all<Record<string, string>>();
    const selected = path === '/' ? rows.results.slice(0, 1) : rows.results;
    const html = selected
      .map(
        (r) =>
          `<a class="resource-card" href="/updates/${e(r.slug)}"><span class="eyebrow">${path === '/' && r.slug === 'igbo-ai-landscape-review-v0-1' ? 'INITIAL LANDSCAPE REVIEW COMPLETE' : e(r.published_at.slice(0, 10))}</span><h3>${e(r.title)}</h3><p>${e(r.summary)}</p><span>Read the review →</span></a>`,
      )
      .join('');
    rewriter = rewriter
      .on(path === '/' ? '#latest-research' : '#updates-list', {
        element(el) {
          el.setInnerContent(html, { html: true });
        },
      })
      .on('#updates-empty', {
        element(el) {
          if (selected.length) el.setAttribute('hidden', '');
        },
      });
  }
  if (path.startsWith('/technology/')) {
    const row = await env.DB.prepare(
      'SELECT status FROM project_statuses WHERE slug=?',
    )
      .bind(path.split('/')[2])
      .first<{ status: string }>();
    if (row)
      rewriter = rewriter.on('[data-tech-status]', {
        element(el) {
          el.setInnerContent(e(row.status), { html: true });
        },
      });
  }
  const rendered = rewriter.transform(response);
  rendered.headers.delete('ETag');
  rendered.headers.delete('Last-Modified');
  rendered.headers.set('Cache-Control', 'no-store');
  return rendered;
}
