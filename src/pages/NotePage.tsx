import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { categories } from '../data/categories';
import { usePages, usePageContent } from '../hooks/usePages';
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
  const [searchParams] = useSearchParams();
  const [activeSlug, setActiveSlug] = useState<string>(() => searchParams.get('page') || '');
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [titleOverrides] = useState<Record<string, string>>({});
  const [showLogin, setShowLogin] = useState(false);
  const expandedRef = useRef<string[]>([]);
  const editorDirtyRef = useRef(false);
  const editorSaveRef = useRef<(() => void) | null>(null);

  const { isLoggedIn, logout, createPage, deletePage, saveMarkdown, token } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const categoryInfo = categories.find(c => c.slug === category);

  const { pages, loading } = usePages(category || '');

  const sortedPages = useMemo(() => {
    const mapped = pages.map(p => ({
      ...p,
      title: titleOverrides[p.slug] || p.title,
    }));
    return [...mapped].sort((a, b) => {
      // 根页面排在子页面前面
      if (!a.parentSlug && b.parentSlug) return -1;
      if (a.parentSlug && !b.parentSlug) return 1;
      // 同组内按 API 返回的 sortOrder 排序
      if (a.parentSlug === b.parentSlug) return a.sortOrder - b.sortOrder;
      return 0;
    });
  }, [pages, titleOverrides]);

  useEffect(() => {
    if (sortedPages.length > 0 && !activeSlug) {
      setActiveSlug(sortedPages[0].slug);
    }
  }, [sortedPages, activeSlug]);

  useEffect(() => {
    setEditing(false);
  }, [activeSlug]);

  const fetchedContent = usePageContent(category || '', activeSlug);

  const activePage = useMemo(
    () => sortedPages.find(p => p.slug === activeSlug),
    [sortedPages, activeSlug]
  );

  const displayContent = activePage
    ? (editedContent[activePage.slug] ?? fetchedContent ?? '')
    : '';

  const filePath = activePage
    ? `src/content/${category}/${activePage.slug}.html`
    : '';

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
    // 列表 API 不返回 content，需要时再获取
    let oldContent = editedContent[oldSlug];
    if (!oldContent) {
      try {
        const res = await fetch(`/api/pages/${category}/${encodeURIComponent(oldSlug)}`);
        const data = await res.json();
        oldContent = data.content || '';
      } catch { oldContent = ''; }
    }
    let newContent = oldContent.replace(/<h1[^>]*>.*?<\/h1>/i, `<h1>${newName}</h1>`);
    if (!/<h1/i.test(newContent)) newContent = `<h1>${newName}</h1>\n${newContent}`;
    // Rename file + subdirectory on disk
    const oldPath = `src/content/${category}/${oldSlug}.html`;
    const newSlug = oldSlug.includes('/')
      ? oldSlug.replace(/\/[^/]+$/, `/${newName}`)
      : newName;
    const newPath = `src/content/${category}/${newSlug}.html`;
    try {
      const res = await fetch(`/api/rename-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, oldPath, newPath }),
      });
      const data = await res.json();
      if (data.success) {
        await saveMarkdown(newPath, newContent);
        // 保存展开状态后刷新，确保 slug 变化后数据一致
        sessionStorage.setItem('pixel_keep_expanded', expandedRef.current.join(','));
        window.location.reload();
      }
    } catch { /* ignore */ }
  };

  // --- 移动页面 ---
  const handleMovePage = async (slug: string, newParentSlug: string | null) => {
    if (!token) { alert('请先登录'); return; }
    const leaf = slug.split('/').pop()!;
    const oldPath = `src/content/${category}/${slug}.html`;
    const newSlug = newParentSlug ? `${newParentSlug}/${leaf}` : leaf;
    const newPath = `src/content/${category}/${newSlug}.html`;
    try {
      const res = await fetch(`/api/move-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, oldPath, newPath }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || '移动失败，请重新登录');
      }
    } catch { alert('移动失败'); }
  };

  // --- 重排序 ---
  const handleReorder = async (parentSlug: string | null, leafSlugs: string[]) => {
    if (!token) { alert('请先登录'); return; }
    const res = await fetch(`/api/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, category, parentSlug: parentSlug ?? undefined, slugs: leafSlugs }),
      keepalive: true,
    });
    if (!res.ok) { alert('排序保存失败，请重新登录'); }
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
              <button className="pixel-button" onClick={() => {
                if (editorDirtyRef.current) {
                  if (window.confirm('有未保存的修改，是否保存？')) {
                    editorSaveRef.current?.();
                  }
                }
                logout();
              }}>logout</button>
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
          onMove={handleMovePage}
          onReorder={handleReorder}
          onExpandedChange={(slugs) => { expandedRef.current = slugs; }}
        />

        <main className={styles.content}>
          {loading || (activeSlug && fetchedContent === null) ? (
            <p className={styles.emptyHint}>加载中...</p>
          ) : activePage ? (
            editing ? (
              <RichTextEditor
                content={displayContent}
                filePath={filePath}
                triggerRef={editorSaveRef}
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
