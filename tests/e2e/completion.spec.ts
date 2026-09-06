import { test, expect } from '@playwright/test';

const components = [
  [
    'igbopronounce',
    'A proposed pronunciation record',
    [
      'Canonical spelling',
      'Meaning / context',
      'Verified native audio',
      'Verification status',
    ],
  ],
  [
    'igbotone',
    'Tone restoration across the speech pipeline',
    [
      'Lexical disambiguation',
      'Diacritic restoration',
      'Speech / NLP consumer',
    ],
  ],
  [
    'igbophonemizer',
    'Why an explicit pronunciation layer?',
    ['Normalisation', 'Dialect rules', 'Phonemes / IPA', 'igbo-phonemizer'],
  ],
  [
    'igbospeech',
    'Future speech research topics',
    [
      'Text-to-speech (TTS)',
      'Automatic speech recognition (ASR)',
      'Multi-speaker voices',
      'Prosody',
    ],
  ],
  [
    'igbospeechbench',
    'Proposed benchmark dimensions',
    [
      'Dialect authenticity',
      'Personal names',
      'Place names',
      'Native-speaker preference',
    ],
  ],
  [
    'igbolm',
    'Possible later-stage capabilities',
    [
      'later-stage',
      'not training a large LLM',
      'Cultural context',
      'Conversation',
    ],
  ],
] as const;

for (const [slug, heading, details] of components) {
  test(`complete technical explanation: ${slug}`, async ({ page }) => {
    await page.goto(`/technology/${slug}/`);
    await expect(
      page.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible();
    for (const text of details)
      await expect(page.locator('main')).toContainText(text);
    for (const label of [
      'WHAT IS IT?',
      'WHY DO WE NEED IT?',
      'WHAT GOES IN?',
      'PROCESSING / PROPOSED ARCHITECTURE',
      'WHAT COMES OUT?',
      'RESEARCH QUESTIONS',
      'DEPENDENCIES',
      'WHAT DOES SUCCESS LOOK LIKE?',
      'PLANNED OPEN-SOURCE OUTPUTS',
    ])
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    await expect(page.locator('[data-tech-status]')).toContainText(
      /Planned|Research|In Development|Testing|Released/,
    );
    await expect(
      page.getByText('Quality must be demonstrated.', { exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (slug === 'igbospeechbench') {
      for (const name of [
        'Voice A ▶',
        'Voice B ▶',
        'A',
        'B',
        'About the same',
        'Neither',
      ])
        await expect(
          page.getByRole('button', { name, exact: true }),
        ).toBeDisabled();
    }
  });
}

test('roadmap and homepage reflect the same maintained Phase 0 progress', async ({
  page,
  request,
}) => {
  const phases = await (await request.get('/api/public/roadmap')).json();
  const phase = phases.find((p: { id: string }) => p.id === 'phase-0');
  expect(phase.status).toBe('In Progress');
  expect(phase.milestones).toHaveLength(8);
  expect(
    phase.milestones.filter(
      (m: { status: string }) => m.status === 'Completed',
    ),
  ).toHaveLength(4);
  await page.goto('/roadmap/');
  const first = page.locator('#phase-0');
  for (const milestone of phase.milestones)
    await expect(first).toContainText(
      `${milestone.title} — ${milestone.status}`,
    );
  await expect(first).not.toContainText('Review existing datasets and models');
  await page.goto('/');
  await expect(page.locator('#homepage-roadmap a').first()).toContainText(
    phase.status,
  );
  await expect(
    page.getByText('INITIAL LANDSCAPE REVIEW COMPLETE', { exact: true }),
  ).toBeVisible();
});

test('ibo-dict is a distinct maintained and filterable resource', async ({
  page,
}) => {
  await page.goto('/research/landscape/');
  await expect(page.locator('#landscape-rows tr')).toHaveCount(13);
  await expect(
    page.getByRole('link', { name: 'Nkọwa okwu — ibo-dict ↗', exact: true }),
  ).toHaveAttribute(
    'href',
    'https://huggingface.co/datasets/nkowaokwu/ibo-dict',
  );
  await expect(
    page.getByRole('link', { name: 'Nkọwa okwu / IgboAPI ↗', exact: true }),
  ).toBeVisible();
  await page
    .locator('#landscape-category')
    .selectOption('Dataset / Pronunciation');
  const visibleRows = page.locator('#landscape-rows tr:visible');
  await expect(visibleRows).toHaveCount(1);
  await expect(visibleRows).toContainText('25,500');
  await expect(visibleRows).toContainText('25,000');
  await visibleRows.getByText('Assessment notes', { exact: true }).click();
  await expect(visibleRows).toContainText('sharing contact information');
});

test('support availability and dataset governance are visible', async ({
  page,
}) => {
  await page.goto('/support/');
  await expect(page.locator('#support-opening')).toContainText(
    'No payments are currently being collected through this website.',
  );
  await expect(page.locator('#support-form')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '£25', exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole('link', {
      name: 'Email sponsorship@igbo.ai ↗',
      exact: true,
    }),
  ).toHaveAttribute('href', 'mailto:sponsorship@igbo.ai');
  await page.goto('/ethics/');
  await expect(
    page.getByRole('heading', { name: 'Dataset governance', exact: true }),
  ).toBeVisible();
  for (const term of [
    'dataset version',
    'access conditions',
    'training permissions',
    'redistribution permissions',
    'commercial-use permissions',
    'contributor consent information',
    'review date',
    'modification history',
  ])
    await expect(page.locator('main')).toContainText(term);
});

test('deployed public HTML is noindex and canonical to production', async ({
  request,
}) => {
  for (const path of [
    '/',
    '/roadmap/',
    '/technology/igbopronounce/',
    '/support/',
    '/ethics/',
    '/research/landscape/',
    '/updates/igbo-ai-landscape-review-v0-1',
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
    expect(await response.text()).toContain('https://igbo.ai');
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const support = await (await request.get('/support/')).text();
  expect(support).not.toContain('id="support-form"');
  expect(support).not.toContain('Continue to secure checkout');
  const article = await (
    await request.get('/updates/igbo-ai-landscape-review-v0-1')
  ).text();
  expect(article).toContain(
    'https://huggingface.co/datasets/nkowaokwu/ibo-dict',
  );
  expect(sitemap).not.toContain('/admin');
  expect(sitemap).not.toContain('article-template');
  expect(sitemap).not.toContain('workers.dev');
});
