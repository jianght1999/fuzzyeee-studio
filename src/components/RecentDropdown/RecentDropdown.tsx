import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './RecentDropdown.module.css';

interface RecentEntry {
  path: string;
  title: string;
  category: string;
  time: string;
}

export default function RecentDropdown() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<RecentEntry[]>([]);
  const { isLoggedIn, token } = useAuth();
  const navigate = useNavigate();

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch('/api/recent');
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch { setList([]); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleClick = (entry: RecentEntry) => {
    setOpen(false);
    navigate(`/notes/${entry.category}`);
  };

  const handleDelete = async (e: React.MouseEvent, entry: RecentEntry) => {
    e.stopPropagation();
    if (!token) return;
    await fetch('/api/recent-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, path: entry.path }),
    });
    fetchList();
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className={styles.container}>
      <button className="pixel-button" style={{ fontSize: 13, lineHeight: 1 }} onClick={() => { setOpen(!open); if (!open) fetchList(); }}>
        📋
      </button>
      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.dropdown}>
            <div className={styles.header}>recent updates</div>
            {list.length === 0 && <div className={styles.empty}>no recent edits</div>}
            {list.slice(0, 10).map((entry) => (
              <div key={entry.path} className={styles.item} onClick={() => handleClick(entry)}>
                <div className={styles.itemMain}>
                  <span className={styles.itemTitle}>{entry.title}</span>
                  <span className={styles.itemMeta}>{entry.category} · {formatTime(entry.time)}</span>
                </div>
                {isLoggedIn && (
                  <button className={styles.delBtn} onClick={(e) => handleDelete(e, entry)} title="remove">✕</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
