import { useState } from 'react';
import { cagedShapes, type CagedShapeConfig } from './cagedData';
import styles from './Fretboard.module.css';

interface FretboardProps {
  caged?: string;
  showNotes?: boolean;
  startFret?: number;
  endFret?: number;
  caption?: string;
}

const CAGED_KEYS = ['C', 'A', 'G', 'E', 'D'];
const STRING_NAMES = ['1(E)', '2(B)', '3(G)', '4(D)', '5(A)', '6(E)'];

export default function Fretboard({
  caged = 'C',
  showNotes: _showNotes = false,
  startFret,
  endFret,
  caption,
}: FretboardProps) {
  const [activeShape, setActiveShape] = useState<string>(caged);
  const shape: CagedShapeConfig | undefined = cagedShapes[activeShape];

  const fretStart = startFret ?? shape?.rootFret ?? 0;
  const fretEnd = endFret ?? (fretStart + 5);
  const fretCount = fretEnd - fretStart + 1;

  const hasNote = (stringNum: number, fretNum: number): boolean => {
    if (!shape) return false;
    return shape.notes.some(n => n.string === stringNum && n.fret === fretNum);
  };

  const isRoot = (stringNum: number, fretNum: number): boolean => {
    if (!shape) return false;
    return shape.notes.some(
      n => n.string === stringNum && n.fret === fretNum
        && n.string === shape.rootString && n.fret === shape.rootFret
    );
  };

  return (
    <div className={styles.fretboardContainer}>
      {/* CAGED 选择器 */}
      <div className={styles.selector}>
        {CAGED_KEYS.map((key) => (
          <button
            key={key}
            className={`pixel-button ${activeShape === key ? 'pixel-button--active' : ''}`}
            onClick={() => setActiveShape(key)}
          >
            {key}
          </button>
        ))}
      </div>

      {/* 指板图 */}
      <div className={styles.fretboard}>
        {[1, 2, 3, 4, 5, 6].map((stringNum) => (
          <div key={stringNum} className={styles.string}>
            <span className={styles.stringLabel}>{STRING_NAMES[6 - stringNum]}</span>
            <div className={styles.fretRow}>
              {Array.from({ length: fretCount }, (_, i) => {
                const fretNum = fretStart + i;
                const note = hasNote(stringNum, fretNum);
                const root = isRoot(stringNum, fretNum);
                return (
                  <div key={i} className={styles.fret}>
                    {note && (
                      <span className={`${styles.dot} ${root ? styles.dotRoot : ''}`}>
                        ●
                      </span>
                    )}
                    {!note && fretNum === 0 && (
                      <span className={styles.dotOpen}>○</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* 品格数字 */}
        <div className={styles.fretNumbers}>
          <span className={styles.stringLabel}></span>
          <div className={styles.fretRow}>
            {Array.from({ length: fretCount }, (_, i) => (
              <span key={i} className={styles.fretNum}>{fretStart + i}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 图例 + 说明 */}
      <div className={styles.caption}>
        <span className={styles.legend}>
          <span className={styles.dotSample}>●</span> 按弦
          <span className={styles.dotRootSample}>●</span> 根音
          <span className={styles.dotOpen}>○</span> 空弦
        </span>
        <p className={styles.description}>
          {caption || shape?.description || ''}
        </p>
      </div>
    </div>
  );
}
