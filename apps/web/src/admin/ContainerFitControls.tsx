import type { ContainerFit } from '@brainsplinters/shared';

/**
 * Two dropdowns ("Default" + explicit options) letting an admin override
 * how an image is displayed in its static on-page container (e.g. a
 * Splinter's header image box) — as opposed to the shadowbox overlay.
 * Leaving a dropdown on "Default" keeps the automatic behavior (based on
 * the image's aspect ratio and the Splinter's type).
 */
export function ContainerFitControls({
  value,
  idPrefix,
  onChange,
}: {
  value: ContainerFit | undefined;
  idPrefix: string;
  onChange: (fit: ContainerFit | undefined) => void;
}): React.JSX.Element {
  function update(patch: Partial<ContainerFit>) {
    const next: ContainerFit = { ...value, ...patch };
    // Drop empty/undefined keys so we don't persist a `{}` object.
    for (const key of Object.keys(next) as (keyof ContainerFit)[]) {
      if (!next[key]) delete next[key];
    }
    onChange(Object.keys(next).length > 0 ? next : undefined);
  }

  return (
    <div className="lightbox-fit-controls">
      <span className="lightbox-fit-label">Header container display:</span>
      <select
        id={`${idPrefix}-container-align`}
        aria-label="Header container alignment"
        value={value?.align ?? ''}
        onChange={(e) => update({ align: (e.target.value || undefined) as ContainerFit['align'] })}
      >
        <option value="">Align: Default</option>
        <option value="top">Align: Top</option>
        <option value="center">Align: Center</option>
      </select>
      <select
        id={`${idPrefix}-container-size`}
        aria-label="Header container size"
        value={value?.size ?? ''}
        onChange={(e) => update({ size: (e.target.value || undefined) as ContainerFit['size'] })}
      >
        <option value="">Size: Default</option>
        <option value="fill">Size: Fill (crop to fit)</option>
        <option value="fit">Size: Fit to container (letterbox)</option>
      </select>
    </div>
  );
}
