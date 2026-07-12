import { connect } from '@tidbcloud/serverless';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

// TiDB 连接配置 — 从环境变量读取，运行前先设置：
//   set TIDB_HOST=xxx  TIDB_USER=xxx  TIDB_PASS=xxx  TIDB_DB=test
const TIDB_CONFIG = {
  host: process.env.TIDB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: process.env.TIDB_PORT || '4000',
  username: process.env.TIDB_USER || 'root',
  password: process.env.TIDB_PASS || '',
  database: process.env.TIDB_DB || 'test',
};

if (!TIDB_CONFIG.password) {
  console.error('请设置环境变量 TIDB_PASS');
  process.exit(1);
}

const url = `mysql://${encodeURIComponent(TIDB_CONFIG.username)}:${encodeURIComponent(TIDB_CONFIG.password)}@${TIDB_CONFIG.host}:${TIDB_CONFIG.port}/${TIDB_CONFIG.database}?ssl={"rejectUnauthorized":true}`;

const CONTENT_DIR = resolve(process.cwd(), '..', 'src', 'content');

async function execute(conn, sql, params = []) {
  console.log(`  SQL: ${sql.substring(0, 80)}...`);
  return conn.execute(sql, params);
}

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

function extractTitle(content) {
  const m = content.match(/<h1[^>]*>(.+?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : 'Untitled';
}

function getParentSlug(slug) {
  const parts = slug.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : null;
}

async function main() {
  console.log('🔗 连接 TiDB Cloud...');
  const conn = connect({ url });
  console.log('✅ 已连接\n');

  // ============ 建表 ============
  console.log('📋 创建表结构...');

  await conn.execute(`CREATE TABLE IF NOT EXISTS notes (
    slug VARCHAR(255) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    parent_slug VARCHAR(255),
    sort_order INT DEFAULT 0,
    updated_at BIGINT NOT NULL
  )`);

  await conn.execute(`CREATE INDEX IF NOT EXISTS idx_category ON notes(category)`);
  await conn.execute(`CREATE INDEX IF NOT EXISTS idx_parent ON notes(parent_slug)`);

  await conn.execute(`CREATE TABLE IF NOT EXISTS settings (
    \`key\` VARCHAR(100) PRIMARY KEY,
    \`value\` TEXT NOT NULL
  )`);

  await conn.execute(`CREATE TABLE IF NOT EXISTS recent_files (
    path VARCHAR(500) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    time BIGINT NOT NULL
  )`);

  console.log('✅ 表结构创建完成\n');

  // ============ 导入文章 ============
  console.log('📥 导入文章...');
  const files = await walkDir(CONTENT_DIR);
  console.log(`找到 ${files.length} 个 HTML 文件\n`);

  let success = 0, fail = 0;

  for (const file of files) {
    const { category, slug } = parsePath(file);
    const content = await readFile(file, 'utf-8');
    const title = extractTitle(content);
    const parentSlug = getParentSlug(slug);
    const now = Date.now();

    try {
      await conn.execute(
        `INSERT INTO notes (slug, category, title, content, parent_slug, sort_order, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           content = VALUES(content),
           parent_slug = VALUES(parent_slug),
           updated_at = VALUES(updated_at)`,
        [slug, category, title, content, parentSlug, now]
      );
      success++;
      if (success % 10 === 0) console.log(`  [${success}/${files.length}] ${category}/${slug}`);
    } catch (err) {
      fail++;
      console.log(`  ❌ ${category}/${slug}: ${err.message}`);
    }
  }

  console.log(`\n🎉 导入完成：${success}/${files.length} 成功，${fail} 失败`);

  // 验证
  const count = await conn.execute('SELECT COUNT(*) as cnt FROM notes');
  console.log(`📊 notes 表总行数：${count[0]?.cnt || count[0]?.['COUNT(*)'] || '?'}`);
}

main().catch(err => {
  console.error('❌ 失败:', err);
  process.exit(1);
});
