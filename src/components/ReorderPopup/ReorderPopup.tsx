import { useState, useMemo } from 'react';
import type { Page } from '../../hooks/usePages';
import styles from './ReorderPopup.module.css';

interface ReorderPopupProps {
  page: Page;
  allPages: Page[];
  rootPages: Page[];
  onMove: (slug: string, newParentSlug: string | null) => Promise<void>;
  onReorder: (parentSlug: string | null, slugs: string[]) => Promise<void>;
  onClose: () => void;
}

export default function ReorderPopup({
  page, allPages, rootPages, onMove, onReorder, onClose,
}: ReorderPopupProps) {
  const parentOptions = useMemo(() => {
    const opts: { label: string; value: string; disabled: boolean }[] = [
      { label: '根目录（作为父目录）', value: '__root__', disabled: false },
    ];
    for (const rp of rootPages) {
      if (rp.slug === page.slug) continue;
      const disabled = !!page.hasChildren;
      opts.push({ label: rp.title, value: rp.slug, disabled });
    }
    return opts;
  }, [rootPages, page]);

  const currentParent = page.parentSlug ?? '__root__';

  const [selectedParent, setSelectedParent] = useState(currentParent);
  const [selectedPosition, setSelectedPosition] = useState(() => {
    const targetSlug = page.parentSlug ?? null;
    const siblings = allPages.filter(p => (p.parentSlug ?? null) === targetSlug);
    const idx = siblings.findIndex(p => p.slug === page.slug);
    return idx >= 0 ? idx : 0;
  });
  const handleParentChange = (newParent: string) => {
    setSelectedParent(newParent);
    if (newParent === currentParent) {
      const targetSlug = page.parentSlug ?? null;
      const siblings = allPages.filter(p => (p.parentSlug ?? null) === targetSlug);
      const idx = siblings.findIndex(p => p.slug === page.slug);
      setSelectedPosition(idx >= 0 ? idx : 0);
    } else {
      setSelectedPosition(0);
    }
  };

  const positionOptions = useMemo(() => {
    const targetSlug = selectedParent === '__root__' ? null : selectedParent;
    const siblings = allPages.filter(
      p => (p.parentSlug ?? null) === targetSlug && p.slug !== page.slug,
    );
    const opts: { label: string; value: number }[] = [];
    for (let i = 0; i <= siblings.length; i++) {
      opts.push({ label: `第 ${i + 1} 个`, value: i });
    }
    return opts;
  }, [selectedParent, allPages, page]);

  const handleConfirm = async () => {
    const newParentSlug = selectedParent === '__root__' ? null : selectedParent;
    const oldParentSlug = page.parentSlug ?? null;
    const parentChanged = newParentSlug !== oldParentSlug;

    if (parentChanged) {
      await onMove(page.slug, newParentSlug);
    } else {
      const siblings = allPages
        .filter(p => (p.parentSlug ?? null) === oldParentSlug)
        .map(p => p.slug);

      const oldIdx = siblings.indexOf(page.slug);
      if (oldIdx !== -1 && oldIdx !== selectedPosition) {
        siblings.splice(oldIdx, 1);
        siblings.splice(selectedPosition, 0, page.slug);
      }

      const leafSlugs = siblings.map(s => {
        const parts = s.split('/');
        return parts[parts.length - 1];
      });

      // keepalive 确保刷新后请求不丢失
      await onReorder(oldParentSlug, leafSlugs);
    }
    window.location.reload();
  };

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.title}>移动 / 排序</div>
        <div className={styles.currentPage}>{page.title}</div>

        <div className={styles.field}>
          <label className={styles.label}>放在哪里</label>
          <select
            className={styles.select}
            value={selectedParent}
            onChange={e => handleParentChange(e.target.value)}
          >
            {parentOptions.map(opt => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}{opt.disabled ? '（含子目录，不可嵌套）' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>排在第几个</label>
          <select
            className={styles.select}
            value={selectedPosition}
            onChange={e => setSelectedPosition(Number(e.target.value))}
          >
            {positionOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.actions}>
          <button className="pixel-button" onClick={onClose}>取消</button>
          <button className="pixel-button" onClick={() => { handleConfirm(); }}>
            确认 → 刷新
          </button>
        </div>
      </div>
    </div>
  );
}
