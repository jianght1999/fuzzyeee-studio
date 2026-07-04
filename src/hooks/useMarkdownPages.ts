import { useMemo } from 'react';

export interface Page {
  slug: string;
  title: string;
  content: string;
  type: 'md' | 'html';
  parentSlug: string | null; // null = root-level page
  hasChildren: boolean;
}

interface HeadingItem {
  id: string;
  text: string;
  level: 2 | 3;
}

const mdModules = import.meta.glob<string>(
  '../content/**/*.md',
  { eager: true, query: '?raw', import: 'default' }
);
const htmlModules = import.meta.glob<string>(
  '../content/**/*.html',
  { eager: true, query: '?raw', import: 'default' }
);

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

export function useMarkdownPages(category: string) {
  const pages = useMemo(() => {
    const prefix = `../content/${category}/`;
    const allPaths: { path: string; content: string; type: 'md' | 'html' }[] = [];

    for (const [path, mod] of Object.entries(mdModules)) {
      if (path.startsWith(prefix)) {
        allPaths.push({ path, content: mod, type: 'md' });
      }
    }
    for (const [path, mod] of Object.entries(htmlModules)) {
      if (path.startsWith(prefix)) {
        allPaths.push({ path, content: mod, type: 'html' });
      }
    }

    // Build page list with parent-child detection
    const result: Page[] = [];
    const childSlugs = new Set<string>();

    for (const { path, content, type } of allPaths) {
      const fullSlug = slugFromPath(path, prefix); // e.g. "caged/c-shape" or "intro"
      const parts = fullSlug.split('/');
      const parentSlug = parts.length > 1 ? parts[0] : null;

      if (parentSlug) childSlugs.add(parentSlug);

      result.push({
        slug: fullSlug.replace(/\//g, '/'),
        title: extractTitle(content, type),
        content,
        type,
        parentSlug,
        hasChildren: false,
      });
    }

    // Mark pages that have children
    for (const p of result) {
      if (childSlugs.has(p.slug.replace(/^.*\//, ''))) {
        p.hasChildren = true;
      }
    }

    // Sort: root pages first (intro → others → placeholder), then children
    return result.sort((a, b) => {
      if (!a.parentSlug && b.parentSlug) return -1;
      if (a.parentSlug && !b.parentSlug) return 1;
      if (a.parentSlug && b.parentSlug) {
        if (a.parentSlug !== b.parentSlug) return a.parentSlug.localeCompare(b.parentSlug);
      }
      if (a.slug === 'intro' || a.slug.endsWith('/overview')) return -1;
      if (b.slug === 'intro' || b.slug.endsWith('/overview')) return 1;
      return a.slug.localeCompare(b.slug);
    });
  }, [category]);

  const allHeadings = useMemo(() => {
    const result: { pageSlug: string; headings: HeadingItem[] }[] = [];
    for (const page of pages) {
      result.push({ pageSlug: page.slug, headings: extractHeadings(page.content, page.type) });
    }
    return result;
  }, [pages]);

  return { pages, allHeadings };
}
