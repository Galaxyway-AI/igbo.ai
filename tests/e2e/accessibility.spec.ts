import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for (const path of [
  '/',
  '/collaborate',
  '/support',
  '/roadmap',
  '/lab',
  '/research/landscape',
  '/technology/igbophonemizer',
]) {
  test(`accessibility ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  });
}
