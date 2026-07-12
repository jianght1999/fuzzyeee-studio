/** 从 HTML 提取 h1 标题 */
export function extractTitle(content: string): string {
  const m = content.match(/<h1[^>]*>(.+?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : 'Untitled';
}

/** 从 slug 获取父 slug（如 "Comping/drop 2" → "Comping"） */
export function getParentSlug(slug: string): string | null {
  const parts = slug.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : null;
}

/**
 * 从文件路径解析 category 和 slug
 * 输入："src/content/guitar/Comping/drop 2.html"
 * 输出：{ category: "guitar", slug: "Comping/drop 2" }
 */
export function parsePath(p: string): { category: string; slug: string } {
  const cleaned = p.replace(/\\/g, '/').replace(/^src\/content\//, '').replace(/\.html$/, '');
  const idx = cleaned.indexOf('/');
  if (idx === -1) return { category: cleaned, slug: cleaned };
  return { category: cleaned.substring(0, idx), slug: cleaned.substring(idx + 1) };
}
