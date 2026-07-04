import styles from './HtmlRenderer.module.css';

interface HtmlRendererProps {
  content: string;
  viewFont?: string;
  viewSize?: string;
}

export default function HtmlRenderer({ content, viewFont, viewSize }: HtmlRendererProps) {
  const customStyle = {
    ...(viewFont ? { '--view-font': viewFont } as React.CSSProperties : {}),
    ...(viewSize ? { '--view-size': viewSize } as React.CSSProperties : {}),
  };

  return (
    <div
      className={styles.renderer}
      style={customStyle}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
