// scripts/import-direct.mjs — 逐条通过 wrangler --command 直接导入
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WORKERS = resolve(ROOT, 'workers');

const sql = await readFile(resolve(ROOT, 'migration.sql'), 'utf-8');
const stmts = sql.split(';\n').map(s => s.trim()).filter(Boolean);
const inserts = stmts.filter(s => s.startsWith('INSERT') && s.includes('notes'));

console.log(`共 ${inserts.length} 条，逐条导入...`);

let ok = 0, fail = 0;
for (let i = 0; i < inserts.length; i++) {
  const stmt = inserts[i] + ';';

  try {
    const result = execSync(
      `npx wrangler d1 execute pixel-notes-db --remote --yes --command="${stmt.replace(/"/g, '\\"')}"`,
      { cwd: WORKERS, stdio: 'pipe', timeout: 30000, maxBuffer: 50 * 1024 * 1024 }
    );
    ok++;
  } catch (e) {
    fail++;
    const short = stmt.substring(0, 50);
    if (fail <= 3) console.error(`  失败: ${short}...`);
  }

  if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${inserts.length} (${ok} 成功, ${fail} 失败)`);
}

console.log(`\n完成: ${ok} 成功, ${fail} 失败`);
