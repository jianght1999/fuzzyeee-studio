import { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';

interface HeadingItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface SidebarProps {
  pages: { slug: string; title: string }[];
  headingsByPage: { pageSlug: string; headings: HeadingItem[] }[];
  activeSlug?: string;
  onNavigate: (slug: string, headingId?: string) => void;
  isLoggedIn?: boolean;
  onAddPage?: (name: string) => void;
  onDeletePage?: (slug: string) => void;
  onRenamePage?: (oldSlug: string, newName: string) => void;
}

export default function Sidebar({
  pages,
  headingsByPage,
  activeSlug,
  onNavigate,
  isLoggedIn,
  onAddPage,
  onDeletePage,
  onRenamePage,
}: SidebarProps) {
  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [renamingSlug, setRenamingSlug] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleCollapse = (slug: string) => {
    setCollapsedPages(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleNavigate = (slug: string, headingId?: string) => {
    onNavigate(slug, headingId);
    setMobileOpen(false);
  };

  const handleAdd = () => {
    const name = window.prompt('new page name (without .md):');
    if (name && name.trim()) {
      onAddPage?.(name.trim());
    }
  };

  const handleDelete = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`delete "${slug}.md"?`)) {
      onDeletePage?.(slug);
    }
  };

  const startRename = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSlug(slug);
    setRenameValue(slug);
  };

  const submitRename = () => {
    if (renamingSlug && renameValue.trim() && renameValue.trim() !== renamingSlug) {
      onRenamePage?.(renamingSlug, renameValue.trim());
    }
    setRenamingSlug(null);
  };

  const sidebarContent = (
    <>
      <div className={styles.list}>
        {pages.map((page) => {
          const headingData = headingsByPage.find(h => h.pageSlug === page.slug);
          const isActive = page.slug === activeSlug;
          const isCollapsed = collapsedPages.has(page.slug);
          const hasHeadings = headingData && headingData.headings.length > 0;

          return (
            <div key={page.slug} className={styles.pageGroup}>
              <div className={styles.pageRow}>
                {renamingSlug === page.slug ? (
                  <input
                    className={styles.renameInput}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={submitRename}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenamingSlug(null); }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <button
                    className={`${styles.pageItem} ${isActive ? styles.pageItemActive : ''}`}
                    onClick={() => {
                      if (hasHeadings) toggleCollapse(page.slug);
                      handleNavigate(page.slug);
                    }}
                  >
                    <span className={styles.pageTitle}>{page.title}</span>
                    {hasHeadings && (
                      <span className={`${styles.arrow} ${isCollapsed ? styles.arrowCollapsed : ''}`}>
                        ▾
                      </span>
                    )}
                  </button>
                )}

                {isLoggedIn && renamingSlug !== page.slug && (
                  <span className={styles.actions}>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => startRename(page.slug, e)}
                      title="rename"
                    >
                      ✎
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => handleDelete(page.slug, e)}
                      title="delete"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>

              {hasHeadings && !isCollapsed && (
                <div className={styles.headings}>
                  {headingData!.headings.map((heading) => (
                    <button
                      key={heading.id}
                      className={`${styles.headingItem} ${heading.level === 3 ? styles.headingL3 : ''}`}
                      onClick={() => handleNavigate(page.slug, heading.id)}
                    >
                      {heading.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isLoggedIn && (
        <button className={styles.addBtn} onClick={handleAdd}>
          ＋ new page
        </button>
      )}
    </>
  );

  return (
    <>
      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen(true)}
        aria-label="打开目录"
      >
        ☰
      </button>

      <aside className={styles.desktopSidebar}>
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <>
          <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
          <aside className={styles.mobileSidebar}>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
