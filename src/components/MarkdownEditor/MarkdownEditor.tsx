import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './MarkdownEditor.module.css';

const FONT_OPTIONS = [
  { label: 'Pixel', value: "'Fenghuang', 'Press Start 2P', monospace" },
  { label: 'Mono', value: "'Fira Code', 'Courier New', monospace" },
  { label: 'Serif', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Sans', value: "system-ui, sans-serif" },
];

const SIZE_OPTIONS = [
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
];

interface MarkdownEditorProps {
  content: string;
  filePath: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}

export default function MarkdownEditor({ content, filePath, onSave, onCancel }: MarkdownEditorProps) {
  const { saveMarkdown } = useAuth();
  const [text, setText] = useState(content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [font, setFont] = useState(FONT_OPTIONS[0].value);
  const [fontSize, setFontSize] = useState(SIZE_OPTIONS[2].value);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveMarkdown(filePath, text);
    setSaving(false);
    if (ok) {
      setSaved(true);
      onSave(text);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleCancel = () => {
    if (text !== content) {
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
        <button className="pixel-button" onClick={handleCancel}>
          cancel
        </button>
        <span className={styles.spacer} />
        <select
          className={styles.select}
          value={font}
          onChange={(e) => setFont(e.target.value)}
          title="font"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.label} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select
          className={styles.select}
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
          title="size"
        >
          {SIZE_OPTIONS.map((s) => (
            <option key={s.label} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <textarea
        className={styles.textarea}
        style={{ fontFamily: font, fontSize }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
