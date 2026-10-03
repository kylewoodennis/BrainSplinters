import { describe, expect, it } from 'vitest';
import {
  parseSplinterIdFromPathname,
  parsePostIdFromSearch,
  buildSearchWithPostId,
} from '../src/routing.js';

describe('parseSplinterIdFromPathname', () => {
  it('extracts the id from a simple splinter path', () => {
    expect(parseSplinterIdFromPathname('/splinter/recipes')).toBe('recipes');
  });

  it('extracts the id when there is a trailing slash', () => {
    expect(parseSplinterIdFromPathname('/splinter/recipes/')).toBe('recipes');
  });

  it('decodes URI-encoded ids', () => {
    expect(parseSplinterIdFromPathname('/splinter/anonymous%20age')).toBe('anonymous age');
  });

  it('returns null for the homepage path', () => {
    expect(parseSplinterIdFromPathname('/')).toBeNull();
  });

  it('returns null for unrelated paths', () => {
    expect(parseSplinterIdFromPathname('/admin')).toBeNull();
  });

  it('returns null for a splinter path missing an id', () => {
    expect(parseSplinterIdFromPathname('/splinter/')).toBeNull();
  });
});

describe('parsePostIdFromSearch', () => {
  it('reads the post query parameter', () => {
    expect(parsePostIdFromSearch('?post=initial-concept')).toBe('initial-concept');
  });

  it('returns null when there is no post parameter', () => {
    expect(parsePostIdFromSearch('?foo=bar')).toBeNull();
  });

  it('returns null for an empty search string', () => {
    expect(parsePostIdFromSearch('')).toBeNull();
  });
});

describe('buildSearchWithPostId', () => {
  it('adds a post parameter to an empty search string', () => {
    expect(buildSearchWithPostId('', 'initial-concept')).toBe('?post=initial-concept');
  });

  it('replaces an existing post parameter', () => {
    expect(buildSearchWithPostId('?post=old', 'new')).toBe('?post=new');
  });

  it('preserves other parameters', () => {
    expect(buildSearchWithPostId('?foo=bar', 'new')).toBe('?foo=bar&post=new');
  });

  it('removes the post parameter when given null', () => {
    expect(buildSearchWithPostId('?post=old&foo=bar', null)).toBe('?foo=bar');
  });
});
