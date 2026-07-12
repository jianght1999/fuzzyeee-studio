// 通过 API 上传 7 个大文件到 KV（Pages Function 自己写自己的 KV）
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CONTENT_DIR = resolve(ROOT, 'src', 'content');
const BASE = 'https://fuzzyeeestudio.cn';

const largeFiles = [
  'guitar/Comping/基本节奏.html',
  'guitar/Standards/the girl from ipanema.html',
  'synth/基础电子元件库/三极管Bipolar Junction Transistor.html',
  'synth/基础电子元件库/电阻.html',
  'synth/基础电子元件库/面包板与跳线.html',
  'synth/效果器/LPB-1.html',
  'synth/电路基础/电是什么？？.html',
];

for (const filePath of largeFiles) {
  const fullPath = resolve(CONTENT_DIR, filePath);
  const content = await readFile(fullPath, 'utf-8');

  const relPath = filePath.replace(/\\/g, '/').replace(/\.html$/, '');
  const parts = relPath.split('/');
  const category = parts[0];
  const slug = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
  const kvKey = `content/${category}/${slug}`;

  const res = await fetch(`${BASE}/api/admin/put-kv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: kvKey, value: content }),
  });
  const data = await res.json();
  console.log(`${data.success ? 'OK' : 'FAIL'}: ${kvKey} (${content.length} 字节) - ${data.error || ''}`);
}
