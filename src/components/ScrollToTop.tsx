'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/** Routes whose list position is restored by the page itself when returning via Back/Forward. */
const SELF_RESTORING_ROUTES = new Set(['/', '/favorites']);

/**
 * ScrollToTop ensures the window scrolls to top on every route change (pathname) –
 * except when going Back/Forward to a list that restores its own scroll position.
 */
export const ScrollToTop = () => {
  const pathname = usePathname() || '/';
  const isPopRef = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      isPopRef.current = true;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const wasPop = isPopRef.current;
    isPopRef.current = false;
    if (wasPop && SELF_RESTORING_ROUTES.has(pathname)) return;
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
