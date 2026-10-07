import type { LightboxFit } from '@brainsplinters/shared';

/**
 * Three dropdowns ("Default" + explicit options) letting an admin override
 * how a single image is displayed in the public shadowbox (lightbox)
 * overlay. Leaving a dropdown on "Default" keeps the automatic behavior
 * (based on the image's aspect ratio and the Splinter's type).
 */
export function LightboxFitControls({
  value,
  idPrefix,
  onChange,
}: {
  value: LightboxFit | undefined;
  idPrefix: string;
  onChange: (fit: LightboxFit | undefined) => void;
}): React.JSX.Element {
  function update(patch: Partial<LightboxFit>) {
    const next: LightboxFit = { ...value, ...patch };
    // Drop empty/undefined keys so we don't persist a `{}` object.
    for (const key of Object.keys(next) as (keyof LightboxFit)[]) {
      if (!next[key]) delete next[key];
    }
    onChange(Object.keys(next).length > 0 ? next : undefined);
  }

  return (
    <div className="lightbox-fit-controls">
      <span className="lightbox-fit-label">Shadowbox display:</span>
      <select
        id={`${idPrefix}-align`}
        aria-label="Shadowbox alignment"
        value={value?.align ?? ''}
        onChange={(e) => update({ align: (e.target.value || undefined) as LightboxFit['align'] })}
      >
        <option value="">Align: Default</option>
        <option value="top">Align: Top</option>
        <option value="center">Align: Center</option>
      </select>
      <select
        id={`${idPrefix}-size`}
        aria-label="Shadowbox size"
        value={value?.size ?? ''}
        onChange={(e) => update({ size: (e.target.value || undefined) as LightboxFit['size'] })}
      >
        <option value="">Size: Default</option>
        <option value="fill">Size: Fill width</option>
        <option value="fit">Size: Fit to screen</option>
      </select>
      <select
        id={`${idPrefix}-overflow`}
        aria-label="Shadowbox overflow"
        value={value?.overflow ?? ''}
        onChange={(e) =>
          update({ overflow: (e.target.value || undefined) as LightboxFit['overflow'] })
        }
      >
        <option value="">Overflow: Default</option>
        <option value="scroll">Overflow: Scroll</option>
        <option value="hidden">Overflow: Hidden</option>
      </select>
    </div>
  );
}
