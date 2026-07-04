import { useMemo } from 'react';

export interface Page {
  slug: string;
  title: string;
  content: string;
  type: 'md' | 'html';
  parentSlug: string | null;
  hasChildren: boolean;
}

interface HeadingItem {
  id: string;
  text: string;
  level: 2 | 3;
}

const mdModules   = import.meta.glob<string>('../content/**/*.md',   { eager: true, query: '?raw', import: 'default' });
const htmlModules = import.meta.glob<string>('../content/**/*.html', { eager: true, query: '?raw', import: 'default' });
const ordModules  = import.meta.glob<string>('../content/**/.order.json', { eager: true, query: '?raw', import: 'default' });

function slugFromPath(path: string, prefix: string): string {
  return path.replace(prefix, '').replace(/\.(md|html)$/, '');
}

function extractTitle(content: string, type: 'md' | 'html'): string {
  if (type === 'html') {
    const m = content.match(/<h1[^>]*>(.+?)<\/h1>/i);
    return m ? m[1].replace(/<[^>]+>/g, '').trim() : '未命名';
  }
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '未命名';
}

function extractHeadings(content: string, type: 'md' | 'html'): HeadingItem[] {
  const headings: HeadingItem[] = [];
  if (type === 'html') {
    const re = /<h([23])[^>]*>(.+?)<\/h\1>/gi;
    let m;
    while ((m = re.exec(content)) !== null) {
      const text = m[2].replace(/<[^>]+>/g, '').trim();
      headings.push({ id: text.toLowerCase().replace(/\s+/g, '-'), text, level: parseInt(m[1]) as 2 | 3 });
    }
  } else {
    const re = /^(#{2,3})\s+(.+)$/gm;
    let m;
    while ((m = re.exec(content)) !== null) {
      const text = m[2].trim();
      headings.push({ id: text.toLowerCase().replace(/\s+/g, '-'), text, level: m[1].length as 2 | 3 });
    }
  }
  return headings;
}

/** Read .order.json from a directory prefix, returns slug list */
function loadOrder(prefix: string): string[] {
  const key = `${prefix}.order.json`;
  const mod = ordModules[key];
  if (mod) {
    try { const arr = JSON.parse(mod); if (Array.isArray(arr)) return arr; }
    catch { /* ignore */ }
  }
  return [];
}

export function useMarkdownPages(category: string) {
  const pages = useMemo(() => {
    const prefix = `../content/${category}/`;
    const allPaths: { path: string; content: string; type: 'md' | 'html' }[] = [];

    for (const [path, mod] of Object.entries(mdModules))
      if (path.startsWith(prefix)) allPaths.push({ path, content: mod, type: 'md' });
    for (const [path, mod] of Object.entries(htmlModules))
      if (path.startsWith(prefix)) allPaths.push({ path, content: mod, type: 'html' });

    const result: Page[] = [];
    const childSlugs = new Set<string>();

    for (const { path, content, type } of allPaths) {
      const fullSlug = slugFromPath(path, prefix);
      const parts = fullSlug.split('/');
      const parentSlug = parts.length > 1 ? parts[0] : null;
      if (parentSlug) childSlugs.add(parentSlug);
      result.push({
        slug: fullSlug,
        title: extractTitle(content, type),
        content, type, parentSlug,
        hasChildren: false,
      });
    }

    for (const p of result)
      if (childSlugs.has(p.slug.replace(/^.*\//, ''))) p.hasChildren = true;

    const rootOrder = loadOrder(prefix);

    return result.sort((a, b) => {
      if (!a.parentSlug && b.parentSlug) return -1;
      if (a.parentSlug && !b.parentSlug) return 1;
      if (a.parentSlug && b.parentSlug) {
        if (a.parentSlug !== b.parentSlug) return a.parentSlug.localeCompare(b.parentSlug);
        const o = loadOrder(`${prefix}${a.parentSlug}/`);
        const ai = o.indexOf(a.slug.replace(/^.*\//, ''));
        const bi = o.indexOf(b.slug.replace(/^.*\//, ''));
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
      }
      const an = a.slug.replace(/^.*\//, '');
      const bn = b.slug.replace(/^.*\//, '');
      const ai = rootOrder.indexOf(an);
      const bi = rootOrder.indexOf(bn);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      if (an === 'intro' || an === 'overview') return -1;
      if (bn === 'intro' || bn === 'overview') return 1;
      return a.slug.localeCompare(b.slug);
    });
  }, [category]);

  const allHeadings = useMemo(() => {
    const r: { pageSlug: string; headings: HeadingItem[] }[] = [];
    for (const p of pages) r.push({ pageSlug: p.slug, headings: extractHeadings(p.content, p.type) });
    return r;
  }, [pages]);

  return { pages, allHeadings };
}
