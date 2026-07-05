import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './RichTextEditor.module.css';

const FONTS = [
  { label: 'Pixel', value: "'Fusion Pixel', 'Press Start 2P', monospace" },
  { label: 'Mono', value: "'Fira Code', 'Courier New', monospace" },
];

const SIZES = ['10px', '20px', '30px', '40px'];
const COLORS = ['#333', '#555', '#888', '#b8a88a', '#c44', '#48b', '#494'];

interface RichTextEditorProps {
  content: string;
  filePath: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
  onHasChanges?: (dirty: boolean) => void;
}

export default function RichTextEditor({ content, filePath, onSave, onCancel, onHasChanges }: RichTextEditorProps) {
  const { saveMarkdown } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLSelectElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDirty = useCallback(() => {
    return editorRef.current?.innerHTML !== content;
  }, [content]);

  // Warn on page close if unsaved
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Set initial content only once
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update size dropdown based on current selection (looks for <font size=N>)
  const fontSizeToOur: Record<string, string> = { '1': '10px', '2': '10px', '5': '20px', '6': '30px', '7': '40px' };
  useEffect(() => {
    const handler = () => {
      if (!sizeRef.current) return;
      const sel = window.getSelection();
      if (!sel?.rangeCount || sel.isCollapsed || !editorRef.current?.contains(sel.anchorNode)) {
        sizeRef.current.value = '';
        return;
      }
      const range = sel.getRangeAt(0);
      const frag = range.cloneContents();
      const fonts = frag.querySelectorAll('font[size]');
      const sizes = new Set<string>();
      fonts.forEach(f => {
        const sz = (f as HTMLElement).getAttribute('size');
        if (sz) sizes.add(sz);
      });
      // Also check spans with font-size style (from old content)
      frag.querySelectorAll('span').forEach(s => {
        const fs = (s as HTMLElement).style.fontSize;
        if (fs) sizes.add(fs);
      });
      if (sizes.size === 1) {
        const val = [...sizes][0];
        sizeRef.current.value = fontSizeToOur[val] || (SIZES.includes(val) ? val : '');
      } else {
        sizeRef.current.value = '';
      }
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  // Use <font size=N> (no styleWithCSS) — CSS overrides exact pixel sizes
  const sizeToFont: Record<string, string> = { '10px': '2', '20px': '5', '30px': '6', '40px': '7' };
  const applyFontSize = (size: string) => {
    // Unwrap any existing <font size> around the selection to prevent nesting
    const sel = window.getSelection();
    if (sel?.rangeCount && !sel.isCollapsed) {
      let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'FONT' && (node as HTMLElement).hasAttribute('size')) {
          const p = node.parentNode;
          while (node.firstChild) p?.insertBefore(node.firstChild, node);
          p?.removeChild(node);
          break;
        }
        node = node.parentNode;
      }
    }
    exec('fontSize', sizeToFont[size] || '5');
  };

  const applyColor = (color: string) => {
    document.execCommand('styleWithCSS', false, 'true');
    exec('foreColor', color);
  };

  const resetColor = () => {
    document.execCommand('styleWithCSS', false, 'true');
    exec('foreColor', 'var(--color-text)');
  };

  const applyFont = (font: string) => {
    exec('fontName', font);
  };

  const handleSave = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    const html = editorRef.current.innerHTML;
    const ok = await saveMarkdown(filePath, html);
    setSaving(false);
    if (ok) {
      setSaved(true);
      onSave(html);
      onHasChanges?.(false);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleCancel = () => {
    if (isDirty()) {
      if (!window.confirm('discard changes?')) return;
    }
    onCancel();
  };

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar}>
        <button className="pixel-button" onClick={handleSave} disabled={saving}>
          {saving ? 'saving...' : saved ? '✓ saved' : 'save'}
        </button>
        <button className="pixel-button" onClick={handleCancel}>cancel</button>
        <span className={styles.sep} />
        <button className="pixel-button" onClick={() => exec('bold')} title="bold"><b>B</b></button>
        <button className="pixel-button" onClick={() => exec('italic')} title="italic"><i>I</i></button>
        <button className="pixel-button" onClick={() => exec('underline')} title="underline"><u>U</u></button>
        <span className={styles.sep} />
        <button className="pixel-button" onClick={() => fileInputRef.current?.click()} title="insert image">🖼</button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              exec('insertImage', reader.result as string);
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }}
        />
        <button className="pixel-button" onClick={() => {
          const img = editorRef.current?.querySelector('img:hover, img:focus') as HTMLImageElement || undefined;
          const selImg = window.getSelection()?.anchorNode?.parentElement?.closest?.('img');
          const target = img || selImg;
          if (target instanceof HTMLImageElement) {
            target.style.float = target.style.float === 'left' ? 'none' : 'left';
            target.style.margin = target.style.float === 'left' ? '0 16px 8px 0' : '0';
          }
        }} title="toggle float">◧</button>
      </div>
      <div className={styles.toolbar}>
        <select className={styles.select} onChange={(e) => { if (e.target.value) applyFont(e.target.value); e.target.value = ''; }}>
          <option value="">font</option>
          {FONTS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
        </select>
        <select ref={sizeRef} className={styles.select} onChange={(e) => { const v = e.target.value; if (v) applyFontSize(v); }}>
          <option value="">size</option>
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className={styles.colorGroup}>
          <button className={styles.colorBtnAuto} onClick={resetColor} title="default">auto</button>
          {COLORS.map(c => (
            <button
              key={c}
              className={styles.colorBtn}
              style={{ backgroundColor: c }}
              onClick={() => applyColor(c)}
              title={c}
            />
          ))}
        </span>
      </div>
      <div
        ref={editorRef}
        className={styles.editable}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onHasChanges?.(isDirty())}
      />
    </div>
  );
}
