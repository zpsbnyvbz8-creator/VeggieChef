import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CloseButton } from '../ui/CloseButton';

interface FullscreenImageViewerProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onSetAsCover?: (imageUrl: string) => void;
  onDeletePhoto?: (imageUrl: string, index: number) => void;
  activeCoverUrl?: string;
  recipeTitle: string;
}

export const FullscreenImageViewer: React.FC<FullscreenImageViewerProps> = ({
  isOpen,
  images,
  currentIndex,
  onClose,
  onSelectIndex,
  onSetAsCover,
  onDeletePhoto,
  activeCoverUrl,
  recipeTitle,
}) => {
  const [showControls, setShowControls] = useState(true);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [hasSwiped, setHasSwiped] = useState(false);

  // Reset controls visibility whenever modal opens or index changes
  useEffect(() => {
    if (isOpen) {
      setShowControls(true);
    }
  }, [isOpen]);

  const safeIndex = images.length > 0 ? Math.min(currentIndex, images.length - 1) : 0;
  const currentImage = images[safeIndex] || images[0];
  const hasMultiple = images.length > 1;
  const isCurrentCover = Boolean(activeCoverUrl && activeCoverUrl === currentImage);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (images.length <= 1) return;
    onSelectIndex((safeIndex - 1 + images.length) % images.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (images.length <= 1) return;
    onSelectIndex((safeIndex + 1) % images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setHasSwiped(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance && hasMultiple) {
      setHasSwiped(true);
      handleNext();
    } else if (distance < -minSwipeDistance && hasMultiple) {
      setHasSwiped(true);
      handlePrev();
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handleStageClick = () => {
    if (!hasSwiped) {
      // Toggle controls on tap/click
      setShowControls((prev) => !prev);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && images.length > 0 && (
        <motion.div
          key="fullscreen-image-viewer"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-60 bg-black flex items-center justify-center overflow-hidden select-none"
          onClick={handleStageClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 1. TOP BAR - LIQUID GLASS CAPSULE */}
          <header
            className={`fixed top-0 inset-x-0 p-3 sm:p-5 z-20 transition-all duration-300 pointer-events-none ${
              showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
          >
            <div
              className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-on-accent/10 text-on-accent shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Title & Index */}
              <div className="min-w-0 pr-2">
                <h4 className="text-sm font-semibold truncate text-on-accent/90">
                  {recipeTitle}
                </h4>
                {hasMultiple && (
                  <p className="text-[11px] text-on-accent/60">
                    {safeIndex + 1} von {images.length}
                  </p>
                )}
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {onSetAsCover && (
                  <button
                    type="button"
                    onClick={() => onSetAsCover(currentImage)}
                    disabled={isCurrentCover}
                    className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-full text-xs font-semibold backdrop-blur-md transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      isCurrentCover
                        ? 'bg-accent/40 text-emerald-200 border border-accent/50 cursor-default'
                        : 'bg-card/15 hover:bg-card/25 text-on-accent border border-on-accent/10'
                    }`}
                    title={isCurrentCover ? 'Bereits als Titelbild aktiv' : 'Als Titelbild setzen'}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isCurrentCover ? 'text-emerald-400' : 'text-emerald-300'}`} />
                    <span>{isCurrentCover ? 'Titelbild' : 'Als Titelbild'}</span>
                  </button>
                )}

                {onDeletePhoto && (
                  <button
                    type="button"
                    onClick={() => onDeletePhoto(currentImage, safeIndex)}
                    className="flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-full text-xs font-semibold backdrop-blur-md transition-all cursor-pointer touch-manipulation active:scale-95 bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-400/30"
                    title="Dieses Foto löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                    <span>Löschen</span>
                  </button>
                )}

                <CloseButton
                  onClick={onClose}
                  ariaLabel="Detailansicht schließen"
                />
              </div>
            </div>
          </header>

          {/* 2. FULLSCREEN IMMERSIVE IMAGE */}
          <div className="relative w-full h-full flex items-center justify-center p-0 sm:p-4">
            {/* Desktop Side Navigation Arrows (strictly hidden on mobile, swipe gesture only on mobile) */}
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className={`hidden md:flex absolute left-4 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 text-on-accent items-center justify-center backdrop-blur-md border border-on-accent/10 transition-all cursor-pointer shadow-lg active:scale-95 ${
                    showControls ? 'opacity-90' : 'opacity-0 pointer-events-none'
                  }`}
                  aria-label="Vorheriges Bild"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className={`hidden md:flex absolute right-4 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 text-on-accent items-center justify-center backdrop-blur-md border border-on-accent/10 transition-all cursor-pointer shadow-lg active:scale-95 ${
                    showControls ? 'opacity-90' : 'opacity-0 pointer-events-none'
                  }`}
                  aria-label="Nächstes Bild"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={currentImage}
                src={currentImage}
                alt={`${recipeTitle} Foto ${safeIndex + 1}`}
                referrerPolicy="no-referrer"
                initial={{ opacity: 0.7, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0.7, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="w-full h-full object-contain max-h-screen max-w-screen"
              />
            </AnimatePresence>
          </div>

          {/* 3. BOTTOM BAR - LIQUID GLASS THUMBNAILS / DOTS */}
          {hasMultiple && (
            <footer
              className={`fixed bottom-0 inset-x-0 p-3 sm:p-5 z-20 transition-all duration-300 pointer-events-none flex justify-center ${
                showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <div
                className="flex items-center gap-2 p-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-on-accent/10 text-on-accent shadow-2xl pointer-events-auto max-w-sm sm:max-w-md overflow-x-auto scrollbar-none"
                onClick={(e) => e.stopPropagation()}
              >
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectIndex(idx)}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      idx === safeIndex
                        ? 'border-accent ring-2 ring-accent/40 scale-105'
                        : 'border-on-accent/20 opacity-50 hover:opacity-90'
                    }`}
                    aria-label={`Foto ${idx + 1} ansehen`}
                  >
                    <img
                      src={img}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </footer>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
