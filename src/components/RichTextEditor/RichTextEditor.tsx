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

/** Wrap selection in a styled span — handles cross-element selections */
function wrapSelection(style: string) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  span.setAttribute('style', style);
  try {
    range.surroundContents(span);
  } catch {
    // Selection crosses element boundaries — extract, wrap, re-insert
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
  }
  sel.removeAllRanges();
}

export default function RichTextEditor({ content, filePath, onSave, onCancel, onHasChanges }: RichTextEditorProps) {
  const { saveMarkdown } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
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

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const applyFontSize = (size: string) => {
    wrapSelection(`font-size:${size}`);
    editorRef.current?.focus();
  };

  const applyFont = (font: string) => {
    exec('fontName', font);
  };

  const applyColor = (color: string) => {
    exec('foreColor', color);
  };

  const resetColor = () => {
    wrapSelection('color:inherit');
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
      </div>
      <div className={styles.toolbar}>
        <select className={styles.select} onChange={(e) => { if (e.target.value) applyFont(e.target.value); e.target.value = ''; }}>
          <option value="">font</option>
          {FONTS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
        </select>
        <select className={styles.select} onChange={(e) => { if (e.target.value === 'auto') { wrapSelection('font-size:inherit'); } else if (e.target.value) { applyFontSize(e.target.value); } e.target.value = ''; }}>
          <option value="">size</option>
          <option value="auto">auto</option>
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
