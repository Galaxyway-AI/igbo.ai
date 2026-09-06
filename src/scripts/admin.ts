export {};
document.documentElement.classList.add('admin-document');
type RecordData = Record<string, unknown>;
const root = document.querySelector<HTMLElement>('#admin-records')!;
const status = document.querySelector<HTMLElement>('#admin-status')!;
let section = 'dashboard';
let records: RecordData[] = [];
const create = document.querySelector<HTMLDetailsElement>('#admin-create')!;
const sidebar = document.querySelector<HTMLDetailsElement>('.admin-sidebar')!;
const compactNavigation = window.matchMedia('(max-width: 760px)');
sidebar.open = !compactNavigation.matches;
compactNavigation.addEventListener('change', () => {
  sidebar.open = !compactNavigation.matches;
});
const statuses = [
  'In Progress',
  'Completed',
  'Planned',
  'Research',
  'Active Development',
  'Evaluation',
  'Released',
  'On Hold',
];
const schemas: Record<string, Record<string, string | string[]>> = {
  collaborators: {
    status: [
      'New',
      'Reviewing',
      'Contacted',
      'Potential Collaborator',
      'Active Collaborator',
      'Partner',
      'Declined',
      'Archived',
    ],
    tags: 'text',
    note: 'textarea',
  },
  sponsorship: { status: ['New', 'Reviewing', 'Contacted', 'Archived'] },
  supporters: { status: ['Pending', 'Approved', 'Hidden'] },
  roadmap: {
    title: 'text',
    description: 'textarea',
    status: statuses,
    sort_order: 'number',
    start_date: 'date',
    target_date: 'date',
    related_url: 'url',
    milestones: 'milestones',
  },
  updates: {
    title: 'text',
    slug: 'text',
    summary: 'textarea',
    content: 'textarea',
    author_organisation: 'text',
    related_url: 'url',
    seo_description: 'text',
    resource_ids: 'references',
    status: ['Draft', 'Published'],
  },
  resources: {
    organisation: 'text',
    licence_url: 'url',
    access_status: 'text',
    potential_role: [
      'Investigate',
      'Reuse',
      'Benchmark',
      'Potential collaboration',
      'Build ourselves',
      'Do not use without permission',
    ],
    notes: 'textarea',
    last_reviewed_at: 'date',
    verified: 'checkbox',
    title: 'text',
    summary: 'textarea',
    url: 'url',
    category: 'text',
    licence: 'text',
    doi: 'text',
    status: ['Draft', 'Published'],
  },
  campaigns: {
    title: 'text',
    summary: 'textarea',
    target_minor: 'number',
    verified_total_minor: 'number',
    currency: ['GBP'],
    status: ['Draft', 'Published'],
  },
  organisations: {
    title: 'text',
    summary: 'textarea',
    url: 'url',
    logo_url: 'url',
    relationship_confirmed: 'checkbox',
    status: ['Draft', 'Published'],
  },
  projects: {
    status: ['Planned', 'Research', 'In Development', 'Testing', 'Released'],
  },
  feedback: { status: ['New', 'Reviewed', 'Archived'] },
};
async function api(path: string, method = 'GET', body?: unknown) {
  const r = await fetch('/api/admin/' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.headers.get('Content-Type')?.includes('application/json'))
    throw Error(
      'Your administrator session may have expired. Reload this page to sign in again.',
    );
  const data = await r.json();
  if (!r.ok) throw Error(data.error || 'The request could not be completed.');
  return data;
}
function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
}
function field(
  form: HTMLFormElement,
  key: string,
  type: string | string[],
  value: unknown,
) {
  if (type === 'references') {
    form.dataset.referencesReady = 'false';
    const group = el('fieldset');
    group.append(
      el('legend', 'Research references'),
      el(
        'small',
        'Select maintained resources to cite. Only published resources appear in public articles.',
      ),
    );
    const loading = el('p', 'Loading references…');
    group.append(loading);
    form.append(group);
    void api('resources')
      .then((resources: RecordData[]) => {
        loading.remove();
        if (!resources.length)
          group.append(
            el('p', 'Add a research resource first to link references.'),
          );
        resources.forEach((resource) => {
          const label = el('label');
          const input = el('input');
          input.type = 'checkbox';
          input.name = key;
          input.value = String(resource.id);
          input.checked = Array.isArray(value) && value.includes(resource.id);
          label.append(
            input,
            document.createTextNode(` ${resource.title} (${resource.status})`),
          );
          group.append(label);
        });
        form.dataset.referencesReady = 'true';
      })
      .catch(() => {
        loading.textContent =
          'References could not be loaded. Reload before saving to preserve existing links.';
        form
          .querySelector<HTMLButtonElement>('button[type=submit]')
          ?.setAttribute('disabled', '');
      });
    return;
  }
  const label = el('label', key.replaceAll('_', ' '));
  let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  if (Array.isArray(type)) {
    input = el('select');
    type.forEach((option) => {
      const opt = el('option', option);
      opt.value = option;
      input.append(opt);
    });
  } else if (type === 'textarea' || type === 'milestones') {
    input = el('textarea');
  } else {
    input = el('input');
    input.type = type;
  }
  input.name = key;
  if (type === 'checkbox' && input instanceof HTMLInputElement)
    input.checked = Boolean(value);
  else if (type === 'milestones')
    input.value = Array.isArray(value)
      ? value.map((m) => `${m.title} | ${m.status}`).join('\n')
      : '';
  else input.value = value == null ? '' : String(value);
  if (Array.isArray(type) && !value) input.value = type[0];
  label.append(input);
  if (type === 'milestones')
    label.append(
      el(
        'small',
        'One milestone per line: Title | Planned (or another roadmap status).',
      ),
    );
  form.append(label);
}
function editor(record: RecordData) {
  const collection = section;
  const form = el('form');
  form.className = 'admin-record';
  let existing = Boolean(
    record.id || (collection === 'projects' && record.slug),
  );
  const title = el(
    'h3',
    String(
      record.title ||
        record.name ||
        record.public_display_name ||
        record.slug ||
        'New record',
    ),
  );
  form.append(title);
  if (collection === 'resources' && record.id)
    form.append(el('p', `Resource ID: ${record.id}`));
  if (collection === 'updates' && existing) {
    const preview = el('a', 'Preview saved version →');
    preview.href = `/api/admin/updates/${encodeURIComponent(String(record.id))}/preview`;
    preview.target = '_blank';
    preview.rel = 'noopener noreferrer';
    form.append(
      preview,
      el(
        'p',
        `Published: ${record.published_at || 'Not published'} · Updated: ${record.updated_at || 'Not saved'}`,
      ),
    );
  }
  if (
    section === 'collaborators' ||
    section === 'sponsorship' ||
    section === 'supporters' ||
    section === 'feedback'
  ) {
    for (const [key, value] of Object.entries(record)) {
      if (!['id', 'status', 'tags'].includes(key))
        form.append(
          el(
            'p',
            `${key.replaceAll('_', ' ')}: ${['public_consent', 'anonymous', 'display_amount', 'display_level', 'display_organisation'].includes(key) ? (value ? 'YES' : 'NO') : String(value ?? '')}`,
          ),
        );
    }
  }
  for (const [key, type] of Object.entries(schemas[section] || {}))
    field(form, key, type, record[key]);
  const save = el('button', existing ? 'Save changes' : 'Create record');
  save.type = 'submit';
  save.className = 'button';
  form.append(save);
  const feedback = el('p');
  feedback.setAttribute('role', 'status');
  form.append(feedback);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.referencesReady === 'false') {
      feedback.textContent =
        'Please wait for research references to load before saving.';
      return;
    }
    const selectedStatus =
      form.querySelector<HTMLSelectElement>('[name=status]')?.value;
    if (
      (selectedStatus === 'Archived' ||
        (record.status === 'Published' && selectedStatus === 'Draft')) &&
      !window.confirm(
        'Remove this record from public use or archive it? The record will be retained.',
      )
    )
      return;
    save.disabled = true;
    feedback.textContent = 'Saving…';
    const values: RecordData = Object.fromEntries(new FormData(form));
    for (const [key, type] of Object.entries(schemas[collection])) {
      if (type === 'references')
        values[key] = new FormData(form).getAll(key).map(String);
      if (type === 'checkbox')
        values[key] = form.querySelector<HTMLInputElement>(
          `[name=${key}]`,
        )!.checked;
      if (type === 'number')
        values[key] = values[key] === '' ? null : Number(values[key]);
      if (type === 'date') values[key] = values[key] || null;
      if (type === 'milestones')
        values[key] = String(values[key])
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [title, status = 'Planned'] = line.split('|');
            return { title: title.trim(), status: status.trim() };
          });
    }
    try {
      const result = await api(
        collection +
          (existing
            ? '/' + encodeURIComponent(String(record.id || record.slug))
            : ''),
        existing ? 'PATCH' : 'POST',
        values,
      );
      record.id = result.id;
      record.status = values.status;
      existing = true;
      if (collection === 'updates') {
        const link =
          form.querySelector<HTMLAnchorElement>('a') ||
          el('a', 'Preview saved version →');
        link.href = `/api/admin/updates/${encodeURIComponent(String(result.id))}/preview`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        if (!link.parentNode) form.append(link);
      }
      feedback.textContent =
        'Saved. Public content reflects published and approved records.';
    } catch (error) {
      feedback.textContent =
        error instanceof Error ? error.message : 'Unable to save.';
    } finally {
      save.disabled = false;
    }
  });
  if (section === 'collaborators' && existing) {
    const notes = el('button', 'Read internal notes');
    notes.type = 'button';
    notes.className = 'button outline';
    notes.addEventListener('click', async () => {
      try {
        const data = await api('collaborators/' + record.id);
        const list = el('div');
        for (const note of data.notes)
          list.append(
            el('p', `${note.created_at} · ${note.admin_email}\n${note.body}`),
          );
        if (!data.notes.length) list.append(el('p', 'No internal notes yet.'));
        notes.replaceWith(list);
      } catch {
        feedback.textContent = 'Notes could not be loaded.';
      }
    });
    form.append(notes);
  }
  return form;
}
function render() {
  root.replaceChildren();
  const query = document
    .querySelector<HTMLInputElement>('#admin-search')!
    .value.toLowerCase();
  const filtered = records.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(query),
  );
  for (const record of filtered) {
    if (schemas[section]) root.append(editor(record));
    else {
      const div = el('article');
      div.className = 'admin-record';
      for (const [key, value] of Object.entries(record))
        div.append(el('p', `${key}: ${String(value)}`));
      root.append(div);
    }
  }
  if (!filtered.length)
    root.append(
      el(
        'p',
        query
          ? 'No records match your search.'
          : {
              collaborators: 'No collaborator applications yet.',
              supporters: 'No supporters are currently awaiting approval.',
              campaigns: 'No funding campaigns have been created.',
              feedback: 'No Lab feedback has been submitted.',
              sponsorship: 'No sponsorship enquiries yet.',
              email: 'No emails are waiting for delivery.',
              audit: 'No administration activity has been recorded.',
              updates: 'No research updates yet. Create a draft to begin.',
              resources:
                'No research resources yet. Add a source to the landscape.',
            }[section] || 'No records in this section yet.',
      ),
    );
}
async function load(name: string) {
  section = name;
  status.textContent = 'Loading…';
  root.replaceChildren();
  document.querySelector<HTMLInputElement>('#admin-search')!.hidden = [
    'dashboard',
    'settings',
  ].includes(name);
  try {
    const data = await api(name);
    if (section !== name) return;
    if (name === 'dashboard') {
      renderDashboard(data);
      status.textContent = '';
      return;
    }
    if (name === 'settings') {
      renderSettings(data);
      status.textContent = '';
      return;
    }
    records = Array.isArray(data)
      ? data.map((r) => ({ ...r }))
      : Object.entries(data).map(([title, value]) => ({ title, count: value }));
    render();
    status.textContent =
      records.length >= 500 ? 'Showing the first 500 records.' : '';
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : 'Unable to load records.';
  }
}
function renderSettings(rows: { key: string; value: string }[]) {
  const data = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const form = el('form');
  form.className = 'admin-record';
  form.append(
    el(
      'p',
      'Enable collection only after approving the privacy notice, receiving entity details and retention schedule. Payment activation also requires provider terms and refund information.',
    ),
  );
  field(form, 'forms_enabled', 'checkbox', data.forms_enabled === 'true');
  field(form, 'payments_enabled', 'checkbox', data.payments_enabled === 'true');
  field(form, 'consent_version', 'text', data.consent_version);
  const save = el('button', 'Save settings');
  save.className = 'button';
  form.append(save);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    save.disabled = true;
    try {
      await api('settings', 'PATCH', {
        forms_enabled: form.querySelector<HTMLInputElement>(
          '[name=forms_enabled]',
        )!.checked,
        payments_enabled: form.querySelector<HTMLInputElement>(
          '[name=payments_enabled]',
        )!.checked,
        consent_version: form.querySelector<HTMLInputElement>(
          '[name=consent_version]',
        )!.value,
      });
      status.textContent = 'Settings saved.';
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : 'Unable to save.';
    } finally {
      save.disabled = false;
    }
  });
  root.append(form);
}
function renderDashboard(data: {
  metrics: Record<string, { total: number | null; pending?: number | null }>;
  phase: RecordData | null;
  next: RecordData | null;
  activity: RecordData[];
}) {
  const grid = el('div');
  grid.className = 'admin-metrics';
  const labels: Record<string, [string, string, string]> = {
    collaborators: ['Collaborators', 'Total applications', 'awaiting review'],
    sponsorship: [
      'Sponsorship enquiries',
      'Total enquiries',
      'awaiting response',
    ],
    supporters: ['Supporters', 'Approved supporters', 'awaiting approval'],
    updates: ['Research updates', 'Published updates', 'drafts'],
    organisations: ['Organisations', 'Confirmed relationships', ''],
    feedback: ['Lab feedback', 'New feedback', ''],
    campaigns: ['Funding campaigns', 'Published campaigns', 'drafts'],
  };
  for (const [key, metric] of Object.entries(data.metrics)) {
    const card = el('article');
    card.className = 'metric-card';
    const [title, caption, pending] = labels[key];
    const number = el('strong', String(metric.total || 0));
    number.className = 'metric-value';
    card.append(el('h3', title), number, el('p', caption));
    if (pending) card.append(el('small', `${metric.pending || 0} ${pending}`));
    const link = el('button', 'View section →');
    link.type = 'button';
    link.addEventListener('click', () => selectSection(key));
    card.append(link);
    grid.append(card);
    const badge = document.querySelector(`[data-count="${key}"]`);
    if (badge) badge.textContent = metric.pending ? ` ${metric.pending}` : '';
  }
  const phase = el('article');
  phase.className = 'metric-card';
  phase.append(
    el('h3', 'Roadmap'),
    el('p', String(data.phase?.title || 'No active phase')),
    el('span', String(data.phase?.status || '')),
    el('p', `Next milestone: ${data.next?.title || 'To be confirmed'}`),
  );
  grid.append(phase);
  root.append(grid, el('h3', 'Recent activity'));
  const activity = el('ol');
  activity.className = 'activity-list';
  data.activity.forEach((item) => {
    const li = el('li');
    li.append(
      el(
        'strong',
        `${item.action} · ${String(item.entity_type).replaceAll('_', ' ')}`,
      ),
      el('p', `Record ${item.entity_id}`),
      el('small', `${item.created_at} · ${item.actor}`),
    );
    activity.append(li);
  });
  root.append(
    data.activity.length
      ? activity
      : el(
          'p',
          'No recent administration activity. New actions will appear here.',
        ),
  );
}
function selectSection(name: string) {
  const button = document.querySelector<HTMLButtonElement>(
    `[data-admin-section="${name}"]`,
  );
  button?.click();
}
document
  .querySelectorAll<HTMLButtonElement>('[data-admin-section]')
  .forEach((button) =>
    button.addEventListener('click', () => {
      document
        .querySelectorAll('[data-admin-section]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      document.querySelector('#admin-title')!.textContent = button.textContent;
      document.querySelector<HTMLInputElement>('#admin-search')!.value = '';
      void load(button.dataset.adminSection!);
      if (compactNavigation.matches) sidebar.open = false;
    }),
  );
document.querySelector('#admin-search')?.addEventListener('input', () => {
  if (section !== 'settings') render();
});
document
  .querySelectorAll<HTMLButtonElement>('[data-create]')
  .forEach((button) =>
    button.addEventListener('click', async () => {
      const name = button.dataset.create!;
      create.open = false;
      document
        .querySelectorAll<HTMLButtonElement>('[data-admin-section]')
        .forEach((b) =>
          b.setAttribute(
            'aria-pressed',
            String(b.dataset.adminSection === name),
          ),
        );
      document.querySelector('#admin-title')!.textContent = button.textContent;
      await load(name);
      const form = editor({});
      root.prepend(form);
      const firstField = form.querySelector<HTMLInputElement>('input,textarea');
      firstField?.focus({ preventScroll: true });
      firstField?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }),
  );
create.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    create.open = false;
    create.querySelector('summary')?.focus();
  }
});
api('identity')
  .then((identity) => {
    document.querySelector('#admin-identity')!.textContent = identity.email;
    document.querySelector('#admin-environment')!.textContent =
      identity.environment.toUpperCase();
    document.querySelector('#admin-lock')?.setAttribute('hidden', '');
    document.querySelector('#admin-workspace')?.removeAttribute('hidden');
    void load('dashboard');
  })
  .catch((error) => {
    document.querySelector('#admin-lock')!.textContent =
      error instanceof Error
        ? error.message
        : 'Administrator access is required.';
  });
