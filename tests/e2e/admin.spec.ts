import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Isolated browser fixture: production authentication remains enforced by Worker tests.
test('Research Desk metrics, navigation and referenced draft workflow', async ({
  page,
}, testInfo) => {
  const html = await readFile('dist/admin/index.html', 'utf8');
  const writes: unknown[] = [];
  await page.route('**/admin/', (route) =>
    route.fulfill({ contentType: 'text/html', body: html }),
  );
  await page.route('**/api/admin/**', async (route) => {
    const collection = new URL(route.request().url()).pathname.split('/')[3];
    if (route.request().method() !== 'GET') {
      writes.push(route.request().postDataJSON());
      return route.fulfill({ json: { ok: true, id: 'draft-test' } });
    }
    const fixtures: Record<string, unknown> = {
      identity: { email: 'admin@igbo.ai', environment: 'staging' },
      dashboard: {
        metrics: {
          updates: { total: 1, pending: 0 },
          collaborators: { total: 0, pending: 0 },
        },
        phase: { title: 'Research & landscape mapping', status: 'In Progress' },
        next: { title: 'Invite collaborators' },
        activity: [],
      },
      updates: [],
      resources: [{ id: 'waxal', title: 'Google WAXAL', status: 'Published' }],
      settings: [
        { key: 'forms_enabled', value: 'false' },
        { key: 'payments_enabled', value: 'false' },
        { key: 'consent_version', value: 'prelaunch-v1' },
      ],
    };
    return route.fulfill({ json: fixtures[collection] || [] });
  });
  await page.goto('/admin/');
  await expect(page.locator('#admin-identity')).toHaveText('admin@igbo.ai');
  await expect(page.locator('.metric-card').first()).toContainText(
    'Published updates',
  );
  await expect(page.getByRole('searchbox')).toBeHidden();
  await page.screenshot({
    path: testInfo.outputPath('admin-overview.png'),
    fullPage: true,
  });
  if (
    !(await page.locator('.admin-sidebar').getAttribute('open')) &&
    !(await page
      .getByRole('button', { name: 'Site settings', exact: true })
      .isVisible())
  )
    await page.locator('.admin-sidebar summary').click();
  await page
    .getByRole('button', { name: 'Site settings', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Save settings' }),
  ).toBeVisible();
  await expect(page.getByRole('searchbox')).toBeHidden();
  await page.locator('#admin-create summary').click();
  await page
    .getByRole('button', { name: 'New Research update', exact: true })
    .click();
  await expect(page.locator('[data-admin-section="updates"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByLabel('Google WAXAL (Published)').check();
  await page.getByLabel('title', { exact: true }).fill('Browser draft');
  await page.getByLabel('slug', { exact: true }).fill('browser-draft');
  await page
    .getByLabel('summary', { exact: true })
    .fill('A draft used only in the isolated browser fixture.');
  await page.getByLabel('content', { exact: true }).fill('Draft body');
  await page.getByRole('button', { name: 'Create record' }).click();
  await expect(page.getByText('Saved. Public content reflects')).toBeVisible();
  expect(writes).toContainEqual(
    expect.objectContaining({ status: 'Draft', resource_ids: ['waxal'] }),
  );
  await expect(
    page.getByRole('link', { name: 'Preview saved version' }),
  ).toHaveAttribute('href', '/api/admin/updates/draft-test/preview');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
