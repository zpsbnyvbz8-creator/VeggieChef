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
  size?: 'md' | 'lg';
}

export const HeartButton: React.FC<HeartButtonProps> = ({
  isFavorite,
  onToggle,
  variant = 'on-image',
  title,
  ariaLabel,
  className = '',
  id,
  size = 'md',
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
      ? 'bg-accent-tint hover:bg-accent-tint border border-border text-text-main shadow-2xs'
      : 'bg-black/35 hover:bg-black/55 backdrop-blur-md border border-white/10 text-on-accent shadow-md';

  const isLg = size === 'lg';

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
      className={`${
        isLg
          ? 'w-12 h-12 min-w-[48px] min-h-[48px]'
          : 'w-11 h-11 min-w-[44px] min-h-[44px]'
      } rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-90 ${className}`}
    >
      <span
        className={`${
          isLg
            ? 'w-12 h-12 min-w-[48px] min-h-[48px]'
            : 'w-11 h-11 min-w-[44px] min-h-[44px]'
        } rounded-full flex items-center justify-center transition-colors ${variantCircleClasses}`}
      >
        <Heart
          className={`${
            isLg ? 'w-[22px] h-[22px]' : 'w-5 h-5'
          } transition-colors ${
            isPulsing ? 'vc-icon-pulse' : ''
          } ${isFavorite ? 'fill-favorite text-favorite' : variant === 'on-surface' ? 'text-text-main' : 'text-on-accent'}`}
          aria-hidden="true"
        />
      </span>
    </button>
  );
};

export default HeartButton;
