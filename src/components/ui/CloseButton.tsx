import React from 'react';
import { X } from 'lucide-react';

export interface CloseButtonProps {
  onClick: (e: React.MouseEvent) => void;
  ariaLabel?: string;
  title?: string;
  className?: string;
  id?: string;
  size?: 'md' | 'lg';
}

export const CloseButton: React.FC<CloseButtonProps> = ({
  onClick,
  ariaLabel = 'Schließen',
  title,
  className = '',
  id,
  size = 'md',
}) => {
  const isLg = size === 'lg';

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={`${
        isLg
          ? 'w-12 h-12 min-w-[48px] min-h-[48px]'
          : 'w-11 h-11 min-w-[44px] min-h-[44px]'
      } rounded-full flex items-center justify-center cursor-pointer touch-manipulation active:scale-95 transition-all ${className}`}
    >
      <span
        className={`${
          isLg ? 'w-12 h-12' : 'w-10 h-10'
        } rounded-full border border-border bg-card/90 hover:bg-card text-text-muted hover:text-text-main flex items-center justify-center transition-colors`}
      >
        <X className={`${isLg ? 'w-[22px] h-[22px]' : 'w-5 h-5'} stroke-[2]`} aria-hidden="true" />
      </span>
    </button>
  );
};

export default CloseButton;
