import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ImageUploadModal from '../ImageUploadModal/ImageUploadModal';
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

export function RichTextEditor({ content, filePath, onSave, onCancel, onHasChanges, triggerRef }: RichTextEditorProps & { triggerRef?: React.MutableRefObject<(() => void) | null> }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLSelectElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const { token: authToken } = useAuth();

  const isDirty = useCallback(() => editorRef.current?.innerHTML !== content, [content]);

  // Warn on page close if unsaved
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Load initial content + wrap bare images
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== content) el.innerHTML = content;
    // Wrap bare <img> in resizable container + add <br> after each for cursor
    el.querySelectorAll('img').forEach(img => {
      if (img.parentElement?.hasAttribute('data-resizable')) return;
      const wrap = document.createElement('div');
      wrap.setAttribute('data-resizable', '');
      wrap.setAttribute('contenteditable', 'false');
      img.parentElement?.insertBefore(wrap, img);
      wrap.appendChild(img);
      // Ensure trailing editable node
      if (!wrap.nextSibling || (wrap.nextSibling.nodeType === 3 && !wrap.nextSibling.textContent?.trim())) {
        const br = document.createElement('br');
        wrap.parentElement?.insertBefore(br, wrap.nextSibling);
      }
    });
    // Ensure editor never fully empty
    if (!el.innerHTML.trim() || el.innerHTML === '<br>') el.innerHTML = '<br>';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const sizeToFont: Record<string, string> = { '10px': '2', '20px': '5', '30px': '6', '40px': '7' };

  const applyFontSize = (size: string) => {
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

  const applyFont = (font: string) => exec('fontName', font);

  const handleSave = async () => {
    if (!editorRef.current) { alert('editor not ready'); return; }
    setSaving(true);
    const html = editorRef.current.innerHTML;
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: authToken, path: filePath, content: html }),
      });
      const data = await res.json();
      setSaving(false);
      if (data.success) {
        setSaved(true);
        onSave(html);
        onHasChanges?.(false);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('save failed: ' + (data.error || 'unknown'));
      }
    } catch (err: any) {
      setSaving(false);
      alert('fetch error: ' + (err.message || String(err)));
    }
  };

  // Expose handleSave to parent via ref
  if (triggerRef) triggerRef.current = handleSave;

  // Backspace/Delete handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = sel.anchorNode;
    const target = (node as HTMLElement)?.closest?.('[data-resizable]') as HTMLElement
               || (node as HTMLElement)?.closest?.('img') as HTMLElement;
    if (target) { e.preventDefault(); target.remove(); return; }
    if (e.key === 'Backspace' && range.collapsed && range.startOffset === 0) {
      const block = range.startContainer;
      const prev = block.nodeType === 3 ? block.parentElement?.previousElementSibling : (block as HTMLElement).previousElementSibling;
      if (prev?.matches?.('[data-resizable], img')) { e.preventDefault(); prev.remove(); }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const wrapper = target.closest?.('[data-resizable]') as HTMLElement || target.closest?.('img') as HTMLElement;
    if (!wrapper) return;
    editorRef.current?.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    wrapper.classList.add('selected');
    e.preventDefault();
    const r = document.createRange();
    r.selectNode(wrapper);
    const s = window.getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  };

  const handleCancel = () => {
    if (isDirty()) { if (!window.confirm('discard changes?')) return; }
    onCancel();
  };

  // Size dropdown auto-detection
  const fontSizeToOur: Record<string, string> = { '1': '10px', '2': '10px', '5': '20px', '6': '30px', '7': '40px' };
  useEffect(() => {
    const handler = () => {
      if (!sizeRef.current) return;
      const sel = window.getSelection();
      if (!sel?.rangeCount || sel.isCollapsed || !editorRef.current?.contains(sel.anchorNode)) { sizeRef.current.value = ''; return; }
      const frag = sel.getRangeAt(0).cloneContents();
      const fonts = frag.querySelectorAll('font[size]');
      const sizes = new Set<string>();
      fonts.forEach(f => { const sz = (f as HTMLElement).getAttribute('size'); if (sz) sizes.add(sz); });
      frag.querySelectorAll('span').forEach(s => { const fs = (s as HTMLElement).style.fontSize; if (fs) sizes.add(fs); });
      if (sizes.size === 1) {
        const val = [...sizes][0];
        sizeRef.current.value = fontSizeToOur[val] || (SIZES.includes(val) ? val : '');
      } else { sizeRef.current.value = ''; }
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

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
        <button className="pixel-button" onClick={() => setShowImageModal(true)} title="insert image">🖼</button>
        <button className="pixel-button" onClick={() => {
          const sel = window.getSelection();
          const el = sel?.anchorNode?.parentElement;
          const wrapper = el?.closest?.('[data-resizable]') as HTMLElement || el?.closest?.('img') as HTMLElement;
          if (wrapper) { wrapper.style.float = wrapper.style.float === 'left' ? 'none' : 'left'; wrapper.style.margin = wrapper.style.float === 'left' ? '0 16px 8px 0' : '0'; }
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
            <button key={c} className={styles.colorBtn} style={{ backgroundColor: c }} onClick={() => applyColor(c)} title={c} />
          ))}
        </span>
      </div>
      <div ref={editorRef} className={styles.editable} contentEditable suppressContentEditableWarning
        onInput={() => onHasChanges?.(isDirty())}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
      />
      {showImageModal && (
        <ImageUploadModal
          onClose={() => setShowImageModal(false)}
          onInsert={(daySrc, nightSrc) => {
            if (!daySrc && !nightSrc) return;
            const same = daySrc && daySrc === nightSrc;
            let html: string;
            if (same) {
              // 单图模式：一个容器，两边都显示
              html = `<div contenteditable="false" data-resizable class="img-both" style="display:block;margin:16px auto;resize:both;overflow:hidden;max-width:100%;min-width:40px;min-height:20px;text-align:center;"><img src="${daySrc}" style="display:block;width:100%;height:auto;pointer-events:none;"></div><br>`;
            } else {
              // 双图模式：一个容器包两张图，主题切换只隐藏内部 div
              const day = daySrc ? `<div class="img-light"><img src="${daySrc}" style="display:block;width:100%;height:auto;pointer-events:none;"></div>` : '';
              const night = nightSrc ? `<div class="img-dark"><img src="${nightSrc}" style="display:block;width:100%;height:auto;pointer-events:none;"></div>` : '';
              html = `<div contenteditable="false" data-resizable style="display:block;margin:16px auto;resize:both;overflow:hidden;max-width:100%;min-width:40px;min-height:20px;text-align:center;">${day}${night}</div><br>`;
            }
            editorRef.current?.focus();
            document.execCommand('insertHTML', false, html);
          }}
        />
      )}
    </div>
  );
}

export default RichTextEditor;
