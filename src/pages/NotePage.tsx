import { useParams, Link } from 'react-router-dom';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { categories } from '../data/categories';
import { useMarkdownPages } from '../hooks/useMarkdownPages';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar/Sidebar';
import MarkdownRenderer from '../components/MarkdownRenderer/MarkdownRenderer';
import MarkdownEditor from '../components/MarkdownEditor/MarkdownEditor';
import LoginModal from '../components/LoginModal/LoginModal';
import styles from './NotePage.module.css';

export default function NotePage() {
  const { category } = useParams<{ category: string }>();
  const [activeSlug, setActiveSlug] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  // Local cache of edited content for instant preview after save
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});

  const { isLoggedIn, logout } = useAuth();
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

  useEffect(() => {
    // Reset edit state when switching pages
    setEditing(false);
  }, [activeSlug]);

  const activePage = useMemo(
    () => sortedPages.find(p => p.slug === activeSlug),
    [sortedPages, activeSlug]
  );

  // Use edited content if available, otherwise use original
  const displayContent = activePage
    ? (editedContent[activePage.slug] ?? activePage.content)
    : '';

  // Derive file path from active page slug
  const filePath = activePage
    ? `src/content/${category}/${activePage.slug}.md`
    : '';

  const handleNavigate = (slug: string, headingId?: string) => {
    setActiveSlug(slug);
    if (headingId) {
      setTimeout(() => {
        document.getElementById(headingId)?.scrollIntoView({ behavior: 'auto' });
      }, 150);
    }
  };

  const handleSave = useCallback((newContent: string) => {
    if (activePage) {
      setEditedContent(prev => ({ ...prev, [activePage.slug]: newContent }));
    }
    setEditing(false);
  }, [activePage]);

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
        <Link to="/" className={styles.backLink} title="返回首页">
          ◀
        </Link>
        <h1 className={styles.categoryTitle}>
          {categoryInfo.title}
        </h1>
        <div className={styles.actions}>
          {isLoggedIn ? (
            editing ? null : (
              <>
                <button className="pixel-button" onClick={() => setEditing(true)}>
                  edit
                </button>
                <button className="pixel-button" onClick={logout} style={{ marginLeft: 8 }}>
                  logout
                </button>
              </>
            )
          ) : (
            <button className="pixel-button" onClick={() => setShowLogin(true)}>
              login
            </button>
          )}
        </div>
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
            editing ? (
              <MarkdownEditor
                content={displayContent}
                filePath={filePath}
                onSave={handleSave}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <MarkdownRenderer content={displayContent} />
            )
          ) : (
            <p className={styles.emptyHint}>请从左侧目录选择一篇笔记</p>
          )}
        </main>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
