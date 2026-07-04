import { useState, useEffect } from 'react';
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

  const handleDragStart = (e: React.DragEvent, slug: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', slug);
  };

  const handleDragOver = (e: React.DragEvent, slug: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Only show indicator on items different from the dragged one
    const dragged = e.dataTransfer.getData('text/plain');
    if (dragged && dragged !== slug) setDragOver(slug);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the element (not entering a child)
    if (e.currentTarget === e.target) setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, targetSlug: string, parentSlug: string | null) => {
    e.preventDefault();
    setDragOver(null);
    const draggedSlug = e.dataTransfer.getData('text/plain');
    if (!draggedSlug || draggedSlug === targetSlug) return;
    const siblings = parentSlug
      ? pages.filter(p => p.parentSlug === parentSlug)
      : pages.filter(p => !p.parentSlug);
    const slugs = siblings.map(p => p.slug.replace(/^.*\//, ''));
    const draggedName = draggedSlug.replace(/^.*\//, '');
    const targetName = targetSlug.replace(/^.*\//, '');
    const fromIdx = slugs.indexOf(draggedName);
    const toIdx = slugs.indexOf(targetName);
    if (fromIdx === -1 || toIdx === -1) return;
    slugs.splice(fromIdx, 1);
    slugs.splice(toIdx, 0, draggedName);
    onReorder?.(slugs, parentSlug);
  };

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

    if (isChild && isExpanded) {
      // Auto-activate first child if none selected
      // (no side effects in render)
    }

    return (
      <div key={page.slug}>
        <div
          className={`${styles.pageRow} ${isChild ? styles.pageRowChild : ''} ${dragOver === page.slug ? styles.dragOver : ''}`}
          onDragOver={e => handleDragOver(e, page.slug)}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, page.slug, page.parentSlug)}
        >
          {isLoggedIn && !renaming && (
            <span
              className={styles.dragHandle}
              draggable
              onDragStart={e => handleDragStart(e, page.slug)}
              title="drag to reorder"
            >⠿</span>
          )}
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
                onClick={() => {
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
                    <button className={styles.actionBtn} onClick={e => { e.stopPropagation(); handleAdd(page.slug.replace(/^.*\//, '')); }} title="add sub-page">＋</button>
                  )}
                  <button className={styles.actionBtn} onClick={e => startRename(page.slug, page.title, e)} title="rename">✎</button>
                  <button className={styles.actionBtn} onClick={e => handleDelete(page.slug, e)} title="delete">✕</button>
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
