import { useEffect, useRef, useState } from 'react';

export type ScrollDirection = 'up' | 'down' | 'none';

export interface UseScrollDirectionOptions {
  threshold?: number;
  enabled?: boolean;
}

export function useScrollDirection(options: UseScrollDirectionOptions = {}): ScrollDirection {
  const { threshold = 8, enabled = true } = options;
  const [direction, setDirection] = useState<ScrollDirection>('none');
  const lastYRef = useRef<number>(typeof window !== 'undefined' ? window.scrollY : 0);
  const tickingRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastYRef.current;

        if (Math.abs(delta) > threshold) {
          if (delta > 0 && currentY > 0) {
            setDirection('down');
          } else if (delta < 0) {
            setDirection('up');
          }
          lastYRef.current = currentY;
        }
        tickingRef.current = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [enabled, threshold]);

  return direction;
}