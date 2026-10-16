import React, { useEffect, useRef, useState } from 'react';

interface AtmosphericBackgroundProps {
  /** The current cover image URL to display and blur */
  imageUrl: string;
  /** Whether at least one swipe has happened (applies 90ms fade delay for sync) */
  hasSwipedOnce: boolean;
}

interface ImageLayer {
  id: number;
  url: string;
  visible: boolean;
}

/**
 * Atmosphärischer Vollbild-Hintergrund für den Entdecken- und Swipe-Modus:
 * - Streckt das aktuelle Rezeptbild über den Bildschirm und zeichnet es extrem weich.
 * - Mehrstufige Schutzschicht für garantiertes Kontrastverhältnis > 4,5:1 (selbst bei hellen Fotos).
 * - Bleibt während des Drag-Zustands starr an Ort und Stelle.
 * - Blendet erst nach dem Loslassen (90ms Delay) per weichem Crossfade in die neuen Farben über.
 */
export const AtmosphericBackground: React.FC<AtmosphericBackgroundProps> = ({
  imageUrl,
  hasSwipedOnce,
}) => {
  const [layers, setLayers] = useState<ImageLayer[]>([
    { id: 0, url: imageUrl, visible: true },
  ]);
  const counterRef = useRef(1);

  useEffect(() => {
    if (!imageUrl) return;

    setLayers((prev) => {
      const currentTop = prev[prev.length - 1];
      if (currentTop && currentTop.url === imageUrl) return prev;
      const nextId = counterRef.current++;
      return [...prev.slice(-2), { id: nextId, url: imageUrl, visible: false }];
    });

    // Zeitversetzter Start des Farbwechsels (ca. 90ms nach Karten-Impuls, 16ms beim Start)
    const fadeDelay = hasSwipedOnce ? 90 : 16;
    const timer = window.setTimeout(() => {
      setLayers((prev) =>
        prev.map((layer, idx) =>
          idx === prev.length - 1 ? { ...layer, visible: true } : layer
        )
      );
    }, fadeDelay);

    // Vorherige Layer nach Abschluss des Crossfades aufräumen
    const cleanupTimer = window.setTimeout(() => {
      setLayers((prev) => (prev.length > 1 ? [prev[prev.length - 1]] : prev));
    }, 950);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(cleanupTimer);
    };
  }, [imageUrl, hasSwipedOnce]);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Statische Farb-Basis im satten, dunklen Nachtschiefer-Ton (#141210) */}
      <div className="absolute inset-0 bg-[#141210]" />

      {/* Weichgezeichnete Bild-Layer mit sanftem Crossfade an Ort und Stelle */}
      {layers.map((layer) => (
        <div
          key={layer.id}
          style={{
            opacity: layer.visible ? 1 : 0,
            transition: 'opacity 780ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          className="absolute inset-0 w-full h-full will-change-[opacity]"
        >
          {layer.url ? (
            <img
              src={layer.url}
              alt=""
              className="w-full h-full object-cover scale-[1.28] blur-[68px] sm:blur-[84px] saturate-[1.45] brightness-[0.85] transform-gpu"
            />
          ) : null}
        </div>
      ))}

      {/* Zwingende Schutzschicht (Kontrast-Garantie > 4,5:1 selbst bei schneeweißen Fotos) */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-2xl" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(20, 18, 16, 0.28) 0%, rgba(16, 14, 12, 0.78) 100%)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
    </div>
  );
};
