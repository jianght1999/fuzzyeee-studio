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
}

export default function Sidebar({
  pages,
  headingsByPage,
  activeSlug,
  onNavigate,
}: SidebarProps) {
  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const sidebarContent = (
    <>
      <div className={styles.header}>
        <span>📑 目录</span>
      </div>
      <div className={styles.list}>
        {pages.map((page) => {
          const headingData = headingsByPage.find(h => h.pageSlug === page.slug);
          const isActive = page.slug === activeSlug;
          const isCollapsed = collapsedPages.has(page.slug);
          const hasHeadings = headingData && headingData.headings.length > 0;

          return (
            <div key={page.slug} className={styles.pageGroup}>
              <button
                className={`${styles.pageItem} ${isActive ? styles.pageItemActive : ''}`}
                onClick={() => {
                  if (hasHeadings) {
                    toggleCollapse(page.slug);
                  }
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
    </>
  );

  return (
    <>
      {/* 移动端汉堡按钮 */}
      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen(true)}
        aria-label="打开目录"
      >
        ☰ 目录
      </button>

      {/* 桌面端固定侧边栏 */}
      <aside className={styles.desktopSidebar}>
        {sidebarContent}
      </aside>

      {/* 移动端覆盖 */}
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
