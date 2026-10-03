import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { TipTapDocument } from '@brainsplinters/shared';
import { TipTapContent } from '../src/lib/TipTapContent.js';

describe('TipTapContent', () => {
  it('renders paragraphs and marks', () => {
    const doc: TipTapDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world', marks: [{ type: 'bold' }] }],
        },
      ],
    };
    render(<TipTapContent doc={doc} />);
    const strong = screen.getByText('Hello world');
    expect(strong.tagName).toBe('STRONG');
  });

  it('drops unsafe link hrefs but keeps the text', () => {
    const doc: TipTapDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'click me',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
      ],
    };
    render(<TipTapContent doc={doc} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('click me')).toBeInTheDocument();
  });

  it('renders a safe image but drops an unsafe one', () => {
    const doc: TipTapDocument = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: 'https://example.com/cat.png', alt: 'cat' } },
        { type: 'image', attrs: { src: 'javascript:alert(1)' } },
      ],
    };
    const { container } = render(<TipTapContent doc={doc} />);
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/cat.png');
  });
});
