import { useState, useRef } from 'react';
import styles from './ImageUploadModal.module.css';

interface ImageUploadModalProps {
  onInsert: (daySrc: string, nightSrc: string) => void;
  onClose: () => void;
}

export default function ImageUploadModal({ onInsert, onClose }: ImageUploadModalProps) {
  const [daySrc, setDaySrc] = useState<string | null>(null);
  const [nightSrc, setNightSrc] = useState<string | null>(null);
  const [mode, setMode] = useState<'dual' | 'single'>('dual');
  const dayRef = useRef<HTMLInputElement>(null);
  const nightRef = useRef<HTMLInputElement>(null);
  const singleRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File): Promise<string> => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  const handleDay = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) setDaySrc(await readFile(f));
  };
  const handleNight = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) setNightSrc(await readFile(f));
  };
  const handleSingle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) { const src = await readFile(f); setDaySrc(src); setNightSrc(src); }
  };

  const canInsert = mode === 'single' ? !!daySrc : (!!daySrc || !!nightSrc);

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <h3 className={styles.title}>insert image</h3>

        <div className={styles.modeSwitch}>
          <button className={`pixel-button ${mode === 'dual' ? 'pixel-button--active' : ''}`} onClick={() => setMode('dual')}>day / night</button>
          <button className={`pixel-button ${mode === 'single' ? 'pixel-button--active' : ''}`} onClick={() => setMode('single')}>single</button>
        </div>

        {mode === 'dual' ? (
          <>
            <div className={styles.row}>
              <span className={styles.label}>☀ day</span>
              <button className="pixel-button" onClick={() => dayRef.current?.click()}>choose</button>
              <input ref={dayRef} type="file" accept="image/*" hidden onChange={handleDay} />
              {daySrc && <span className={styles.ok}>✓</span>}
            </div>
            <div className={styles.row}>
              <span className={styles.label}>☾ night</span>
              <button className="pixel-button" onClick={() => nightRef.current?.click()}>choose</button>
              <input ref={nightRef} type="file" accept="image/*" hidden onChange={handleNight} />
              {nightSrc && <span className={styles.ok}>✓</span>}
            </div>
          </>
        ) : (
          <div className={styles.row}>
            <span className={styles.label}>image</span>
            <button className="pixel-button" onClick={() => singleRef.current?.click()}>choose</button>
            <input ref={singleRef} type="file" accept="image/*" hidden onChange={handleSingle} />
            {daySrc && <span className={styles.ok}>✓</span>}
          </div>
        )}

        <div className={styles.actions}>
          <button className="pixel-button" disabled={!canInsert} onClick={() => { onInsert(daySrc || '', nightSrc || ''); onClose(); }}>insert</button>
          <button className="pixel-button" onClick={onClose}>cancel</button>
        </div>
      </div>
    </div>
  );
}
