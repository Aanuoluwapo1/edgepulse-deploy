'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export const VARIANT_CHANGE_EVENT = 'edgepulse:variant-change';

function readActiveVariant(): 'A' | 'B' {
  if (typeof window === 'undefined') {
    return 'A';
  }
  const params = new URLSearchParams(window.location.search);
  const queryVariant = params.get('variant')?.toUpperCase();
  if (queryVariant === 'A' || queryVariant === 'B') {
    return queryVariant;
  }

  const match = document.cookie.match(/(?:^|;\s*)edgepulse_variant=([AB])/i);
  if (match?.[1]) {
    return match[1].toUpperCase() as 'A' | 'B';
  }

  return 'A';
}

export function MiddlewareVariantPill() {
  const pathname = usePathname();
  const [variant, setVariant] = useState<'A' | 'B'>('A');

  const syncVariant = useCallback(() => {
    setVariant(readActiveVariant());
  }, []);

  useEffect(() => {
    syncVariant();
  }, [pathname, syncVariant]);

  useEffect(() => {
    const handleCustomChange = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail?.toUpperCase();
      if (detail === 'A' || detail === 'B') {
        setVariant(detail);
      } else {
        syncVariant();
      }
    };

    window.addEventListener(VARIANT_CHANGE_EVENT, handleCustomChange);
    return () => {
      window.removeEventListener(VARIANT_CHANGE_EVENT, handleCustomChange);
    };
  }, [syncVariant]);

  return (
    <span
      title="Active Edge Middleware variant cookie/override (x-edgepulse-variant)"
      className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-indigo-300"
    >
      Variant {variant}
    </span>
  );
}
