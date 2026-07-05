import { useRef, useEffect } from 'react';
import styles from './HtmlRenderer.module.css';

interface HtmlRendererProps {
  content: string;
  viewFont?: string;
  viewSize?: string;
}

export default function HtmlRenderer({ content, viewFont, viewSize }: HtmlRendererProps) {
  const ref = useRef<HTMLDivElement>(null);
  const customStyle = {
    ...(viewFont ? { '--view-font': viewFont } as React.CSSProperties : {}),
    ...(viewSize ? { '--view-size': viewSize } as React.CSSProperties : {}),
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const img = e.target as HTMLElement;
      if (img.tagName !== 'IMG') return;
      img.classList.toggle(styles.zoomed);
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, []);

  return (
    <div
      ref={ref}
      className={styles.renderer}
      style={customStyle}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
