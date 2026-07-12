import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CONTENT_DIR = resolve(__dirname, '..', 'src', 'content');
const API_BASE = process.env.API_URL || 'http://localhost:8787/api';

async function walkDir(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walkDir(full));
    } else if (entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

function parsePath(filePath) {
  const rel = relative(CONTENT_DIR, filePath).replace(/\\/g, '/');
  const idx = rel.indexOf('/');
  const category = idx === -1 ? rel : rel.substring(0, idx);
  const slug = rel.replace(/\.html$/, '');
  return { category, slug: idx === -1 ? slug : slug.substring(idx + 1) };
}

async function main() {
  const files = await walkDir(CONTENT_DIR);
  console.log(`找到 ${files.length} 个 HTML 文件\n`);

  let count = 0;
  const errors = [];

  for (const file of files) {
    const { category, slug } = parsePath(file);
    const content = await readFile(file, 'utf-8');
    const path = `src/content/${category}/${slug}.html`;

    try {
      const res = await fetch(`${API_BASE}/create-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      });

      const data = await res.json();
      if (data.success) {
        console.log(`[${++count}/${files.length}] ✅ ${category}/${slug}`);
      } else {
        console.log(`[${++count}/${files.length}] ❌ ${category}/${slug}: ${data.error}`);
        errors.push({ file: `${category}/${slug}`, error: data.error });
      }
    } catch (err) {
      console.log(`[${++count}/${files.length}] ❌ ${category}/${slug}: ${err.message}`);
      errors.push({ file: `${category}/${slug}`, error: err.message });
    }
  }

  console.log(`\n迁移完成：${count - errors.length}/${files.length} 成功`);
  if (errors.length > 0) {
    console.log(`失败 ${errors.length} 篇：`);
    errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
  }
}

main().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});
