export {};
type RecordData = Record<string, unknown>;
const root = document.querySelector<HTMLElement>('#admin-records')!;
const status = document.querySelector<HTMLElement>('#admin-status')!;
let section = 'dashboard';
let records: RecordData[] = [];
const create = document.querySelector<HTMLButtonElement>('#admin-create')!;
const statuses = [
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
    status: ['Draft', 'Published'],
  },
  resources: {
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
};
async function api(path: string, method = 'GET', body?: unknown) {
  const r = await fetch('/api/admin/' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
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
  const form = el('form');
  form.className = 'admin-record';
  const existing = Boolean(record.id || record.slug);
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
  if (
    section === 'collaborators' ||
    section === 'sponsorship' ||
    section === 'supporters'
  ) {
    for (const [key, value] of Object.entries(record)) {
      if (!['id', 'status', 'tags'].includes(key))
        form.append(
          el('p', `${key.replaceAll('_', ' ')}: ${String(value ?? '')}`),
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
    save.disabled = true;
    feedback.textContent = 'Saving…';
    const values: RecordData = Object.fromEntries(new FormData(form));
    for (const [key, type] of Object.entries(schemas[section])) {
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
      await api(
        section +
          (existing
            ? '/' + encodeURIComponent(String(record.id || record.slug))
            : ''),
        existing ? 'PATCH' : 'POST',
        values,
      );
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
      el('p', 'No matching records. No placeholder data has been added.'),
    );
}
async function load(name: string) {
  section = name;
  status.textContent = 'Loading…';
  root.replaceChildren();
  create.hidden = ![
    'roadmap',
    'updates',
    'resources',
    'campaigns',
    'organisations',
  ].includes(name);
  try {
    const data = await api(name);
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
    }),
  );
document.querySelector('#admin-search')?.addEventListener('input', () => {
  if (section !== 'settings') render();
});
create.addEventListener('click', () => {
  const form = editor({});
  root.prepend(form);
  form.querySelector('input')?.focus();
});
api('dashboard')
  .then(() => {
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
