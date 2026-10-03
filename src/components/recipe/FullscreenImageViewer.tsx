import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2, Trash2 } from 'lucide-react';

interface FullscreenImageViewerProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onSetAsCover?: (imageUrl: string) => void;
  onDeletePhoto?: (imageUrl: string) => void;
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

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];
  const hasMultiple = images.length > 1;
  const isCurrentCover = activeCoverUrl === currentImage;

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onSelectIndex((currentIndex - 1 + images.length) % images.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onSelectIndex((currentIndex + 1) % images.length);
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 bg-black flex items-center justify-center overflow-hidden select-none animate-in fade-in duration-200"
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
          className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-white shadow-2xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title & Index */}
          <div className="min-w-0 pr-2">
            <h4 className="text-sm font-semibold truncate text-white/90">
              {recipeTitle}
            </h4>
            {hasMultiple && (
              <p className="text-[11px] text-white/60">
                {currentIndex + 1} von {images.length}
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all cursor-pointer touch-manipulation active:scale-95 ${
                  isCurrentCover
                    ? 'bg-[#4A7856]/40 text-emerald-200 border border-[#4A7856]/50 cursor-default'
                    : 'bg-white/15 hover:bg-white/25 text-white border border-white/10'
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
                onClick={() => onDeletePhoto(currentImage)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all cursor-pointer touch-manipulation active:scale-95 bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-400/30"
                title="Dieses Foto löschen"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                <span>Löschen</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer touch-manipulation active:scale-95"
              aria-label="Detailansicht schließen"
            >
              <X className="w-5 h-5" />
            </button>
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
              className={`hidden md:flex absolute left-4 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 text-white items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer shadow-lg active:scale-95 ${
                showControls ? 'opacity-90' : 'opacity-0 pointer-events-none'
              }`}
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              className={`hidden md:flex absolute right-4 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 text-white items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer shadow-lg active:scale-95 ${
                showControls ? 'opacity-90' : 'opacity-0 pointer-events-none'
              }`}
              aria-label="Nächstes Bild"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        <img
          src={currentImage}
          alt={`${recipeTitle} Foto ${currentIndex + 1}`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain max-h-screen max-w-screen transition-transform duration-200"
        />
      </div>

      {/* 3. BOTTOM BAR - LIQUID GLASS THUMBNAILS / DOTS */}
      {hasMultiple && (
        <footer
          className={`fixed bottom-0 inset-x-0 p-3 sm:p-5 z-20 transition-all duration-300 pointer-events-none flex justify-center ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div
            className="flex items-center gap-2 p-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-white shadow-2xl pointer-events-auto max-w-sm sm:max-w-md overflow-x-auto scrollbar-none"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectIndex(idx)}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                  idx === currentIndex
                    ? 'border-[#4A7856] ring-2 ring-[#4A7856]/40 scale-105'
                    : 'border-white/20 opacity-50 hover:opacity-90'
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
    </div>
  );
};
