import React from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2, Image as ImageIcon } from 'lucide-react';

interface FullscreenImageViewerProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onSetAsCover?: (imageUrl: string) => void;
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
  activeCoverUrl,
  recipeTitle,
}) => {
  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];
  const hasMultiple = images.length > 1;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectIndex((currentIndex - 1 + images.length) % images.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectIndex((currentIndex + 1) % images.length);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 bg-black/95 flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-0.5">
          <h4 className="text-sm sm:text-base font-semibold truncate max-w-[260px] sm:max-w-md">
            {recipeTitle}
          </h4>
          {hasMultiple && (
            <p className="text-xs text-stone-400">
              Bild {currentIndex + 1} von {images.length}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onSetAsCover && (
            <button
              type="button"
              onClick={() => onSetAsCover(currentImage)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#4A7856]" />
              <span>Als Titelbild setzen</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
            aria-label="Schließen"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image Center Stage */}
      <div
        className="relative flex-1 flex items-center justify-center my-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {hasMultiple && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-20 w-12 h-12 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer"
            aria-label="Vorheriges Bild"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <img
          src={currentImage}
          alt={`${recipeTitle} - Foto ${currentIndex + 1}`}
          referrerPolicy="no-referrer"
          className="max-h-[75vh] max-w-full w-auto object-contain rounded-xl shadow-2xl transition-transform duration-200"
        />

        {hasMultiple && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-20 w-12 h-12 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer"
            aria-label="Nächstes Bild"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Thumbnail Bar / Dots */}
      {hasMultiple && (
        <div
          className="flex items-center justify-center gap-2 pb-2 z-10 overflow-x-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                idx === currentIndex
                  ? 'border-[#4A7856] scale-110'
                  : 'border-white/30 opacity-60 hover:opacity-100'
              }`}
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
      )}
    </div>
  );
};
