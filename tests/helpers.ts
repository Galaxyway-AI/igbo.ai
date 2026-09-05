import { readFile } from 'node:fs/promises';

export async function applyMigrations(db: D1Database, names: string[]) {
  for (const name of names) {
    const sql = await readFile(
      new URL(`../migrations/${name}`, import.meta.url),
      'utf8',
    );
    // Split outside SQL string literals; research prose contains semicolons.
    const statements = sql.split(/;(?=(?:[^']*'[^']*')*[^']*$)/);
    for (const statement of statements.filter((s) => s.trim()))
      await db.prepare(statement).run();
  }
}

export const articleFixture =
  '<!doctype html><html><head><title>Research update</title><meta name="description"><meta property="og:description"><meta property="og:title"><meta property="og:url"><meta property="og:type"><meta name="robots"><link rel="canonical"></head><body><span id="article-status"></span><h1 id="article-title"></h1><p id="article-summary"></p><p id="article-meta"></p><div id="article-body"></div><section id="article-references"></section></body></html>';
