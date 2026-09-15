import React from 'react';
import { Clock, Play, Pause, RotateCcw, X, ArrowUpRight } from 'lucide-react';
import { CookingTimerState } from '../types';

interface CookingTimerBarProps {
  timer: CookingTimerState | null;
  onTogglePlay: () => void;
  onReset: () => void;
  onDismiss: () => void;
  onOpenCookingMode: () => void;
}

export const CookingTimerBar: React.FC<CookingTimerBarProps> = ({
  timer,
  onTogglePlay,
  onReset,
  onDismiss,
  onOpenCookingMode,
}) => {
  if (!timer) return null;

  const mins = Math.floor(timer.secondsLeft / 60);
  const secs = timer.secondsLeft % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const isFinished = timer.secondsLeft === 0;

  return (
    <div
      id="persistent-cooking-timer-bar"
      className="sticky top-14 sm:top-18 z-35 bg-[#2D3E40] text-white border-b border-[#3D5254] px-3 sm:px-6 py-2 shadow-md animate-in slide-in-from-top duration-200"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left info & time */}
        <div 
          onClick={onOpenCookingMode} 
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0"
          title="Klicken, um den Kochmodus zu öffnen"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            isFinished
              ? 'bg-amber-500 text-white animate-bounce'
              : timer.isRunning
              ? 'bg-[#4A7856] text-white animate-pulse'
              : 'bg-white/10 text-white/80'
          }`}>
            <Clock className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-mono font-bold tracking-wider text-white">
                {isFinished ? 'Fertig!' : timeFormatted}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md bg-white/10 text-[#8DB898] truncate hidden xs:inline">
                Schritt {timer.stepNumber}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-white/70 truncate max-w-[140px] sm:max-w-xs md:max-w-md group-hover:text-white transition-colors">
              {timer.recipeTitle}
            </p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onTogglePlay}
            className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer touch-manipulation active:scale-95 ${
              timer.isRunning
                ? 'bg-[#D35400] hover:bg-[#B94600] text-white'
                : 'bg-[#4A7856] hover:bg-[#3D6447] text-white'
            }`}
            title={timer.isRunning ? 'Timer pausieren' : 'Timer starten'}
          >
            {timer.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span className="hidden sm:inline">{timer.isRunning ? 'Pause' : 'Start'}</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-colors flex items-center justify-center cursor-pointer touch-manipulation active:scale-95"
            title="Timer zurücksetzen"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenCookingMode}
            className="min-h-[40px] px-3 sm:px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer touch-manipulation active:scale-95"
            title="Zum Kochmodus zurückkehren"
          >
            <span>Kochmodus</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="w-10 h-10 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors ml-0.5 flex items-center justify-center cursor-pointer touch-manipulation active:scale-95"
            title="Timer schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
