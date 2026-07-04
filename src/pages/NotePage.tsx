import { useParams, Link } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { categories } from '../data/categories';
import { useMarkdownPages } from '../hooks/useMarkdownPages';
import Sidebar from '../components/Sidebar/Sidebar';
import MarkdownRenderer from '../components/MarkdownRenderer/MarkdownRenderer';
import styles from './NotePage.module.css';

export default function NotePage() {
  const { category } = useParams<{ category: string }>();
  const [activeSlug, setActiveSlug] = useState<string>('');

  const categoryInfo = categories.find(c => c.slug === category);

  const { pages, allHeadings } = useMarkdownPages(category || '');

  const sortedPages = useMemo(() => {
    return [...pages].sort((a, b) => {
      if (a.slug === 'intro') return -1;
      if (b.slug === 'intro') return 1;
      if (a.slug === 'placeholder') return 1;
      if (b.slug === 'placeholder') return -1;
      return a.slug.localeCompare(b.slug);
    });
  }, [pages]);

  useEffect(() => {
    if (sortedPages.length > 0 && !activeSlug) {
      setActiveSlug(sortedPages[0].slug);
    }
  }, [sortedPages, activeSlug]);

  const activePage = useMemo(
    () => sortedPages.find(p => p.slug === activeSlug),
    [sortedPages, activeSlug]
  );

  const handleNavigate = (slug: string, headingId?: string) => {
    setActiveSlug(slug);
    if (headingId) {
      setTimeout(() => {
        document.getElementById(headingId)?.scrollIntoView({ behavior: 'auto' });
      }, 150);
    }
  };

  if (!categoryInfo || !categoryInfo.isAvailable) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h1>404</h1>
          <p>该笔记领域尚未开放</p>
          <Link to="/" className="pixel-button">← 返回首页</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* 顶部栏 */}
      <header className={styles.topBar}>
        <Link to="/" className={styles.backLink}>
          ← 返回
        </Link>
        <h1 className={styles.categoryTitle}>
          {categoryInfo.title}
        </h1>
        <div className={styles.spacer} />
      </header>

      <div className={styles.body}>
        <Sidebar
          pages={sortedPages}
          headingsByPage={allHeadings}
          activeSlug={activeSlug}
          onNavigate={handleNavigate}
        />

        <main className={styles.content}>
          {activePage ? (
            <MarkdownRenderer content={activePage.content} />
          ) : (
            <p className={styles.emptyHint}>请从左侧目录选择一篇笔记</p>
          )}
        </main>
      </div>
    </div>
  );
}
