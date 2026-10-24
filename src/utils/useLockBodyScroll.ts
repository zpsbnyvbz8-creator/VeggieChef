import { useEffect } from 'react';

let lockCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalBodyOverscroll = '';
let originalHtmlOverscroll = '';
let originalBodyPaddingRight = '';

export function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    originalHtmlOverflow = document.documentElement.style.overflow;
    originalBodyOverscroll = document.body.style.overscrollBehavior;
    originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    originalBodyPaddingRight = document.body.style.paddingRight;

    // Prevent horizontal shift by compensating scrollbar width
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
  }
  lockCount++;
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.overscrollBehavior = '';
    document.documentElement.style.overscrollBehavior = '';
    document.body.style.paddingRight = '';
    document.body.style.touchAction = '';
  }
}

export function forceUnlockBodyScroll() {
  if (typeof document === 'undefined') return;
  lockCount = 0;
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  document.body.style.overscrollBehavior = '';
  document.documentElement.style.overscrollBehavior = '';
  document.body.style.paddingRight = '';
  document.body.style.touchAction = '';
}

export function useLockBodyScroll(isLocked: boolean = true) {
  useEffect(() => {
    if (!isLocked) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
}
