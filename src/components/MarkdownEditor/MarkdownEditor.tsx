import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './MarkdownEditor.module.css';

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

  const handleSave = async () => {
    setSaving(true);
    // filePath is relative: e.g. "src/content/guitar/caged-system.md"
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
      </div>
      <textarea
        className={styles.textarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
