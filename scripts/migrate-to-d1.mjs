// scripts/migrate-to-d1.mjs
// 一次性：读取 src/content/**/*.html 和 .order.json，生成 D1 导入 SQL
// 用法：node scripts/migrate-to-d1.mjs
// 输出：migration.sql

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = resolve(__dirname, '..', 'src', 'content');

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.html') || entry.name === '.order.json') yield full;
  }
}

function extractTitle(content) {
  const m = content.match(/<h1[^>]*>(.+?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : 'Untitled';
}

function getParentSlug(slug) {
  const parts = slug.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : null;
}

async function main() {
  const statements = [];
  const now = Date.now();

  const orderMap = new Map();
  for await (const f of walk(CONTENT_DIR)) {
    if (f.endsWith('.order.json')) {
      const relPath = f.replace(CONTENT_DIR.replace(/\\/g, '/'), '').replace(/\\/g, '/');
      const dirSlug = relPath.replace(/^\//, '').replace('/.order.json', '');
      try {
        const raw = await readFile(f, 'utf-8');
        const order = JSON.parse(raw);
        if (Array.isArray(order)) orderMap.set(dirSlug, order);
      } catch {}
    }
  }

  let count = 0;
  for await (const f of walk(CONTENT_DIR)) {
    if (!f.endsWith('.html')) continue;

    const relPath = f.replace(CONTENT_DIR.replace(/\\/g, '/'), '').replace(/\\/g, '/');
    const slug = relPath.replace(/^\//, '').replace(/\.html$/, '');
    const parts = slug.split('/');
    const category = parts[0];
    const parentSlug = getParentSlug(slug);

    const content = await readFile(f, 'utf-8');
    const title = extractTitle(content);

    const leafName = slug.split('/').pop();
    const parentKey = parentSlug ?? category;
    const order = orderMap.get(parentKey) || [];
    const sortOrder = order.indexOf(leafName);

    const esc = (s) => s.replace(/'/g, "''");

    statements.push(
      `INSERT OR REPLACE INTO notes (slug, category, title, content, parent_slug, sort_order, updated_at) VALUES (` +
      `'${esc(slug)}', ` +
      `'${esc(category)}', ` +
      `'${esc(title)}', ` +
      `'${esc(content)}', ` +
      `${parentSlug ? `'${esc(parentSlug)}'` : 'NULL'}, ` +
      `${sortOrder >= 0 ? sortOrder : 0}, ` +
      `${now + count}` +
      `);`
    );
    count++;
  }

  statements.push(`INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '1');`);

  const sql = statements.join('\n');
  const outPath = resolve(__dirname, '..', 'migration.sql');
  await writeFile(outPath, sql, 'utf-8');

  console.log(`已生成 ${count} 条 INSERT 语句 → migration.sql`);
  console.log('下一步：cd workers && npx wrangler d1 execute pixel-notes-db --remote --file=../migration.sql');
}

main().catch(err => { console.error(err); process.exit(1); });
