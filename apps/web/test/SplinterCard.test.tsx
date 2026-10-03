import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { Splinter } from '@brainsplinters/shared';
import { SplinterCard } from '../src/homepage/SplinterCard.js';

const splinter: Splinter = {
  id: 'anonymous-age-verification',
  slug: 'anonymous-age-verification',
  title: 'Anonymous Age Verification',
  description: 'Thinking through privacy-preserving age checks.',
  tags: ['privacy', 'identity'],
  type: 'idea',
  status: 'published',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-05T00:00:00.000Z',
  createdBy: 'kyle',
};

describe('SplinterCard', () => {
  it('links to the normal /splinter/{id} path (full navigation, not a router link)', () => {
    render(<SplinterCard splinter={splinter} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/splinter/anonymous-age-verification');
  });

  it('renders the title, tags, and type', () => {
    render(<SplinterCard splinter={splinter} />);
    expect(screen.getByText('Anonymous Age Verification')).toBeInTheDocument();
    expect(screen.getByText('privacy')).toBeInTheDocument();
    expect(screen.getByText('idea')).toBeInTheDocument();
  });
});
