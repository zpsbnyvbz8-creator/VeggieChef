import React from 'react';
import { CloseButton } from './CloseButton';

export interface SheetHeaderProps {
  title: React.ReactNode;
  onClose: () => void;
  closeAriaLabel?: string;
  subtitle?: React.ReactNode;
  className?: string;
  titleId?: string;
}

export const SheetHeader: React.FC<SheetHeaderProps> = ({
  title,
  onClose,
  closeAriaLabel,
  subtitle,
  className = '',
  titleId,
}) => {
  return (
    <div
      className={`flex ${subtitle ? 'items-start' : 'items-center'} justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3 ${className}`}
    >
      <div className="min-w-0 flex-1">
        {typeof title === 'string' ? (
          <h2 id={titleId} className="text-xl font-extrabold tracking-tight text-text-main">
            {title}
          </h2>
        ) : (
          title
        )}
        {subtitle && (
          <div className="mt-0.5 text-sm text-text-muted">
            {subtitle}
          </div>
        )}
      </div>
      <CloseButton
        onClick={() => onClose()}
        ariaLabel={closeAriaLabel}
        className="-mr-2 shrink-0"
      />
    </div>
  );
};

export default SheetHeader;
