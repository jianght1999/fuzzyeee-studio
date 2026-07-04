import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Fretboard from '../Fretboard/Fretboard';
import styles from './MarkdownRenderer.module.css';

interface MarkdownRendererProps {
  content: string;
}

// 自定义组件映射 — 处理 <Fretboard caged="C" /> 等特殊标签
const customComponents: Record<string, React.ComponentType<any>> = {
  Fretboard,
};

// 解析 Markdown 中的自定义 HTML 标签，替换为 React 组件占位符
function parseCustomComponents(content: string): {
  cleanedContent: string;
  placeholders: Map<string, { component: string; props: Record<string, string> }>;
} {
  const placeholders = new Map<string, { component: string; props: Record<string, string> }>();
  let index = 0;

  const cleanedContent = content.replace(
    /<(\w+)\s+([^>]+)\s*\/>/g,
    (match, tag, attrsStr) => {
      if (!customComponents[tag]) return match;

      const props: Record<string, string> = {};
      const attrRegex = /(\w+)="([^"]*)"/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        props[attrMatch[1]] = attrMatch[2];
      }

      const placeholder = `\n<!--CUSTOM_COMPONENT_${index}-->\n`;
      placeholders.set(placeholder, { component: tag, props });
      index++;
      return placeholder;
    }
  );

  return { cleanedContent, placeholders };
}

function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(c => (typeof c === 'string' ? c : '')).join('');
  return '';
}

interface RenderPart {
  type: 'text' | 'component';
  content: string;
  component?: string;
  props?: Record<string, string>;
}

function splitByPlaceholders(
  text: string,
  placeholders: Map<string, { component: string; props: Record<string, string> }>
): RenderPart[] {
  const parts: RenderPart[] = [];
  const regex = /<!--CUSTOM_COMPONENT_\d+-->/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    const placeholder = placeholders.get(match[0].trim());
    if (placeholder) {
      parts.push({
        type: 'component',
        content: match[0],
        component: placeholder.component,
        props: placeholder.props,
      });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts;
}

function renderPart(part: RenderPart, key: number): React.ReactNode {
  if (part.type === 'text') {
    return <span key={key}>{part.content}</span>;
  }
  if (part.component && customComponents[part.component]) {
    const Comp = customComponents[part.component];
    return <Comp key={key} {...part.props} />;
  }
  return null;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { cleanedContent, placeholders } = useMemo(
    () => parseCustomComponents(content),
    [content]
  );

  return (
    <div className={styles.renderer}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children, ...props }) => {
            const childText = extractText(children);
            if (typeof childText === 'string' && childText.includes('CUSTOM_COMPONENT_')) {
              const parts = splitByPlaceholders(childText, placeholders);
              if (parts.length > 1 || parts[0]?.type === 'component') {
                return <>{parts.map((part, i) => renderPart(part, i))}</>;
              }
            }
            return <p {...props}>{children}</p>;
          },
        }}
      >
        {cleanedContent}
      </ReactMarkdown>
    </div>
  );
}
