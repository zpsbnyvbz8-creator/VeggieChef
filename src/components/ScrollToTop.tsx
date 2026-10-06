import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** Routes whose list position is restored by the page itself when returning via Back/Forward. */
const SELF_RESTORING_ROUTES = new Set(['/', '/favorites']);

/**
 * ScrollToTop ensures the window scrolls to top on every route change (pathname) –
 * except when going Back/Forward to a list that restores its own scroll position.
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType === 'POP' && SELF_RESTORING_ROUTES.has(pathname)) return;
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
};

export default ScrollToTop;
