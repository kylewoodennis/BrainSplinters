import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { LightboxFit } from '@brainsplinters/shared';

export type LightboxImage = {
  url: string;
  alt?: string;
  variant?: 'portfolio';
  fit?: LightboxFit;
};

type LightboxState = { images: LightboxImage[]; index: number } | null;

type OpenLightbox = (images: LightboxImage[], index?: number) => void;

const LightboxContext = createContext<OpenLightbox | null>(null);

/** Returns a function to open the shadowbox with a set of images, starting at `index`. */
export function useLightbox(): OpenLightbox {
  const ctx = useContext(LightboxContext);
  if (!ctx) throw new Error('useLightbox must be used within a LightboxProvider');
  return ctx;
}

export function LightboxProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, setState] = useState<LightboxState>(null);

  const open = useCallback<OpenLightbox>((images, index = 0) => {
    if (images.length === 0) return;
    setState({ images, index });
  }, []);
  const close = useCallback(() => setState(null), []);
  const showPrev = useCallback(() => {
    setState((s) => (s ? { ...s, index: (s.index - 1 + s.images.length) % s.images.length } : s));
  }, []);
  const showNext = useCallback(() => {
    setState((s) => (s ? { ...s, index: (s.index + 1) % s.images.length } : s));
  }, []);

  useEffect(() => {
    if (!state) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') showPrev();
      else if (e.key === 'ArrowRight') showNext();
    }
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [state, close, showPrev, showNext]);

  return (
    <LightboxContext.Provider value={open}>
      {children}
      {state && (
        <LightboxOverlay
          images={state.images}
          index={state.index}
          onClose={close}
          onPrev={showPrev}
          onNext={showNext}
        />
      )}
    </LightboxContext.Provider>
  );
}

function LightboxOverlay({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}): React.JSX.Element {
  const current = images[index] ?? images[0];
  const wrapRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setShowScrollHint(false);
    setIsWide(false);
    wrapRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [index]);

  function checkOverflow() {
    const el = wrapRef.current;
    if (!el) return;
    setShowScrollHint(el.scrollHeight > el.clientHeight + 1);
  }

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    setIsWide(img.naturalWidth >= img.naturalHeight);
    checkOverflow();
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (images.length < 2 || Math.abs(delta) < 40) return;
    if (delta > 0) onPrev();
    else onNext();
  }

  if (!current) return <></>;

  const isPortfolio = current.variant === 'portfolio';
  const align = current.fit?.align ?? (isPortfolio ? (isWide ? 'center' : 'top') : 'center');
  const size = current.fit?.size ?? 'fill';
  const overflow = current.fit?.overflow ?? 'scroll';

  return (
    <div
      className={`lightbox-overlay${align === 'top' ? ' lightbox-overlay--top' : ''}`}
      onClick={onClose}
    >
      <button className="lightbox-close" onClick={onClose} type="button" aria-label="Close">
        ✕
      </button>

      {images.length > 1 && (
        <button
          className="lightbox-arrow lightbox-arrow-left"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          type="button"
          aria-label="Previous image"
        >
          ‹
        </button>
      )}

      <div
        className={`lightbox-image-wrap${size === 'fill' && align === 'top' ? ' lightbox-image-wrap--portfolio' : ''}${size === 'fit' ? ' lightbox-image-wrap--fit' : ''}${overflow === 'hidden' ? ' lightbox-image-wrap--overflow-hidden' : ''}`}
        ref={wrapRef}
        onClick={(e) => e.stopPropagation()}
        onScroll={() => setShowScrollHint(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          key={current.url}
          src={current.url}
          alt={current.alt ?? ''}
          className={`lightbox-image${size === 'fit' ? ' lightbox-image--fit' : ''}`}
          onLoad={handleImageLoad}
        />
        {showScrollHint && size === 'fill' && (
          <div className="lightbox-scroll-hint">Scroll for more ⌄</div>
        )}
      </div>

      {images.length > 1 && (
        <button
          className="lightbox-arrow lightbox-arrow-right"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          type="button"
          aria-label="Next image"
        >
          ›
        </button>
      )}

      {images.length > 1 && (
        <div className="lightbox-counter" aria-live="polite">
          {index + 1} / {images.length}
          <span className="lightbox-swipe-text"> &middot; swipe to browse</span>
        </div>
      )}
    </div>
  );
}
