'use client';

import { useEffect, useState } from 'react';

export function MiddlewareVariantPill() {
  const [variant, setVariant] = useState<string>('A');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryVariant = params.get('variant')?.toUpperCase();
    if (queryVariant === 'A' || queryVariant === 'B') {
      setVariant(queryVariant);
      return;
    }

    const match = document.cookie.match(/(?:^|;\s*)edgepulse_variant=([AB])/i);
    if (match?.[1]) {
      setVariant(match[1].toUpperCase());
    }
  }, []);

  return (
    <span
      title="Active Edge Middleware variant cookie/override (x-edgepulse-variant)"
      className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-indigo-300"
    >
      Variant {variant}
    </span>
  );
}
