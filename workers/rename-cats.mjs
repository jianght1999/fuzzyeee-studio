import { readFileSync } from 'node:fs';
import { connect } from '@tidbcloud/serverless';

// 从 .dev.vars 读取凭据
const vars = readFileSync('.dev.vars', 'utf-8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if (k) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});

const url = vars.DB_URL;
if (!url) { console.error('DB_URL not found in .dev.vars'); process.exit(1); }

const conn = connect({ url });
await conn.execute('UPDATE notes SET category = ? WHERE category = ?', ['jazz', 'guitar']);
console.log('guitar → jazz');
await conn.execute('UPDATE notes SET category = ? WHERE category = ?', ['crafts', 'synth']);
console.log('synth → crafts');
await conn.execute('UPDATE notes SET category = ? WHERE category = ?', ['writing', 'reading']);
console.log('reading → writing');

const r = await conn.execute('SELECT category, count(*) c FROM notes GROUP BY category');
console.log(JSON.stringify(r, null, 2));
