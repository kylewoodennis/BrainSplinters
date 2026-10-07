import { useEffect, useMemo, useState } from 'react';
import type { Splinter } from '@brainsplinters/shared';
import { api, ApiError } from '../lib/api.js';
import { SplinterCard } from './SplinterCard.js';

export function App(): React.JSX.Element {
  const [splinters, setSplinters] = useState<Splinter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState(() => new URLSearchParams(window.location.search).get('tag') ?? '');
  const [typeFilter, setTypeFilter] = useState(() => new URLSearchParams(window.location.search).get('type') ?? '');

  useEffect(() => {
    api
      .listSplinters()
      .then(setSplinters)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load Splinters.'),
      );
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const s of splinters ?? []) for (const t of s.tags) tags.add(t);
    return [...tags].sort();
  }, [splinters]);

  const allTypes = useMemo(() => {
    const types = new Set<string>();
    for (const s of splinters ?? []) if (s.type) types.add(s.type);
    return [...types].sort();
  }, [splinters]);

  const visible = useMemo(() => {
    return (splinters ?? [])
      .filter((s) => !tagFilter || s.tags.includes(tagFilter))
      .filter((s) => !typeFilter || s.type === typeFilter)
      .sort((a, b) => {
        const aIsPortfolio = a.type === 'portfolio';
        const bIsPortfolio = b.type === 'portfolio';
        if (aIsPortfolio !== bIsPortfolio) return aIsPortfolio ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [splinters, tagFilter, typeFilter]);

  const activeFilterCount = (typeFilter ? 1 : 0) + (tagFilter ? 1 : 0);

  function clearFilters() {
    setTypeFilter('');
    setTagFilter('');
  }

  return (
    <div className="page">
      <header className="site-header">
        <div>
          <h1 className="site-title">BrainSplinters</h1>
          <p className="site-tagline">A notebook of ideas, projects, recipes, and other splinters.</p>
        </div>

        {(allTags.length > 0 || allTypes.length > 0) && (
          <div className="filters">
            {allTypes.length > 0 && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by type"
              >
                <option value="">All types</option>
                {allTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
            {allTags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                aria-label="Filter by tag"
              >
                <option value="">All tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}

            {activeFilterCount > 0 && (
              <span className="filter-status">
                <span className="filter-count">
                  {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} applied
                </span>
                <button type="button" className="filter-clear" onClick={clearFilters}>
                  Clear filters
                </button>
              </span>
            )}
          </div>
        )}
      </header>

      {error && <p className="error-text">{error}</p>}
      {!error && splinters === null && <p className="empty-state">Loading…</p>}
      {!error && splinters !== null && visible.length === 0 && (
        <p className="empty-state">Nothing here yet.</p>
      )}

      <div className="splinter-grid">
        {visible.map((splinter) => (
          <SplinterCard key={splinter.id} splinter={splinter} />
        ))}
      </div>
    </div>
  );
}
