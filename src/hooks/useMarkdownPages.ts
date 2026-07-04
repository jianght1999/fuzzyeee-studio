import { useMemo } from 'react';

interface Page {
  slug: string;
  title: string;
  content: string;
  type: 'md' | 'html';
  order: number;
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

function extractTitleFromMd(content: string): string {
  const h1 = content.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : '未命名';
}

function extractTitleFromHtml(content: string): string {
  const h1 = content.match(/<h1[^>]*>(.+?)<\/h1>/i);
  return h1 ? h1[1].replace(/<[^>]+>/g, '').trim() : '未命名';
}

function extractHeadingsFromMd(content: string): HeadingItem[] {
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

function extractHeadingsFromHtml(content: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const regex = /<h([23])[^>]*>(.+?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const level = parseInt(match[1]) as 2 | 3;
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    headings.push({ id, text, level });
  }
  return headings;
}

export function useMarkdownPages(category: string) {
  const pages = useMemo(() => {
    const result: Page[] = [];
    const prefix = `../content/${category}/`;

    for (const [path, mod] of Object.entries(mdModules)) {
      if (path.startsWith(prefix)) {
        const slug = path.replace(prefix, '').replace('.md', '');
        result.push({
          slug,
          title: extractTitleFromMd(mod),
          content: mod,
          type: 'md' as const,
          order: 0,
        });
      }
    }

    for (const [path, mod] of Object.entries(htmlModules)) {
      if (path.startsWith(prefix)) {
        const slug = path.replace(prefix, '').replace('.html', '');
        result.push({
          slug,
          title: extractTitleFromHtml(mod),
          content: mod,
          type: 'html' as const,
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
        headings: page.type === 'md'
          ? extractHeadingsFromMd(page.content)
          : extractHeadingsFromHtml(page.content),
      });
    }
    return result;
  }, [pages]);

  return { pages, allHeadings };
}
