// scripts/import-v2.mjs — 分批导入，用绝对路径 --file
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const sql = await readFile(resolve(ROOT, 'migration.sql'), 'utf-8');
const stmts = sql.split(';\n').map(s => s.trim()).filter(Boolean);
const inserts = stmts.filter(s => s.startsWith('INSERT') && s.includes('notes'));

console.log(`共 ${inserts.length} 条 INSERT，逐条导入...`);

let ok = 0, fail = 0;
const failedSlugs = [];

for (let i = 0; i < inserts.length; i++) {
  const tmpAbs = resolve(ROOT, `_import_${i}.sql`);
  await writeFile(tmpAbs, inserts[i] + ';');

  try {
    execSync(`npx wrangler d1 execute pixel-notes-db --remote --yes --file="${tmpAbs}"`, {
      stdio: 'pipe',
      timeout: 60000,
      maxBuffer: 1024 * 1024,
    });
    ok++;
  } catch (e) {
    fail++;
    // 提取 slug 用于诊断
    const m = inserts[i].match(/VALUES \('([^']+)'/);
    if (m) failedSlugs.push(m[1]);
    if (fail <= 3) console.error(`  失败 [${i}]: ${inserts[i].substring(0, 60)}...`);
  }
  await unlink(tmpAbs);

  if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${inserts.length} (${ok} 成功, ${fail} 失败)`);
}

console.log(`\n完成: ${ok} 成功, ${fail} 失败`);
if (failedSlugs.length > 0) console.log(`失败条目: ${failedSlugs.join(', ')}`);
