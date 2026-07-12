import { useState, useEffect } from 'react';

export interface Page {
  slug: string;
  title: string;
  content?: string; // 列表加载时不带 content，单篇加载时有
  parentSlug: string | null;
  hasChildren: boolean;
  sortOrder: number;
}

/** 获取某个分类下所有页面的元数据（不含 content） */
export function usePages(category: string) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const apiUrl = `/api/pages/${category}`;
    console.log('[usePages] 请求:', apiUrl);
    fetch(apiUrl)
      .then(r => r.json())
      .then(data => {
        console.log('[usePages] 收到:', data.pages?.length || 0, '篇');
        const raw = data.pages || [];
        setPages(raw.map((p: any) => ({
          slug: p.slug,
          title: p.title,
          parentSlug: p.parentSlug ?? null,
          hasChildren: p.hasChildren ?? false,
          sortOrder: p.sortOrder ?? 0,
        })));
      })
      .catch(err => { console.error('[usePages] 请求失败:', err); setPages([]); })
      .finally(() => setLoading(false));
  }, [category]);

  return { pages, loading };
}

/** 获取单篇笔记的完整 HTML 内容 */
export function usePageContent(category: string, slug: string) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) { setContent(null); return; }
    setContent(null);
    fetch(`/api/pages/${category}/${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => setContent(data.content ?? ''))
      .catch(() => setContent(''));
  }, [category, slug]);

  return content;
}
