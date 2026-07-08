import { useParams, Link } from 'react-router-dom';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { categories } from '../data/categories';
import { useMarkdownPages } from '../hooks/useMarkdownPages';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import LoginModal from '../components/LoginModal/LoginModal';
import RecentDropdown from '../components/RecentDropdown/RecentDropdown';
import Sidebar from '../components/Sidebar/Sidebar';
import RichTextEditor from '../components/RichTextEditor/RichTextEditor';
import HtmlRenderer from '../components/HtmlRenderer/HtmlRenderer';
import styles from './NotePage.module.css';

export default function NotePage() {
  const { category } = useParams<{ category: string }>();
  const [activeSlug, setActiveSlug] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [orderOverrides, setOrderOverrides] = useState<Record<string, string[]>>({});
  const [showLogin, setShowLogin] = useState(false);
  const editorDirtyRef = useRef(false);

  const { isLoggedIn, logout, createPage, deletePage, saveMarkdown, token } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const categoryInfo = categories.find(c => c.slug === category);

  const { pages } = useMarkdownPages(category || '');

  const sortedPages = useMemo(() => {
    return [...pages].sort((a, b) => {
      // First: root pages before children
      if (!a.parentSlug && b.parentSlug) return -1;
      if (a.parentSlug && !b.parentSlug) return 1;
      // Same parent group
      if (a.parentSlug === b.parentSlug) {
        const dirKey = a.parentSlug ? `${category}/${a.parentSlug}` : category ?? '';
        const order = orderOverrides[dirKey];
        if (order) {
          const an = a.slug.replace(/^.*\//, ''), bn = b.slug.replace(/^.*\//, '');
          const ai = order.indexOf(an), bi = order.indexOf(bn);
          if (ai !== -1 && bi !== -1) return ai - bi;
        }
      }
      // Different parent groups: use hook's original order (stable sort)
      return 0;
    });
  }, [pages, orderOverrides, category]);

  useEffect(() => {
    if (sortedPages.length > 0 && !activeSlug) {
      setActiveSlug(sortedPages[0].slug);
    }
  }, [sortedPages, activeSlug]);

  useEffect(() => {
    setEditing(false);
  }, [activeSlug]);

  const activePage = useMemo(
    () => sortedPages.find(p => p.slug === activeSlug),
    [sortedPages, activeSlug]
  );

  const displayContent = activePage
    ? (editedContent[activePage.slug] ?? activePage.content)
    : '';

  const filePath = activePage
    ? `src/content/${category}/${activePage.slug}.html`
    : '';

  const handleReorder = async (slugs: string[], parentSlug: string | null) => {
    const dirKey = parentSlug ? `${category}/${parentSlug}` : (category ?? '');
    setOrderOverrides(prev => ({ ...prev, [dirKey]: slugs }));
    if (!token) return;
    const orderPath = `src/content/${dirKey}/.order.json`;
    try {
      await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, path: orderPath, content: JSON.stringify(slugs, null, 2) }),
      });
    } catch { /* ignore */ }
  };

  const handleSidebarNavigate = (slug: string) => {
    if (editorDirtyRef.current && slug !== activeSlug) {
      if (!window.confirm('you have unsaved changes. discard and switch page?')) return;
      editorDirtyRef.current = false;
    }
    setActiveSlug(slug);
  };

  const handleSave = useCallback((newContent: string) => {
    if (activePage) {
      setEditedContent(prev => ({ ...prev, [activePage.slug]: newContent }));
    }
    setEditing(false);
  }, [activePage]);

  // --- Sidebar CRUD ---
  const handleAddPage = async (name: string, parentSlug?: string) => {
    const dir = parentSlug ? `${category}/${parentSlug}` : category;
    const path = `src/content/${dir}/${name}.html`;
    const ok = await createPage(path, `<h1>${name}</h1>\n<p></p>`);
    if (ok) {
      if (parentSlug) sessionStorage.setItem('pixel_expand', parentSlug);
      window.location.reload();
    }
  };

  const handleDeletePage = async (slug: string) => {
    const path = `src/content/${category}/${slug}.html`;
    const ok = await deletePage(path);
    if (ok) window.location.reload();
  };

  const handleRenamePage = async (oldSlug: string, newName: string) => {
    const page = sortedPages.find(p => p.slug === oldSlug);
    if (!page || !token) return;
    const oldContent = editedContent[oldSlug] ?? page.content;
    let newContent = oldContent.replace(/<h1[^>]*>.*?<\/h1>/i, `<h1>${newName}</h1>`);
    if (!/<h1/i.test(newContent)) newContent = `<h1>${newName}</h1>\n${newContent}`;
    // Rename file + subdirectory on disk
    const oldPath = `src/content/${category}/${oldSlug}.html`;
    const newSlug = oldSlug.includes('/')
      ? oldSlug.replace(/\/[^/]+$/, `/${newName}`)
      : newName;
    const newPath = `src/content/${category}/${newSlug}.html`;
    try {
      const res = await fetch('/api/rename-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, oldPath, newPath }),
      });
      const data = await res.json();
      if (data.success) {
        await saveMarkdown(newPath, newContent);
        setEditedContent(prev => ({ ...prev, [oldSlug]: newContent }));
        // Preserve sidebar expansion state across reload
        sessionStorage.setItem('pixel_expand_all', '1');
        window.location.reload();
      }
    } catch { /* ignore */ }
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
      <header className={styles.topBar}>
        <Link
          to="/"
          className={styles.backLink}
          title="返回首页"
          onClick={(e) => {
            if (editorDirtyRef.current) {
              if (!window.confirm('you have unsaved changes. discard and go back?')) {
                e.preventDefault();
              } else {
                editorDirtyRef.current = false;
              }
            }
          }}
        >
          ◀
        </Link>
        <h1 className={styles.categoryTitle}>
          {categoryInfo.title}
        </h1>
        <div className={styles.actions}>
          <button className="pixel-button" onClick={toggleTheme} title="toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <RecentDropdown />
          {isLoggedIn ? (
            <>
              <button className="pixel-button" onClick={logout}>logout</button>
              {editing ? (
                <button className="pixel-button" onClick={() => setEditing(false)}>preview</button>
              ) : (
                <button className="pixel-button" onClick={() => setEditing(true)}>edit</button>
              )}
            </>
          ) : (
            <button className="pixel-button" onClick={() => setShowLogin(true)}>login</button>
          )}
        </div>
      </header>

      <div className={styles.body}>
        <Sidebar
          pages={sortedPages}
          activeSlug={activeSlug}
          onNavigate={handleSidebarNavigate}
          isLoggedIn={isLoggedIn}
          onAddPage={handleAddPage}
          onDeletePage={handleDeletePage}
          onRenamePage={handleRenamePage}
          onReorder={handleReorder}
        />

        <main className={styles.content}>
          {activePage ? (
            editing ? (
              <RichTextEditor
                content={displayContent}
                filePath={filePath}
                onSave={handleSave}
                onCancel={() => { editorDirtyRef.current = false; setEditing(false); }}
                onHasChanges={(dirty) => { editorDirtyRef.current = dirty; }}
              />
            ) : (
              <HtmlRenderer content={displayContent} />
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
