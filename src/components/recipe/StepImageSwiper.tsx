import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface StepImageSwiperProps {
  stepNumber: number;
  images: string[];
  stepTitle?: string;
  isManagingPhotos: boolean;
  onRemovePhoto: (stepNumber: number, imageIndex: number) => void;
  onOpenLightbox: (images: string[], initialIndex: number) => void;
}

export const StepImageSwiper: React.FC<StepImageSwiperProps> = ({
  stepNumber,
  images,
  stepTitle,
  isManagingPhotos,
  onRemovePhoto,
  onOpenLightbox,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  // Safe index clamp if an image was deleted
  const safeIndex = Math.min(currentIndex, images.length - 1);
  const activeImage = images[safeIndex];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 40;

    if (distance > minSwipeDistance) {
      // Swiped left -> next photo
      setCurrentIndex((prev) => (prev + 1) % images.length);
    } else if (distance < -minSwipeDistance) {
      // Swiped right -> prev photo
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemovePhoto(stepNumber, safeIndex);
    if (safeIndex >= images.length - 1) {
      setCurrentIndex(Math.max(0, images.length - 2));
    }
  };

  return (
    <div className="relative pt-2">
      <div
        className="relative w-full h-48 sm:h-56 md:h-64 rounded-2xl overflow-hidden bg-stone-900 border border-border shadow-xs cursor-pointer group select-none touch-pan-y"
        onClick={() => onOpenLightbox(images, safeIndex)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Active Step Image */}
        <img
          src={activeImage}
          alt={stepTitle || `Schritt ${stepNumber} Foto ${safeIndex + 1}`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
        />

        {/* Soft edge gradient for high readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25 pointer-events-none" />

        {/* Delete Photo Button in Manage Mode */}
        {isManagingPhotos && (
          <button
            type="button"
            onClick={handleDelete}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 hover:bg-rose-600 text-on-accent flex items-center justify-center backdrop-blur-md transition-all shadow-md cursor-pointer z-20 active:scale-95"
            title="Dieses Schritt-Foto löschen"
            aria-label="Foto löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Pagination Dots at Bottom Center - Clean & Minimal */}
        {images.length > 1 && (
          <div
            className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  safeIndex === idx ? 'w-4 bg-card shadow-xs' : 'w-1.5 bg-card/45 hover:bg-card/80'
                }`}
                aria-label={`Schritt-Foto ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
