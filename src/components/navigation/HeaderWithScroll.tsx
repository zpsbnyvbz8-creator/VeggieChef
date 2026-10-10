import React, { useEffect, useState } from 'react';
import { useScrollDirection } from '../../utils/hooks/useScrollDirection';
import { Header } from '../Header';

/**
 * Fixiert den Header oben und blendet ihn beim Scrollen nach unten aus
 * (translateY(-100%) + opacity), < 1024 px; rollt beim Hochscrollen wieder ein.
 * Ab 1024 px bleibt er immer sichtbar (mit Trennlinie statt Fade).
 * Bei offener Suche oder offenem Menü ist er „gepinnt" und wird nicht ausgeblendet.
 */
export const HeaderWithScroll: React.FC = () => {
  const direction = useScrollDirection({ threshold: 8 });
  const [isVisible, setIsVisible] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [hideEnabled, setHideEnabled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const update = () => setHideEnabled(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (pinned || !hideEnabled || window.scrollY < 8) {
      setIsVisible(true);
      return;
    }
    if (direction === 'down') {
      setIsVisible(false);
    } else if (direction === 'up') {
      setIsVisible(true);
    }
  }, [direction, pinned, hideEnabled]);

  const hidden = hideEnabled && !pinned && !isVisible;

  // Dynamische theme-color: sichtbarer Header → Apricot, sonst Seitenfarbe.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', hidden ? '#F4F1EA' : '#F3DDBC');
  }, [hidden]);

  return (
    <>
      {/* PWA-Statusstreifen (bleibt beim Ausblenden sichtbar) */}
      <div className="vc-status-strip" aria-hidden="true" />

      <div
        className={`fixed left-0 right-0 top-0 z-40 transition-[transform,opacity,visibility] duration-200 ease-out will-change-transform ${
          hidden ? '-translate-y-full opacity-0 invisible' : 'translate-y-0 opacity-100 visible'
        }`}
      >
        <Header onPinnedChange={setPinned} />
      </div>
    </>
  );
};

export default HeaderWithScroll;