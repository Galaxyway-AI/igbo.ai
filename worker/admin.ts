import { z } from 'zod';
import {
  collaboratorUpdate,
  phaseSchema,
  updateSchema,
  resourceSchema,
  campaignSchema,
  organisationSchema,
} from './validation';
import { readJSON, HTTPError } from './security';
import type { AppEnv } from './types';
const tables = {
  collaborators: 'collaborators',
  supporters: 'supporters',
  sponsorship: 'sponsorship_enquiries',
  roadmap: 'roadmap_phases',
  updates: 'research_updates',
  resources: 'resources',
  campaigns: 'funding_campaigns',
  organisations: 'organisations',
  feedback: 'lab_feedback',
  projects: 'project_statuses',
  audit: 'audit_log',
  email: 'email_outbox',
} as const;
function audit(
  env: AppEnv,
  actor: string,
  action: string,
  type: string,
  id: string,
) {
  return env.DB.prepare(
    'INSERT INTO audit_log(id,actor,action,entity_type,entity_id) VALUES (?,?,?,?,?)',
  ).bind(crypto.randomUUID(), actor, action, type, id);
}
export async function adminAPI(request: Request, env: AppEnv, actor: string) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const collection = parts[2] as keyof typeof tables;
  const id = parts[3];
  if (collection === ('settings' as string)) {
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT * FROM site_settings',
      ).all();
      return Response.json(results);
    }
    const data = z
      .object({
        forms_enabled: z.boolean(),
        payments_enabled: z.boolean(),
        consent_version: z.string().min(3).max(100),
      })
      .parse(await readJSON(request));
    if (
      data.forms_enabled &&
      (!env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET_KEY)
    )
      throw new HTTPError(400, 'Configure Turnstile before enabling forms.');
    if (
      data.payments_enabled &&
      (!env.PAYMENT_ENDPOINT ||
        !env.PAYMENT_API_KEY ||
        !env.PAYMENT_WEBHOOK_SECRET)
    )
      throw new HTTPError(
        400,
        'Configure the payment adapter and webhook secret first.',
      );
    await env.DB.batch([
      ...Object.entries(data).map(([key, value]) =>
        env.DB.prepare(
          'UPDATE site_settings SET value=?,updated_at=CURRENT_TIMESTAMP WHERE key=?',
        ).bind(String(value), key),
      ),
      audit(env, actor, 'update', 'settings', 'site'),
    ]);
    return Response.json({ ok: true });
  }
  if (collection === ('dashboard' as string)) {
    const queries = [
      'collaborators',
      'supporters',
      'research_updates',
      'sponsorship_enquiries',
    ] as const;
    const counts = await env.DB.batch<{ count: number }>(
      queries.map((table) =>
        env.DB.prepare(`SELECT count(*) AS count FROM ${table}`),
      ),
    );
    return Response.json(
      Object.fromEntries(
        queries.map((key, i) => [key, counts[i].results[0]?.count || 0]),
      ),
    );
  }
  if (!tables[collection]) throw new HTTPError(404, 'Unknown collection.');
  const table = tables[collection];
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM ${table} LIMIT 500`,
    ).all();
    if (collection === 'roadmap') {
      const milestones = await env.DB.prepare(
        'SELECT * FROM roadmap_milestones ORDER BY sort_order',
      ).all();
      return Response.json(
        results.map((p) => ({
          ...p,
          milestones: milestones.results.filter((m) => m.phase_id === p.id),
        })),
      );
    }
    if (collection === 'collaborators' && id) {
      const row = results.find((r) => r.id === id);
      if (!row) throw new HTTPError(404, 'Application not found.');
      const notes = await env.DB.prepare(
        'SELECT * FROM collaborator_notes WHERE collaborator_id=? ORDER BY created_at DESC',
      )
        .bind(id)
        .all();
      return Response.json({ ...row, notes: notes.results });
    }
    return Response.json(results);
  }
  if (!['POST', 'PATCH'].includes(request.method))
    throw new HTTPError(405, 'Method not allowed.');
  const data = await readJSON(request);
  const recordId = id || crypto.randomUUID();
  if (request.method === 'PATCH') {
    const key = collection === 'projects' ? 'slug' : 'id';
    const exists = await env.DB.prepare(
      `SELECT ${key} FROM ${table} WHERE ${key}=?`,
    )
      .bind(recordId)
      .first();
    if (!exists) throw new HTTPError(404, 'Record not found.');
  }
  if (collection === 'collaborators') {
    if (!id)
      throw new HTTPError(
        405,
        'Applications are created through the public form.',
      );
    const parsed = collaboratorUpdate.parse(data);
    const statements = [
      env.DB.prepare(
        'UPDATE collaborators SET status=?,tags=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
      ).bind(parsed.status, parsed.tags, id),
      audit(env, actor, 'update', collection, id),
    ];
    if (parsed.note)
      statements.push(
        env.DB.prepare(
          'INSERT INTO collaborator_notes(id,collaborator_id,admin_email,body) VALUES(?,?,?,?)',
        ).bind(crypto.randomUUID(), id, actor, parsed.note),
      );
    await env.DB.batch(statements);
  } else if (collection === 'supporters') {
    if (!id)
      throw new HTTPError(405, 'Supporters are created through checkout.');
    const parsed = z
      .object({ status: z.enum(['Pending', 'Approved', 'Hidden']) })
      .parse(data);
    const row = await env.DB.prepare(
      'SELECT public_consent,anonymous,public_display_name FROM supporters WHERE id=?',
    )
      .bind(id)
      .first<{
        public_consent: number;
        anonymous: number;
        public_display_name: string;
      }>();
    const paid = await env.DB.prepare(
      "SELECT id FROM support_transactions WHERE supporter_id=? AND status='Paid'",
    )
      .bind(id)
      .first();
    if (
      parsed.status === 'Approved' &&
      (!row?.public_consent ||
        row.anonymous ||
        !row.public_display_name ||
        !paid)
    )
      throw new HTTPError(
        400,
        'Approval requires explicit public consent, a display name and a confirmed payment.',
      );
    await env.DB.batch([
      env.DB.prepare('UPDATE supporters SET status=? WHERE id=?').bind(
        parsed.status,
        id,
      ),
      audit(env, actor, 'update', collection, id),
    ]);
  } else if (collection === 'roadmap') {
    const parsed = phaseSchema.parse(data);
    const { milestones, ...values } = parsed;
    await env.DB.batch([
      upsert(env, table, recordId, values),
      env.DB.prepare('DELETE FROM roadmap_milestones WHERE phase_id=?').bind(
        recordId,
      ),
      ...milestones.map((m, i) =>
        env.DB.prepare(
          'INSERT INTO roadmap_milestones(id,phase_id,title,status,sort_order) VALUES(?,?,?,?,?)',
        ).bind(crypto.randomUUID(), recordId, m.title, m.status, i),
      ),
      audit(env, actor, 'save', collection, recordId),
    ]);
  } else if (collection === 'updates') {
    const parsed = updateSchema.parse(data);
    const existing = await env.DB.prepare(
      'SELECT published_at FROM research_updates WHERE id=?',
    )
      .bind(recordId)
      .first<{ published_at: string | null }>();
    await env.DB.batch([
      upsert(env, table, recordId, {
        ...parsed,
        published_at:
          parsed.status === 'Published'
            ? existing?.published_at || new Date().toISOString()
            : null,
      }),
      audit(env, actor, 'save', collection, recordId),
    ]);
  } else if (
    collection === 'resources' ||
    collection === 'campaigns' ||
    collection === 'organisations'
  ) {
    const parsed =
      collection === 'resources'
        ? resourceSchema.parse(data)
        : collection === 'campaigns'
          ? campaignSchema.parse(data)
          : organisationSchema.parse(data);
    await env.DB.batch([
      upsert(env, table, recordId, parsed),
      audit(env, actor, 'save', collection, recordId),
    ]);
  } else if (collection === 'projects') {
    if (!id) throw new HTTPError(400, 'Project slug required.');
    const parsed = z
      .object({
        status: z.enum([
          'Planned',
          'Research',
          'In Development',
          'Testing',
          'Released',
        ]),
      })
      .parse(data);
    await env.DB.batch([
      env.DB.prepare(
        'UPDATE project_statuses SET status=?,updated_at=CURRENT_TIMESTAMP WHERE slug=?',
      ).bind(parsed.status, id),
      audit(env, actor, 'update', collection, id),
    ]);
  } else if (collection === 'sponsorship') {
    if (!id) throw new HTTPError(400, 'Enquiry ID required.');
    const parsed = z
      .object({ status: z.enum(['New', 'Reviewing', 'Contacted', 'Archived']) })
      .parse(data);
    await env.DB.batch([
      env.DB.prepare(
        'UPDATE sponsorship_enquiries SET status=? WHERE id=?',
      ).bind(parsed.status, id),
      audit(env, actor, 'update', collection, id),
    ]);
  } else {
    throw new HTTPError(405, 'This collection is read-only.');
  }
  return Response.json({ ok: true, id: recordId });
}
function upsert(
  env: AppEnv,
  table: string,
  id: string,
  data: Record<string, string | number | boolean | null>,
) {
  const keys = Object.keys(data);
  return env.DB.prepare(
    `INSERT INTO ${table}(id,${keys.join(',')}) VALUES (?,${keys.map(() => '?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${keys.map((k) => `${k}=excluded.${k}`).join(',')},updated_at=CURRENT_TIMESTAMP`,
  ).bind(
    id,
    ...Object.values(data).map((v) => (typeof v === 'boolean' ? Number(v) : v)),
  );
}
