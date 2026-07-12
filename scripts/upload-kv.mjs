// 上传 7 个大文件到 KV，同时插入 D1 元数据
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WORKERS = resolve(ROOT, 'workers');
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

function getParentSlug(slug) {
  const parts = slug.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : null;
}

const esc = s => s.replace(/'/g, "''");

for (const filePath of largeFiles) {
  const fullPath = resolve(CONTENT_DIR, filePath);
  const content = await readFile(fullPath, 'utf-8');

  const relPath = filePath.replace(/\\/g, '/').replace(/\.html$/, '');
  const parts = relPath.split('/');
  const category = parts[0];
  const slug = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
  const parentSlug = getParentSlug(slug);
  const title = extractTitle(content);
  const kvKey = `content/${category}/${slug}`;

  // 1. 上传内容到 KV
  const tmpFile = resolve(ROOT, '_kv_tmp.txt');
  await writeFile(tmpFile, content);

  try {
    execSync(`npx wrangler kv key put --binding=NOTES_CONTENT "${kvKey}" --path="${tmpFile}"`, {
      cwd: WORKERS, stdio: 'pipe', timeout: 30000,
    });
    console.log(`KV OK: ${kvKey} (${content.length} 字节)`);
  } catch (e) {
    console.error(`KV FAIL: ${kvKey} - ${String(e.stderr || e.message).substring(0, 80)}`);
  }
  await unlink(tmpFile);

  // 2. 插入 D1 元数据（content 留空）
  const insertSql = `INSERT OR REPLACE INTO notes (slug, category, title, content, parent_slug, sort_order, updated_at) VALUES ('${esc(slug)}', '${esc(category)}', '${esc(title)}', '', ${parentSlug ? `'${esc(parentSlug)}'` : 'NULL'}, 0, ${Date.now()});`;
  const sqlFile = resolve(ROOT, '_kv_d1.sql');
  await writeFile(sqlFile, insertSql);

  try {
    execSync(`npx wrangler d1 execute pixel-notes-db --remote --yes --file="${sqlFile}"`, {
      cwd: WORKERS, stdio: 'pipe', timeout: 30000,
    });
    console.log(`  D1 OK: ${slug}`);
  } catch (e) {
    console.error(`  D1 FAIL: ${slug} - ${String(e.stderr || e.message).substring(0, 80)}`);
  }
  await unlink(sqlFile);
}

console.log('\n完成！验证:');
console.log('npx wrangler d1 execute pixel-notes-db --remote --yes --command="SELECT count(*) FROM notes"');
