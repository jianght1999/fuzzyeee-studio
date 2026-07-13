import { Fragment, useState, useEffect, useRef, useCallback } from 'react';
import type { Page } from '../../hooks/usePages';
import ReorderPopup from '../ReorderPopup/ReorderPopup';
import styles from './Sidebar.module.css';

interface SidebarProps {
  pages: Page[];
  activeSlug?: string;
  onNavigate: (slug: string) => void;
  isLoggedIn?: boolean;
  onAddPage?: (name: string, parentSlug?: string) => void;
  onDeletePage?: (slug: string) => void;
  onRenamePage?: (oldSlug: string, newName: string) => void;
  onMove?: (slug: string, newParentSlug: string | null) => void;
  onReorder?: (parentSlug: string | null, slugs: string[]) => void;
  onExpandedChange?: (slugs: string[]) => void;
}

export default function Sidebar({
  pages, activeSlug, onNavigate, isLoggedIn,
  onAddPage, onDeletePage, onRenamePage, onMove, onReorder, onExpandedChange,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [reorderTarget, setReorderTarget] = useState<Page | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar_w3');
    return saved ? parseInt(saved) : 200;
  });
  const resizing = useRef(false);

  useEffect(() => { onExpandedChange?.([...expanded]); }, [expanded, onExpandedChange]);
  useEffect(() => {
    const saved = sessionStorage.getItem('pixel_keep_expanded');
    const expandSlug = sessionStorage.getItem('pixel_expand');
    if (saved) {
      sessionStorage.removeItem('pixel_keep_expanded');
      setExpanded(new Set(saved.split(',').filter(Boolean)));
    } else if (expandSlug) {
      sessionStorage.removeItem('pixel_expand');
      setExpanded(prev => new Set([...prev, expandSlug]));
    }
  }, []);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // 数据
  const rootPages = pages.filter(p => !p.parentSlug);
  const childrenOf = useCallback((ps: string) => pages.filter(p => p.parentSlug === ps), [pages]);
  const toggleExpand = (slug: string) => {
    setExpanded(prev => { const n = new Set(prev); if (n.has(slug)) n.delete(slug); else n.add(slug); return n; });
  };

  // ============ 重命名 ============
  const startRename = (slug: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation(); setRenaming(slug); setRenameValue(title);
  };
  const submitRename = () => {
    if (renaming && renameValue.trim()) onRenamePage?.(renaming, renameValue.trim());
    setRenaming(null);
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault(); resizing.current = true;
    const sx = e.clientX, sw = sidebarWidth;
    const mm = (ev: MouseEvent) => setSidebarWidth(Math.max(100, Math.min(500, sw + ev.clientX - sx)));
    const mu = () => { resizing.current = false; localStorage.setItem('sidebar_w3', String(sidebarWidth)); document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  };

  const renderPage = (page: Page, isChild: boolean) => {
    const kids = childrenOf(page.slug);
    const hasKids = kids.length > 0 || page.hasChildren;
    const isExpanded = expanded.has(page.slug);
    const isActive = page.slug === activeSlug;

    return (
      <Fragment key={page.slug}>
        <div className={`${styles.pageRow} ${isChild ? styles.pageRowChild : ''}`}>
          {renaming === page.slug ? (
            <>
              <input className={styles.renameInput} value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenaming(null); }}
                autoFocus onClick={e => e.stopPropagation()} />
              <span className={styles.renameBtn} onClick={submitRename}>✓</span>
              <span className={styles.renameBtn} onClick={() => setRenaming(null)}>✕</span>
            </>
          ) : (
            <>
              <span className={`${styles.pageItem} ${isActive ? styles.pageItemActive : ''}`}
                onClick={() => { onNavigate(page.slug); if (hasKids) toggleExpand(page.slug); }}>
                <span className={styles.pageTitle}>{page.title}</span>
                {hasKids && <span className={`${styles.arrow} ${isExpanded ? '' : styles.arrowCollapsed}`}>▾</span>}
              </span>
              {isLoggedIn && (
                <span className={styles.actions}>
                  <span className={styles.actionBtn} onClick={e => { e.stopPropagation(); setReorderTarget(page); }} title="排序">↕</span>
                  {!isChild && <span className={styles.actionBtn} onClick={e => { e.stopPropagation(); const n = prompt('新建子页名称'); if (n?.trim()) onAddPage?.(n.trim(), page.slug); }} title="新建子页">＋</span>}
                  <span className={styles.actionBtn} onClick={e => startRename(page.slug, page.title, e)} title="重命名">✎</span>
                  <span className={styles.actionBtn} onClick={e => { e.stopPropagation(); if (confirm(`删除 "${page.title}"?`)) onDeletePage?.(page.slug); }} title="删除">✕</span>
                </span>
              )}
            </>
          )}
        </div>
        {isExpanded && hasKids && (
          <div className={styles.children}>
            {kids.map(kid => renderPage(kid, true))}
          </div>
        )}
      </Fragment>
    );
  };

  const reorderPage = reorderTarget;

  return (
    <>
      <button className={styles.hamburger} onClick={() => setMobileOpen(true)}>☰</button>
      <aside className={styles.desktopSidebar} style={{ width: sidebarWidth }}>
        <div className={styles.list}>{rootPages.map(p => renderPage(p, false))}</div>
        {isLoggedIn && <button className={styles.addBtn} onClick={() => { const n = prompt('new page name'); if (n?.trim()) onAddPage?.(n.trim()); }}>＋ new page</button>}
        <div className={styles.resizeHandle} onMouseDown={startResize} />
      </aside>
      {mobileOpen && (
        <>
          <div className={styles.overlay} onClick={() => setMobileOpen(false)} />
          <aside className={styles.mobileSidebar}>{rootPages.map(p => renderPage(p, false))}</aside>
        </>
      )}

      {/* 排序弹窗 */}
      {reorderPage && onMove && onReorder && (
        <ReorderPopup
          page={reorderPage}
          allPages={pages}
          rootPages={rootPages}
          onMove={onMove}
          onReorder={onReorder}
          onClose={() => setReorderTarget(null)}
        />
      )}
    </>
  );
}
