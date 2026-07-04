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

const FONT_OPTIONS = [
  { label: 'Pixel', value: "'Zpix', 'Press Start 2P', monospace" },
  { label: 'Mono', value: "'Fira Code', 'Courier New', monospace" },
  { label: 'Serif', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Sans', value: "system-ui, sans-serif" },
];

const SIZE_OPTIONS = [
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
];

export default function NotePage() {
  const { category } = useParams<{ category: string }>();
  const [activeSlug, setActiveSlug] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [viewFont, setViewFont] = useState(FONT_OPTIONS[0].value);
  const [viewSize, setViewSize] = useState(SIZE_OPTIONS[2].value);

  const { isLoggedIn, logout, createPage, deletePage, saveMarkdown } = useAuth();
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

  // --- Sidebar CRUD ---
  const handleAddPage = async (name: string) => {
    const path = `src/content/${category}/${name}.md`;
    const ok = await createPage(path);
    if (ok) {
      window.location.reload();
    }
  };

  const handleDeletePage = async (slug: string) => {
    const path = `src/content/${category}/${slug}.md`;
    const ok = await deletePage(path);
    if (ok) {
      window.location.reload();
    }
  };

  const handleRenamePage = async (oldSlug: string, newName: string) => {
    const page = sortedPages.find(p => p.slug === oldSlug);
    if (!page) return;
    const oldContent = editedContent[oldSlug] ?? page.content;
    let newContent: string;
    if (oldContent.match(/^#\s+.+$/m)) {
      newContent = oldContent.replace(/^#\s+.+$/m, `# ${newName}`);
    } else {
      newContent = `# ${newName}\n\n${oldContent}`;
    }
    const filePath = `src/content/${category}/${oldSlug}.md`;
    const ok = await saveMarkdown(filePath, newContent);
    if (ok) {
      setEditedContent(prev => ({ ...prev, [oldSlug]: newContent }));
      window.location.reload();
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
      <header className={styles.topBar}>
        <Link to="/" className={styles.backLink} title="返回首页">
          ◀
        </Link>
        <h1 className={styles.categoryTitle}>
          {categoryInfo.title}
        </h1>
        <div className={styles.actions}>
          {isLoggedIn ? (
            editing ? (
              <button className="pixel-button" onClick={() => setEditing(false)}>
                preview
              </button>
            ) : (
              <>
                <button className="pixel-button" onClick={() => setEditing(true)}>
                  edit
                </button>
                <button className="pixel-button" onClick={logout}>
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
          isLoggedIn={isLoggedIn}
          onAddPage={handleAddPage}
          onDeletePage={handleDeletePage}
          onRenamePage={handleRenamePage}
        />

        <main className={styles.content}>
          {isLoggedIn && !editing && (
            <div className={styles.viewToolbar}>
              <select
                className={styles.viewSelect}
                value={viewFont}
                onChange={(e) => setViewFont(e.target.value)}
                title="font"
              >
                {FONT_OPTIONS.map(f => (
                  <option key={f.label} value={f.value}>{f.label}</option>
                ))}
              </select>
              <select
                className={styles.viewSelect}
                value={viewSize}
                onChange={(e) => setViewSize(e.target.value)}
                title="size"
              >
                {SIZE_OPTIONS.map(s => (
                  <option key={s.label} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {activePage ? (
            editing ? (
              <MarkdownEditor
                content={displayContent}
                filePath={filePath}
                onSave={handleSave}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <MarkdownRenderer content={displayContent} viewFont={viewFont} viewSize={viewSize} />
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
