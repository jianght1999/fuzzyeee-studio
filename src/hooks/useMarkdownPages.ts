import { useMemo } from 'react';

export interface Page {
  slug: string;
  title: string;
  content: string;
  parentSlug: string | null;
  hasChildren: boolean;
}

const htmlModules = import.meta.glob<string>('../content/**/*.html', { eager: true, query: '?raw', import: 'default' });
const ordModules  = import.meta.glob<string>('../content/**/.order.json', { eager: true, query: '?raw', import: 'default' });

function slugFromPath(path: string, prefix: string): string {
  return path.replace(prefix, '').replace(/\.html$/, '');
}

function extractTitle(content: string): string {
  const m = content.match(/<h1[^>]*>(.+?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '未命名';
}

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
    const result: Page[] = [];
    const childSlugs = new Set<string>();

    for (const [path, mod] of Object.entries(htmlModules)) {
      if (!path.startsWith(prefix)) continue;
      const fullSlug = slugFromPath(path, prefix);
      const parts = fullSlug.split('/');
      const parentSlug = parts.length > 1 ? parts[0] : null;
      if (parentSlug) childSlugs.add(parentSlug);
      result.push({ slug: fullSlug, title: extractTitle(mod), content: mod, parentSlug, hasChildren: false });
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
      if (an === 'overview') return -1;
      if (bn === 'overview') return 1;
      return a.slug.localeCompare(b.slug);
    });
  }, [category]);

  return { pages };
}
