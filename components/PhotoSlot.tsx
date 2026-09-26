'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Shows /public/method/<file> when it exists. Until a photo is uploaded,
 * it shows a quiet tinted panel instead of a broken image.
 */
export default function PhotoSlot({ file, alt, ratio = '4 / 3', className = '' }: { file: string; alt: string; ratio?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // The image may fail before the page is interactive, so check once on mount too.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <figure className={`photo ${className}`} style={{ aspectRatio: ratio }}>
      {failed ? (
        <div className="photo-empty" role="img" aria-label={alt}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" />
          </svg>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={img} src={`/method/${file}`} alt={alt} onError={() => setFailed(true)} />
      )}
    </figure>
  );
}
