import type { TipTapMark, TipTapNode } from '@brainsplinters/shared';
import { isSafeHttpUrl } from '@brainsplinters/shared';
import { Fragment, type ReactNode } from 'react';

function applyMarks(text: ReactNode, marks: TipTapMark[] | undefined, key: string): ReactNode {
  if (!marks || marks.length === 0) return text;
  return marks.reduce<ReactNode>((acc, mark, index) => {
    switch (mark.type) {
      case 'bold':
        return <strong key={`${key}-b-${index}`}>{acc}</strong>;
      case 'italic':
        return <em key={`${key}-i-${index}`}>{acc}</em>;
      case 'code':
        return <code key={`${key}-c-${index}`}>{acc}</code>;
      case 'link': {
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '';
        if (!isSafeHttpUrl(href)) return acc;
        return (
          <a key={`${key}-l-${index}`} href={href} target="_blank" rel="noopener noreferrer">
            {acc}
          </a>
        );
      }
      default:
        return acc;
    }
  }, text);
}

function renderNode(node: TipTapNode, key: string): ReactNode {
  const children = (node.content ?? []).map((child, index) =>
    renderNode(child, `${key}-${index}`),
  );

  switch (node.type) {
    case 'doc':
      return <Fragment key={key}>{children}</Fragment>;
    case 'paragraph':
      return <p key={key}>{children}</p>;
    case 'heading': {
      const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1;
      const Tag = (`h${Math.min(Math.max(level, 1), 6)}` as unknown) as keyof JSX.IntrinsicElements;
      return <Tag key={key}>{children}</Tag>;
    }
    case 'bulletList':
      return <ul key={key}>{children}</ul>;
    case 'orderedList':
      return <ol key={key}>{children}</ol>;
    case 'listItem':
      return <li key={key}>{children}</li>;
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>;
    case 'codeBlock':
      return (
        <pre key={key}>
          <code>{children}</code>
        </pre>
      );
    case 'hardBreak':
      return <br key={key} />;
    case 'image': {
      const src = typeof node.attrs?.src === 'string' ? node.attrs.src : '';
      if (!isSafeHttpUrl(src)) return null;
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : '';
      return <img key={key} src={src} alt={alt} loading="lazy" />;
    }
    case 'text':
      return <Fragment key={key}>{applyMarks(node.text ?? '', node.marks, key)}</Fragment>;
    default:
      return <Fragment key={key}>{children}</Fragment>;
  }
}

/** Renders a TipTap JSON document (read-only) without bundling the TipTap editor itself. */
export function TipTapContent({ doc }: { doc: TipTapNode }): React.JSX.Element {
  return <>{renderNode(doc, 'root')}</>;
}
