import type { Splinter } from '@brainsplinters/shared';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function SplinterCard({ splinter }: { splinter: Splinter }): React.JSX.Element {
  return (
    // Plain anchor -> normal full browser navigation, not client-side routing.
    <a className="splinter-card" href={`/splinter/${encodeURIComponent(splinter.id)}`}>
      {splinter.coverImageUrl && (
        <img className="splinter-card-cover" src={splinter.coverImageUrl} alt="" loading="lazy" />
      )}
      <div className="splinter-card-body">
        <h2 className="splinter-card-title">{splinter.title}</h2>
        {splinter.description && (
          <p className="splinter-card-description">{splinter.description}</p>
        )}
        <div className="chip-row">
          {splinter.type && <span className="chip chip-type">{splinter.type}</span>}
          {splinter.tags.map((tag) => (
            <span className="chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <div className="meta-line">Updated {formatDate(splinter.updatedAt)}</div>
      </div>
    </a>
  );
}
