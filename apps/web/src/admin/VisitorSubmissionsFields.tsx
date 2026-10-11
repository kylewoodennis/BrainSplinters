export type VisitorFieldFormValue = {
  enabled: boolean;
  required: boolean;
};

export type VisitorSubmissionsFormValues = {
  enabled: boolean;
  prompt: string;
  firstName: VisitorFieldFormValue;
  lastName: VisitorFieldFormValue;
  email: VisitorFieldFormValue;
  phone: VisitorFieldFormValue;
  allowAnonymous: boolean;
  minWordCount: number;
  maxWordCount: number;
  minImages: number;
  maxImages: number;
  singleImageContainerFit: ContainerFit | undefined;
};

export const DEFAULT_VISITOR_FIELD: VisitorFieldFormValue = { enabled: false, required: false };

export const DEFAULT_VISITOR_SUBMISSIONS_FORM_VALUES: VisitorSubmissionsFormValues = {
  enabled: false,
  prompt: '',
  firstName: DEFAULT_VISITOR_FIELD,
  lastName: DEFAULT_VISITOR_FIELD,
  email: DEFAULT_VISITOR_FIELD,
  phone: DEFAULT_VISITOR_FIELD,
  allowAnonymous: false,
  minWordCount: 0,
  maxWordCount: 0,
  minImages: 0,
  maxImages: 0,
  singleImageContainerFit: undefined,
};

import type { ContainerFit } from '@brainsplinters/shared';
import { ContainerFitControls } from './ContainerFitControls.js';

type PersonalFieldKey = 'firstName' | 'lastName' | 'email' | 'phone';

const PERSONAL_FIELDS: { key: PersonalFieldKey; label: string }[] = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
];

/**
 * Admin controls, shown inside the Splinter form, for configuring the
 * public visitor-submission form: which personal-info fields to collect
 * (and whether each is required), an optional writing prompt, whether to
 * offer an "stay anonymous" option, and min/max word/image counts.
 */
export function VisitorSubmissionsFields({
  value,
  onChange,
}: {
  value: VisitorSubmissionsFormValues;
  onChange: (value: VisitorSubmissionsFormValues) => void;
}): React.JSX.Element {
  function update(patch: Partial<VisitorSubmissionsFormValues>) {
    onChange({ ...value, ...patch });
  }

  function updateField(key: PersonalFieldKey, patch: Partial<VisitorFieldFormValue>) {
    update({ [key]: { ...value[key], ...patch } });
  }

  return (
    <div className="form-field">
      <label>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
        />{' '}
        Enable visitor submissions
      </label>

      {value.enabled && (
        <div className="visitor-submissions-config">
          <div className="form-field">
            <label htmlFor="vs-prompt">Prompt shown to visitors</label>
            <textarea
              id="vs-prompt"
              rows={3}
              value={value.prompt}
              onChange={(e) => update({ prompt: e.target.value })}
              placeholder="Tell us about your experience with…"
            />
          </div>

          <div className="form-field">
            <span className="lightbox-fit-label">Fields to collect:</span>
            {PERSONAL_FIELDS.map(({ key, label }) => (
              <div className="visitor-field-row" key={key}>
                <label>
                  <input
                    type="checkbox"
                    checked={value[key].enabled}
                    onChange={(e) => updateField(key, { enabled: e.target.checked })}
                  />{' '}
                  {label}
                </label>
                <label className={value[key].enabled ? '' : 'is-disabled'}>
                  <input
                    type="checkbox"
                    disabled={!value[key].enabled}
                    checked={value[key].required}
                    onChange={(e) => updateField(key, { required: e.target.checked })}
                  />{' '}
                  Required
                </label>
              </div>
            ))}
          </div>

          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={value.allowAnonymous}
                onChange={(e) => update({ allowAnonymous: e.target.checked })}
              />{' '}
              Allow visitors to submit anonymously
            </label>
          </div>

          <div className="form-field">
            <span className="lightbox-fit-label">Word count (0 = no limit):</span>
            <div className="visitor-field-row">
              <label htmlFor="vs-min-words">Min</label>
              <input
                id="vs-min-words"
                type="number"
                min={0}
                value={value.minWordCount}
                onChange={(e) => update({ minWordCount: Math.max(0, Number(e.target.value)) })}
              />
              <label htmlFor="vs-max-words">Max</label>
              <input
                id="vs-max-words"
                type="number"
                min={0}
                value={value.maxWordCount}
                onChange={(e) => update({ maxWordCount: Math.max(0, Number(e.target.value)) })}
              />
            </div>
          </div>

          <div className="form-field">
            <span className="lightbox-fit-label">Image count (0 = no limit):</span>
            <div className="visitor-field-row">
              <label htmlFor="vs-min-images">Min</label>
              <input
                id="vs-min-images"
                type="number"
                min={0}
                value={value.minImages}
                onChange={(e) => update({ minImages: Math.max(0, Number(e.target.value)) })}
              />
              <label htmlFor="vs-max-images">Max</label>
              <input
                id="vs-max-images"
                type="number"
                min={0}
                value={value.maxImages}
                onChange={(e) => update({ maxImages: Math.max(0, Number(e.target.value)) })}
              />
            </div>
          </div>

          <div className="form-field">
            <ContainerFitControls
              idPrefix="vs-single-image"
              value={value.singleImageContainerFit}
              onChange={(fit) => update({ singleImageContainerFit: fit })}
            />
            <p className="empty-state">Applies when a submission includes exactly one image.</p>
          </div>
        </div>
      )}
    </div>
  );
}
