import { useState, useEffect, useRef } from 'react';
import type { Page } from '../../hooks/useMarkdownPages';
import styles from './Sidebar.module.css';

interface SidebarProps {
  pages: Page[];
  activeSlug?: string;
  onNavigate: (slug: string) => void;
  isLoggedIn?: boolean;
  onAddPage?: (name: string, parentSlug?: string) => void;
  onDeletePage?: (slug: string) => void;
  onRenamePage?: (oldSlug: string, newName: string) => void;
  onReorder?: (slugs: string[], parentSlug: string | null) => void;
}

export default function Sidebar({
  pages,
  activeSlug,
  onNavigate,
  isLoggedIn,
  onAddPage,
  onDeletePage,
  onRenamePage,
  onReorder,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragOver, setDragOver] = useState<string | null>(null);
  const justDragged = useRef(false);

  // Auto-expand parent after adding sub-page
  useEffect(() => {
    const expandSlug = sessionStorage.getItem('pixel_expand');
    if (expandSlug) {
      sessionStorage.removeItem('pixel_expand');
      setExpanded(prev => new Set([...prev, expandSlug]));
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const rootPages = pages.filter(p => !p.parentSlug);
  const childrenOf = (parentSlug: string) => pages.filter(p => p.parentSlug === parentSlug);

  const toggleExpand = (slug: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleNavigate = (slug: string) => {
    onNavigate(slug);
    setMobileOpen(false);
  };

  const startRename = (slug: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenaming(slug);
    setRenameValue(title);
  };

  const submitRename = () => {
    if (renaming && renameValue.trim()) {
      onRenamePage?.(renaming, renameValue.trim());
    }
    setRenaming(null);
  };

  const cancelRename = () => setRenaming(null);

  const handleAdd = (parentSlug?: string) => {
    const label = parentSlug ? `new sub-page under "${parentSlug}"` : 'new page name';
    const name = window.prompt(label);
    if (name?.trim()) onAddPage?.(name.trim(), parentSlug);
  };

  const handleDelete = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`delete "${slug}"?`)) onDeletePage?.(slug);
  };

  const renderPage = (page: Page, isChild = false) => {
    const kids = childrenOf(page.slug.replace(/^.*\//, ''));
    const hasKids = kids.length > 0 || page.hasChildren;
    const isExpanded = expanded.has(page.slug);
    const isActive = page.slug === activeSlug;

    return (
      <div key={page.slug}>
        <div
          className={`${styles.pageRow} ${isChild ? styles.pageRowChild : ''} ${dragOver === page.slug ? styles.dragOver : ''}`}
          draggable={isLoggedIn && !renaming ? 'true' : undefined}
          onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', page.slug); }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; const d = e.dataTransfer.getData('text/plain'); if (d && d !== page.slug) setDragOver(page.slug); }}
          onDragLeave={e => { if (e.currentTarget === e.target) setDragOver(null); }}
          onDrop={e => {
            e.preventDefault(); setDragOver(null);
            const ds = e.dataTransfer.getData('text/plain');
            if (!ds || ds === page.slug) return;
            const siblings = page.parentSlug ? pages.filter(p => p.parentSlug === page.parentSlug) : pages.filter(p => !p.parentSlug);
            const slugs = siblings.map(p => p.slug.replace(/^.*\//, ''));
            const dn = ds.replace(/^.*\//, '');
            const tn = page.slug.replace(/^.*\//, '');
            const fi = slugs.indexOf(dn), ti = slugs.indexOf(tn);
            if (fi === -1 || ti === -1) return;
            slugs.splice(fi, 1); slugs.splice(ti, 0, dn);
            onReorder?.(slugs, page.parentSlug);
          }}
          onDragEnd={() => { justDragged.current = true; setTimeout(() => { justDragged.current = false; }, 200); }}
        >
          {renaming === page.slug ? (
            <>
              <input
                className={styles.renameInput}
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') cancelRename(); }}
                autoFocus
                onClick={e => e.stopPropagation()}
              />
              <button className={styles.renameBtn} onClick={submitRename} title="save">✓</button>
              <button className={styles.renameBtn} onClick={cancelRename} title="cancel">✕</button>
            </>
          ) : (
            <>
              <button
                className={`${styles.pageItem} ${isActive ? styles.pageItemActive : ''}`}
                draggable="false"
                onClick={() => {
                  if (justDragged.current) { justDragged.current = false; return; }
                  handleNavigate(page.slug);
                  if (hasKids) toggleExpand(page.slug);
                }}
              >
                <span className={styles.pageTitle}>{page.title}</span>
                {hasKids && (
                  <span className={`${styles.arrow} ${isExpanded ? '' : styles.arrowCollapsed}`}>▾</span>
                )}
              </button>

              {isLoggedIn && (
                <span className={styles.actions}>
                  {!isChild && (
                    <button className={styles.actionBtn} draggable="false" onClick={e => { e.stopPropagation(); handleAdd(page.slug.replace(/^.*\//, '')); }} title="add sub-page">＋</button>
                  )}
                  <button className={styles.actionBtn} draggable="false" onClick={e => startRename(page.slug, page.title, e)} title="rename">✎</button>
                  <button className={styles.actionBtn} draggable="false" onClick={e => handleDelete(page.slug, e)} title="delete">✕</button>
                </span>
              )}
            </>
          )}
        </div>

        {/* Child pages */}
        {hasKids && isExpanded && (
          <div className={styles.children}>
            {kids.map(kid => renderPage(kid, true))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <>
      <div className={styles.list}>
        {rootPages.map(p => renderPage(p))}
      </div>
      {isLoggedIn && (
        <button className={styles.addBtn} onClick={() => handleAdd()}>
          ＋ new page
        </button>
      )}
    </>
  );

  return (
    <>
      <button className={styles.hamburger} onClick={() => setMobileOpen(true)}>☰</button>
      <aside className={styles.desktopSidebar}>{sidebarContent}</aside>
      {mobileOpen && (
        <>
          <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
          <aside className={styles.mobileSidebar}>{sidebarContent}</aside>
        </>
      )}
    </>
  );
}
