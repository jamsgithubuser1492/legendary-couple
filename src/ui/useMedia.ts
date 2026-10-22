import { useEffect, useState } from 'react';

/** True while the media query matches, for layouts that change structure (not just spacing) on a desktop window. */
export function useMedia(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [on, setOn] = useState(get);
  useEffect(() => {
    const m = window.matchMedia(query);
    const f = () => setOn(m.matches);
    f();
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, [query]);
  return on;
}

/** A wide window: two column layouts. */
export const useWide = () => useMedia('(min-width: 1024px)');
