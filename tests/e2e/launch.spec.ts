import { test, expect } from '@playwright/test';
for (const path of ['/privacy/', '/terms/']) {
  test(`production legal content ${path}`, async ({ page, request }) => {
    await page.goto(path);
    await expect(page.locator('main')).toContainText('6 September 2026');
    await expect(page.locator('main')).toContainText('Galaxyway AI Ltd');
    await expect(page.locator('main')).not.toContainText('PRE-LAUNCH');
    await expect(page.locator('footer')).toContainText('15966090');
    await expect(page.locator('footer')).toContainText('ZC229446');
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
      'href',
      `https://igbo.ai${path}`,
    );
    expect((await request.get(path)).headers()['x-robots-tag']).toBe(
      'noindex, nofollow',
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
test('enquiry forms disclose age, privacy and no agreement', async ({
  page,
}) => {
  for (const path of ['/collaborate/', '/support/']) {
    await page.goto(path);
    await expect(
      page.getByLabel('I confirm that I am 18 or over.'),
    ).toHaveAttribute('required', '');
    await expect(page.locator('form[data-api-form]')).toContainText(
      'does not create',
    );
    await expect(
      page.locator('form[data-api-form] a[href="/privacy"]'),
    ).toBeVisible();
    await expect(page.locator('input[type=date]')).toHaveCount(0);
  }
  await expect(page.locator('#support-form')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Email sponsorship@igbo.ai ↗' }),
  ).toBeVisible();
});
