// 为 7 个大文件单独生成 SQL 文件，手动执行
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CONTENT_DIR = resolve(ROOT, 'src', 'content');

const largeFiles = [
  'guitar/Comping/基本节奏.html',
  'guitar/Standards/the girl from ipanema.html',
  'synth/基础电子元件库/三极管Bipolar Junction Transistor.html',
  'synth/基础电子元件库/电阻.html',
  'synth/基础电子元件库/面包板与跳线.html',
  'synth/效果器/LPB-1.html',
  'synth/电路基础/电是什么？？.html',
];

function extractTitle(content) {
  const m = content.match(/<h1[^>]*>(.+?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : 'Untitled';
}

for (let i = 0; i < largeFiles.length; i++) {
  const filePath = resolve(CONTENT_DIR, largeFiles[i]);
  const raw = await readFile(filePath, 'utf-8');
  const title = extractTitle(raw);

  const relPath = largeFiles[i].replace(/\\/g, '/').replace(/\.html$/, '');
  const parts = relPath.split('/');
  const category = parts[0];
  const slug = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
  const parentSlug = parts.length > 2 ? parts.slice(1, -1).join('/') : null;

  const esc = s => s.replace(/'/g, "''");
  const sql = `INSERT OR REPLACE INTO notes (slug, category, title, content, parent_slug, sort_order, updated_at) VALUES ('${esc(slug)}', '${esc(category)}', '${esc(title)}', '${esc(raw)}', ${parentSlug ? `'${esc(parentSlug)}'` : 'NULL'}, 0, ${Date.now()});\n`;

  const outFile = resolve(ROOT, `_large_${i}.sql`);
  await writeFile(outFile, sql);
  console.log(`${i + 1}/7: _large_${i}.sql — ${slug} (${raw.length} 字节)`);
}

console.log('\n生成完成。逐个执行：');
console.log('cd workers');
for (let i = 0; i < largeFiles.length; i++) {
  console.log(`npx wrangler d1 execute pixel-notes-db --remote --yes --file=../_large_${i}.sql`);
}
