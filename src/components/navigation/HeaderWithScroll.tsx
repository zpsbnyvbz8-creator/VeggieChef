import React, { useEffect, useState } from 'react';
import { useScrollLinkedHeader } from '../../utils/hooks/useScrollLinkedHeader';
import { Header } from '../Header';

/**
 * Fixiert den Header oben und fährt ihn Safari-artig scroll-gekoppelt ein/aus
 * (transform + opacity, < 1024 px; ab 1024 px bleibt er immer sichtbar).
 * Bei offener Suche oder offenem Menü ist er „gepinnt" und bleibt eingefahren.
 */
export const HeaderWithScroll: React.FC = () => {
  const [hideEnabled, setHideEnabled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const update = () => setHideEnabled(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const [pinned, setPinned] = useState(false);
  const { wrapperRef, isHidden } = useScrollLinkedHeader({ enabled: hideEnabled, pinned });

  // Dynamische theme-color: sichtbarer Header → Apricot, sonst Seitenfarbe.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', isHidden ? '#F4F1EA' : '#F3DDBC');
  }, [isHidden]);

  return (
    <>
      {/* PWA-Statusstreifen (bleibt beim Ausblenden sichtbar) */}
      <div className="vc-status-strip" aria-hidden="true" />

      <div ref={wrapperRef} className="fixed left-0 right-0 top-0 z-40">
        <Header onPinnedChange={setPinned} />
      </div>
    </>
  );
};

export default HeaderWithScroll;