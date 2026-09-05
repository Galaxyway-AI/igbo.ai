import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome' });
await mkdir('docs/screenshots', { recursive: true });
for (const [name, width, height] of [
  ['desktop', 1440, 1000],
  ['mobile', 390, 844],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('http://localhost:8787');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `docs/screenshots/home-${name}.png`,
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      name,
      errors,
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    }),
  );
  await page.close();
}
await browser.close();
