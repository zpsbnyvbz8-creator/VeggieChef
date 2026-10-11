import React, { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';

export interface HeartButtonProps {
  isFavorite: boolean;
  onToggle: (e: React.MouseEvent) => void;
  variant?: 'on-image' | 'on-surface';
  title?: string;
  ariaLabel?: string;
  className?: string;
  id?: string;
}

export const HeartButton: React.FC<HeartButtonProps> = ({
  isFavorite,
  onToggle,
  variant = 'on-image',
  title,
  ariaLabel,
  className = '',
  id,
}) => {
  const [isPulsing, setIsPulsing] = useState(false);
  const prevFavoriteRef = useRef(isFavorite);

  useEffect(() => {
    if (!prevFavoriteRef.current && isFavorite) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 300);
      prevFavoriteRef.current = isFavorite;
      return () => clearTimeout(timer);
    }
    prevFavoriteRef.current = isFavorite;
  }, [isFavorite]);

  const defaultLabel = isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen';
  const label = ariaLabel || defaultLabel;

  const variantCircleClasses =
    variant === 'on-surface'
      ? 'bg-card/95 hover:bg-accent-tint border border-border text-text-muted'
      : 'bg-black/35 hover:bg-black/55 backdrop-blur-md border border-white/10 text-on-accent';

  return (
    <button
      id={id}
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(e);
      }}
      aria-pressed={isFavorite}
      aria-label={label}
      title={title ?? label}
      className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-90 ${className}`}
    >
      <span
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${variantCircleClasses}`}
      >
        <Heart
          className={`w-[22px] h-[22px] transition-colors ${
            isPulsing ? 'vc-icon-pulse' : ''
          } ${isFavorite ? 'fill-[#E74C3C] text-[#E74C3C]' : variant === 'on-surface' ? 'text-text-muted' : 'text-on-accent'}`}
          aria-hidden="true"
        />
      </span>
    </button>
  );
};

export default HeartButton;
