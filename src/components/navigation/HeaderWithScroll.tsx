import React, { useEffect, useState } from 'react';
import { useScrollDirection } from '../../utils/hooks/useScrollDirection';
import { Header } from '../Header';

interface HeaderWithScrollProps {
  /** Opt-in fallback: render the compact tab row inside the header (instead of relying on the bottom nav). */
  useTopTabs?: boolean;
}

/**
 * Wraps the Header and slides it away on scroll-down / back in on scroll-up
 * (Safari-style). Uses transform only, so there is no layout jump.
 */
export const HeaderWithScroll: React.FC<HeaderWithScrollProps> = ({ useTopTabs = false }) => {
  const direction = useScrollDirection({ threshold: 8 });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (direction === 'down') {
      setIsVisible(false);
    } else if (direction === 'up') {
      setIsVisible(true);
    }
  }, [direction]);

  return (
    <div
      className={`fixed left-0 right-0 top-0 z-40 transition-transform duration-200 ease-out will-change-transform ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <Header useTopTabs={useTopTabs} />
    </div>
  );
};

export default HeaderWithScroll;
