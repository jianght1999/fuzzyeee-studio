import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './RichTextEditor.module.css';

const FONTS = [
  { label: 'Pixel', value: "'Fusion Pixel', 'Press Start 2P', monospace" },
  { label: 'Mono', value: "'Fira Code', 'Courier New', monospace" },
  { label: 'Serif', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Sans', value: "system-ui, sans-serif" },
];

const SIZES = ['10px', '20px', '30px', '40px'];
const COLORS = ['#333', '#555', '#888', '#b8a88a', '#c44', '#48b', '#494', '#000'];

interface RichTextEditorProps {
  content: string;
  filePath: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}

export default function RichTextEditor({ content, filePath, onSave, onCancel }: RichTextEditorProps) {
  const { saveMarkdown } = useAuth();
  const editorRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
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
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleCancel = () => {
    const html = editorRef.current?.innerHTML || '';
    if (html !== content) {
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
        <select className={styles.select} onChange={(e) => exec('fontName', e.target.value)} defaultValue="">
          <option value="" disabled>font</option>
          {FONTS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
        </select>
        <select className={styles.select} onChange={(e) => exec('fontSize', e.target.value)} defaultValue="">
          <option value="" disabled>size</option>
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className={styles.colorGroup}>
          {COLORS.map(c => (
            <button
              key={c}
              className={styles.colorBtn}
              style={{ backgroundColor: c }}
              onClick={() => exec('foreColor', c)}
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
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
