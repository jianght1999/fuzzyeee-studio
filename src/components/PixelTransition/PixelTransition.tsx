import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import styles from './PixelTransition.module.css';

const COLS = 16;
const ROWS = 10;

interface TransitionContextType {
  navigateWithTransition: (navigateFn: () => void) => void;
}

const TransitionContext = createContext<TransitionContextType>({
  navigateWithTransition: (fn) => fn(),
});

export function usePixelTransition() {
  return useContext(TransitionContext);
}

interface PixelTransitionProps {
  children: ReactNode;
}

export default function PixelTransition({ children }: PixelTransitionProps) {
  const [phase, setPhase] = useState<'idle' | 'covering' | 'uncovering'>('idle');

  const navigateWithTransition = useCallback((navigateFn: () => void) => {
    setPhase('covering');
    setTimeout(() => {
      navigateFn();
      setTimeout(() => {
        setPhase('uncovering');
      }, 100);
    }, 350);
  }, []);

  if (phase === 'uncovering') {
    setTimeout(() => setPhase('idle'), 400);
  }

  const cells = Array.from({ length: COLS * ROWS }, (_, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const delay = phase === 'covering'
      ? (row + col) * 20
      : ((ROWS - 1 - row) + (COLS - 1 - col)) * 20;

    return (
      <div
        key={i}
        className={`${styles.cell} ${phase === 'covering' ? styles.cellCover : styles.cellUncover}`}
        style={{
          gridRow: row + 1,
          gridColumn: col + 1,
          animationDelay: `${delay}ms`,
        }}
      />
    );
  });

  return (
    <TransitionContext.Provider value={{ navigateWithTransition }}>
      {children}
      {phase !== 'idle' && (
        <div className={styles.overlay}>
          {cells}
        </div>
      )}
    </TransitionContext.Provider>
  );
}
