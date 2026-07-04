import { useMemo } from 'react';

interface MarkdownPage {
  slug: string;
  title: string;
  content: string;
  order: number;
}

interface HeadingItem {
  id: string;
  text: string;
  level: 2 | 3;
}

// Use Vite's import.meta.glob to load all .md files at build time
const modules = import.meta.glob<{ default: string }>(
  '../content/**/*.md',
  { eager: true, query: '?raw', import: 'default' }
);

function extractTitle(content: string): string {
  const h1 = content.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : '未命名';
}

function extractHeadings(content: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const regex = /^(#{2,3})\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length as 2 | 3;
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    headings.push({ id, text, level });
  }
  return headings;
}

export function useMarkdownPages(category: string) {
  const pages = useMemo(() => {
    const result: MarkdownPage[] = [];
    const prefix = `../content/${category}/`;

    for (const [path, mod] of Object.entries(modules)) {
      if (path.startsWith(prefix)) {
        const slug = path.replace(prefix, '').replace('.md', '');
        const content = (mod as { default: string }).default;
        result.push({
          slug,
          title: extractTitle(content),
          content,
          order: 0,
        });
      }
    }

    return result;
  }, [category]);

  const allHeadings = useMemo(() => {
    const result: { pageSlug: string; headings: HeadingItem[] }[] = [];
    for (const page of pages) {
      result.push({
        pageSlug: page.slug,
        headings: extractHeadings(page.content),
      });
    }
    return result;
  }, [pages]);

  return { pages, allHeadings };
}
