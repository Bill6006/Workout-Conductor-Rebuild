import { useEffect, useState } from 'react';

const query = '(prefers-reduced-motion: reduce)';

function currentPreference() {
  return (
    typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches)
  );
}

export function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(currentPreference);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(query);
    if (!mediaQuery) return;

    const updatePreference = (event: MediaQueryListEvent | MediaQueryList) => {
      setReducedMotion(event.matches);
    };
    updatePreference(mediaQuery);
    mediaQuery.addEventListener?.('change', updatePreference);
    return () => mediaQuery.removeEventListener?.('change', updatePreference);
  }, []);

  return reducedMotion;
}
