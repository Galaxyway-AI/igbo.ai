import { test, expect } from '@playwright/test';
test('homepage identity, navigation and no horizontal overflow', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Igbo AI.', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Explore the Project/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('responsive navigation reaches research', async ({ page, isMobile }) => {
  await page.goto('/');
  if (isMobile)
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Research', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Taking the language seriously',
  );
});
test('roadmap shows completed initial research while Phase 0 remains active', async ({
  page,
}) => {
  await page.goto('/roadmap');
  await expect(page.locator('#phase-0')).toContainText('In Progress');
  await expect(page.locator('#phase-0')).toContainText(
    'Initial Igbo AI technology landscape review',
  );
  await expect(page.locator('#phase-0')).toContainText('Completed');
  const phase = page.locator('#phase-2');
  await phase.locator('summary').click();
  await expect(
    phase.getByText('Publish a benchmark specification', { exact: false }),
  ).toBeVisible();
});
test('collaboration form preserves input when service unavailable', async ({
  page,
}) => {
  await page.goto('/collaborate');
  await page.getByLabel('Full name *').fill('Ada Example');
  await page.getByLabel('Email *', { exact: true }).fill('ada@example.org');
  await page.getByLabel('Collaboration type *').selectOption('Native speaker');
  await page
    .getByLabel('How would you like to contribute? *')
    .fill('I would like to help evaluate Igbo speech pronunciation.');
  await page.getByLabel('I understand the project may contact me').check();
  await page.getByLabel('I have read the Privacy Policy').check();
  await page.getByLabel('I confirm that I am 18 or over.').check();
  await page
    .getByRole('button', { name: 'Send expression of interest' })
    .click();
  await expect(page.getByRole('status')).toContainText(
    /unavailable|being prepared|security check/,
  );
  await expect(page.getByLabel('Full name *')).toHaveValue('Ada Example');
});
test('support page clearly holds checkout while payments are unavailable', async ({
  page,
}) => {
  await page.goto('/support');
  await expect(
    page.getByRole('heading', { name: 'Opening soon.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continue to secure checkout' }),
  ).toBeHidden();
  await expect(
    page.getByRole('link', { name: 'Email sponsorship@igbo.ai' }),
  ).toBeVisible();
});
test('technology navigation and individual technical content are available', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  if (isMobile)
    await page.getByRole('button', { name: 'Open navigation' }).click();
  const technology = page.locator('.technology-menu');
  await technology.getByText('Technology', { exact: true }).click();
  await technology.getByRole('link', { name: 'IgboPhonemizer' }).click();
  await expect(
    page.getByRole('heading', { name: 'IgboPhonemizer' }),
  ).toBeVisible();
  await expect(
    page.getByText('grapheme-to-phoneme', { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText('Diacritic restoration', { exact: true }),
  ).toBeVisible();
});
test('landscape explains provisional use and provides maintainable filters', async ({
  page,
}) => {
  await page.goto('/research/landscape');
  await expect(
    page.getByRole('heading', { name: 'Igbo AI Landscape' }),
  ).toBeVisible();
  await expect(page.getByText('not announced partners')).toBeVisible();
  await expect(page.getByLabel('Category')).toBeVisible();
});
test('admin and admin API fail closed', async ({ page, request }) => {
  if (process.env.TEST_ACCESS_DOMAIN) {
    for (const path of [
      '/admin',
      '/admin/',
      '/api/admin/collaborators',
      '/%61dmin/',
    ]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(302);
      const destination = new URL(response.headers().location);
      expect(destination.origin).toBe(
        `https://${process.env.TEST_ACCESS_DOMAIN}`,
      );
      expect(destination.pathname).toContain('/cdn-cgi/access/login/');
    }
    await page.goto('/admin/');
    await expect(
      page.getByRole('heading', {
        name: 'Log in to Igbo AI — Staging Administration',
      }),
    ).toBeVisible();
    return;
  }
  const r = await page.goto('/admin');
  expect(r?.status()).toBe(503);
  await expect(page.getByText('Administration is locked')).toBeVisible();
  expect((await request.get('/api/admin/collaborators')).status()).toBe(503);
});
test('Lab previews tabs without pretending to run AI', async ({ page }) => {
  await page.goto('/lab');
  await page.getByRole('button', { name: 'Explore Igbo tones' }).click();
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(
    'not been sent or stored',
  );
  await page.getByRole('tab', { name: 'Speech studio' }).click();
  await expect(
    page.getByRole('heading', { name: 'From text to voice.' }),
  ).toBeVisible();
});
