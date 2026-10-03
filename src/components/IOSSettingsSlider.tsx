import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface IOSSettingsSliderProps {
  /** Current value of the slider */
  value: number;
  /** Callback fired when the value changes */
  onChange: (value: number) => void;
  /** Minimum value (default: 0) */
  min?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Step increment (default: 1, pass 0 for continuous) */
  step?: number;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** ID for form/label associations */
  id?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Optional icon or element placed before the slider (e.g. low brightness/volume) */
  leftIcon?: React.ReactNode;
  /** Optional icon or element placed after the slider (e.g. high brightness/volume) */
  rightIcon?: React.ReactNode;
  /** Custom active track color (CSS color or CSS variable name). Defaults to app primary (#4A7856) */
  trackActiveColor?: string;
  /** Custom unfilled track background color. Defaults to #E2E8F0 / #ECEBE8 */
  trackInactiveColor?: string;
  /** Custom thumb color. Defaults to crisp white (#FFFFFF) */
  thumbColor?: string;
  /** Optional extra classes for the outer container */
  className?: string;
}

/**
 * Standard iOS Settings Slider Component
 *
 * Implements Apple Human Interface Guidelines:
 * - 4px slim track with active fill and semi-transparent inactive track
 * - 28px circular thumb with subtle soft drop shadow (0 3px 8px rgba(0,0,0,0.15))
 * - Expands to 30px on press/active micro-interaction
 * - 44px+ touch hitbox ensuring the thumb never slips off while dragging
 * - Full keyboard navigation (Arrows, PageUp/Down, Home, End) and ARIA slider semantics
 * - Customizable theme tokens via props or CSS variables
 */
export const IOSSettingsSlider: React.FC<IOSSettingsSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  ariaLabel = 'Schieberegler',
  id,
  disabled = false,
  leftIcon,
  rightIcon,
  trackActiveColor = '#4A7856',
  trackInactiveColor = '#ECEBE8',
  thumbColor = '#FFFFFF',
  className = '',
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Clamp value between min and max
  const clampedValue = Math.min(Math.max(value, min), max);
  const percentage = max > min ? ((clampedValue - min) / (max - min)) * 100 : 0;

  // Calculate new value from pointer position
  const calculateValueFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const trackWidth = rect.width;
      if (trackWidth <= 0) return;

      const offsetX = clientX - rect.left;
      const ratio = Math.min(Math.max(offsetX / trackWidth, 0), 1);
      let rawVal = min + ratio * (max - min);

      if (step > 0) {
        const steppedVal = Math.round((rawVal - min) / step) * step + min;
        rawVal = Math.min(Math.max(steppedVal, min), max);
      }

      onChange(rawVal);
    },
    [min, max, step, onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    setIsPressed(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    calculateValueFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPressed || disabled) return;
    calculateValueFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    setIsPressed(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture was already released
    }
  };

  const handlePointerCancel = () => {
    setIsPressed(false);
  };

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const currentStep = step > 0 ? step : (max - min) / 100;
    const bigStep = currentStep * 5;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        onChange(Math.min(max, clampedValue + currentStep));
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        onChange(Math.max(min, clampedValue - currentStep));
        break;
      case 'PageUp':
        e.preventDefault();
        onChange(Math.min(max, clampedValue + bigStep));
        break;
      case 'PageDown':
        e.preventDefault();
        onChange(Math.max(min, clampedValue - bigStep));
        break;
      case 'Home':
        e.preventDefault();
        onChange(min);
        break;
      case 'End':
        e.preventDefault();
        onChange(max);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={`flex items-center gap-3 w-full select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      style={
        {
          '--ios-slider-active': trackActiveColor,
          '--ios-slider-inactive': trackInactiveColor,
          '--ios-slider-thumb': thumbColor,
        } as React.CSSProperties
      }
    >
      {/* Optional Left Icon Slot */}
      {leftIcon && (
        <div className="shrink-0 text-[#8A918D] flex items-center justify-center">
          {leftIcon}
        </div>
      )}

      {/* Slider Interactive Track & Touch Zone (44px Minimum Hit Area) */}
      <div
        id={id}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clampedValue}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="relative flex-1 flex items-center h-11 min-h-[44px] cursor-pointer touch-none outline-none focus-visible:ring-2 focus-visible:ring-[#4A7856]/40 rounded-full"
      >
        {/* 4px Horizontal Track Line */}
        <div
          ref={trackRef}
          className="relative w-full h-[4px] rounded-full overflow-hidden transition-colors"
          style={{ backgroundColor: 'var(--ios-slider-inactive, #ECEBE8)' }}
        >
          {/* Active Track Fill (Left to Thumb) */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full transition-[width] duration-75 ease-out"
            style={{
              width: `${percentage}%`,
              backgroundColor: 'var(--ios-slider-active, #4A7856)',
            }}
          />
        </div>

        {/* Thumb (28px standard, expanding to 30px when pressed) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-transform duration-150 ease-out will-change-transform flex items-center justify-center"
          style={{
            left: `${percentage}%`,
            width: isPressed ? '30px' : '28px',
            height: isPressed ? '30px' : '28px',
            borderRadius: '9999px',
            backgroundColor: 'var(--ios-slider-thumb, #FFFFFF)',
            boxShadow: isPressed
              ? '0 4px 12px rgba(0, 0, 0, 0.20), 0 1px 3px rgba(0, 0, 0, 0.08)'
              : '0 3px 8px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.06)',
            transform: `translate(-50%, -50%) scale(${isPressed ? 1.07 : 1})`,
          }}
        >
          {/* Subtle inner ring border for extra iOS depth on light/white surfaces */}
          <div className="w-full h-full rounded-full border border-black/5" />
        </div>
      </div>

      {/* Optional Right Icon Slot */}
      {rightIcon && (
        <div className="shrink-0 text-[#8A918D] flex items-center justify-center">
          {rightIcon}
        </div>
      )}
    </div>
  );
};
