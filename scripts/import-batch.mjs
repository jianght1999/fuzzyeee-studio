// scripts/import-batch.mjs — 分批导入 migration.sql
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WORKERS = resolve(ROOT, 'workers');

const sql = await readFile(resolve(ROOT, 'migration.sql'), 'utf-8');
const stmts = sql.split(';\n').map(s => s.trim()).filter(Boolean);
const inserts = stmts.filter(s => s.startsWith('INSERT'));

console.log(`共 ${inserts.length} 条 INSERT，分 5 批执行...`);

const BATCH_SIZE = 20;
let ok = 0, fail = 0;

let fileCounter = 0;
async function runBatch(batchSql) {
  const num = ++fileCounter;
  return new Promise((resolve) => {
    const tmpFile = resolve(ROOT, `_b${num}.sql`);
    writeFile(tmpFile, batchSql).then(() => {
      const child = spawn('npx', [
        'wrangler', 'd1', 'execute', 'pixel-notes-db',
        '--remote', '--yes', `--file=../_b${num}.sql`
      ], { cwd: WORKERS, stdio: 'inherit' });

      child.on('close', async (code) => {
        await unlink(tmpFile).catch(() => {});
        resolve(code === 0);
      });
    });
  });
}

for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
  const batch = inserts.slice(i, i + BATCH_SIZE);
  const batchSql = batch.join(';\n') + ';';

  const success = await runBatch(batchSql);
  if (success) {
    ok += batch.length;
  } else {
    console.log(`  → 批次失败，尝试逐条重试...`);
    for (const stmt of batch) {
      const singleSuccess = await runBatch(stmt + ';');
      await new Promise(r => setTimeout(r, 500));
      if (singleSuccess) ok++; else fail++;
    }
  }
  console.log(`  进度: ${ok + fail}/${inserts.length} (${ok} 成功, ${fail} 失败)`);
}

console.log(`\n完成: ${ok} 成功, ${fail} 失败`);
