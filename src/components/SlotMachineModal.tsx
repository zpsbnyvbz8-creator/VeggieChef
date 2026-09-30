import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Sparkles, 
  Dices, 
  Clock, 
  Flame, 
  Dumbbell, 
  ArrowRight,
  Heart
} from 'lucide-react';
import { Recipe } from '../types';
import { useRecipes } from '../context/RecipeContext';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';
import confetti from 'canvas-confetti';

interface SlotMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_REEL = [
  { icon: '🍝', label: 'Pasta & Gnocchi' },
  { icon: '🍛', label: 'Currys & Eintöpfe' },
  { icon: '🥗', label: 'Bowls & Salate' },
  { icon: '🍕', label: 'Ofengerichte' },
  { icon: '🍔', label: 'Schnelle Küche' },
  { icon: '🥞', label: 'Süßes & Frühstück' },
  { icon: '🍄', label: 'Herbst-Liebling' },
  { icon: '🥑', label: 'High Protein' },
];

const TIME_REEL = [
  { icon: '⚡', label: 'Express (<20 Min.)' },
  { icon: '⏱️', label: 'Entspannt (25-35 Min.)' },
  { icon: '🍲', label: 'Schmorig (40+ Min.)' },
  { icon: '✨', label: 'Perfekter Feierabend' },
  { icon: '🌟', label: 'Wochenend-Genuss' },
];

/**
 * Gentle Web Audio synthesizer for mechanical slot clicks and winning jingles
 */
function playSlotSound(type: 'click' | 'stop' | 'win') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320 + Math.random() * 80, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'stop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.25);
      });
    }
  } catch {
    // Audio context may be restricted or unsupported; silent fallback
  }
}

export const SlotMachineModal: React.FC<SlotMachineModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { filteredRecipes, recipes, favorites, toggleFavorite } = useRecipes();
  useLockBodyScroll(isOpen);

  // Slot states
  const [isSpinning, setIsSpinning] = useState(false);
  const [reel1Index, setReel1Index] = useState(0);
  const [reel2Index, setReel2Index] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [hasSpunAtLeastOnce, setHasSpunAtLeastOnce] = useState(false);

  const animationFrameRef = useRef<number | null>(null);

  // Pool of recipes
  const candidateRecipes = filteredRecipes.length > 0 ? filteredRecipes : recipes;

  // Spin the slot machine
  const handleSpin = () => {
    if (isSpinning || candidateRecipes.length === 0) return;

    setIsSpinning(true);
    setHasSpunAtLeastOnce(true);
    setSelectedRecipe(null);

    // Pick winning recipe
    const randomIndex = Math.floor(Math.random() * candidateRecipes.length);
    const targetRecipe = candidateRecipes[randomIndex];

    // Pick corresponding reels based on target recipe
    const matchingCatIdx = CATEGORY_REEL.findIndex((c) => c.label.includes(targetRecipe.category) || targetRecipe.category.includes(c.label));
    const targetReel1 = matchingCatIdx !== -1 ? matchingCatIdx : Math.floor(Math.random() * CATEGORY_REEL.length);
    const targetReel2 = targetRecipe.totalTimeMinutes <= 25 ? 0 : targetRecipe.totalTimeMinutes <= 40 ? 1 : 2;

    const startTime = performance.now();
    const duration = 2400; // 2.4 seconds total spin

    let lastSoundTime = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;

      // Click sound at steady intervals that slow down
      if (currentTime - lastSoundTime > 90 + (elapsed / duration) * 150) {
        playSlotSound('click');
        lastSoundTime = currentTime;
      }

      // Fast random cycling
      if (elapsed < 1200) {
        setReel1Index(Math.floor(Math.random() * CATEGORY_REEL.length));
      } else {
        setReel1Index(targetReel1);
      }

      if (elapsed < 1700) {
        setReel2Index(Math.floor(Math.random() * TIME_REEL.length));
      } else {
        setReel2Index(targetReel2);
      }

      if (elapsed < duration) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Finished spinning!
        setReel1Index(targetReel1);
        setReel2Index(targetReel2);
        setSelectedRecipe(targetRecipe);
        setIsSpinning(false);
        playSlotSound('win');

        // Confetti burst
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4A7856', '#C86D3B', '#E67E22', '#F1F5F2']
        });
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Auto spin once when modal is first opened
  useEffect(() => {
    if (isOpen && !hasSpunAtLeastOnce) {
      handleSpin();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#FAF9F6] border border-[#ECEBE8] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-[#2D3E40] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3D6447] via-[#4A7856] to-[#2D3E40] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-2xl shadow-inner">
              🎰
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Überraschungs-Kochautomat
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Überrasch mich!
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slot Machine Main Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* 3 Slot Reels Container */}
          <div className="bg-[#243335] p-3 sm:p-4 rounded-2xl border-4 border-[#3D6447]/60 shadow-inner grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Reel 1: Category */}
            <div className="bg-[#1A2627] rounded-xl p-3 sm:p-4 text-center border border-white/10 flex flex-col items-center justify-center min-h-[100px] overflow-hidden relative shadow-sm">
              <span className="text-xs uppercase font-bold tracking-wider text-[#8DB898] mb-1">
                Kategorie
              </span>
              <div className={`transition-transform duration-100 flex flex-col items-center ${isSpinning ? 'animate-pulse' : ''}`}>
                <span className="text-3xl sm:text-4xl mb-1">
                  {CATEGORY_REEL[reel1Index].icon}
                </span>
                <span className="text-xs sm:text-sm font-bold text-white text-center leading-tight">
                  {CATEGORY_REEL[reel1Index].label}
                </span>
              </div>
            </div>

            {/* Reel 2: Time */}
            <div className="bg-[#1A2627] rounded-xl p-3 sm:p-4 text-center border border-white/10 flex flex-col items-center justify-center min-h-[100px] overflow-hidden relative shadow-sm">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-300 mb-1">
                Zubereitung
              </span>
              <div className={`transition-transform duration-100 flex flex-col items-center ${isSpinning ? 'animate-pulse' : ''}`}>
                <span className="text-3xl sm:text-4xl mb-1">
                  {TIME_REEL[reel2Index].icon}
                </span>
                <span className="text-xs sm:text-sm font-bold text-white text-center leading-tight">
                  {TIME_REEL[reel2Index].label}
                </span>
              </div>
            </div>
          </div>

          {/* Winning Recipe Card Presentation */}
          {selectedRecipe ? (
            <div className="bg-white rounded-2xl border-2 border-[#4A7856] p-3.5 sm:p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
              <div className="relative w-full sm:w-32 h-32 rounded-xl overflow-hidden shrink-0 bg-[#F1F5F2]">
                <img
                  src={selectedRecipe.image}
                  alt={selectedRecipe.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold">
                  {selectedRecipe.isVegan ? '🌱 Vegan' : '🧀 Veggie'}
                </span>
              </div>

              <div className="flex-1 w-full text-left">
                <div className="flex items-center gap-1.5 text-xs text-[#C86D3B] font-bold">
                  <span>✨ DEIN MATCH GEFUNDEN!</span>
                </div>
                <h4 className="text-lg font-bold text-[#2D3E40] leading-snug line-clamp-1 mt-0.5">
                  {selectedRecipe.title}
                </h4>
                <p className="text-xs text-[#686E6A] line-clamp-2 mt-0.5">
                  {selectedRecipe.subtitle}
                </p>

                <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-[#57534d]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#4A7856]" />
                    {selectedRecipe.totalTimeMinutes} Min.
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    {selectedRecipe.nutrients.calories} kcal
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                    {selectedRecipe.nutrients.protein}g Protein
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#FAF9F6] border border-dashed border-[#ECEBE8] rounded-2xl p-6 text-center text-[#686E6A]">
              <div className="w-10 h-10 rounded-full border-2 border-[#ECEBE8] border-t-[#4A7856] animate-spin mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#2D3E40]">Die Walzen rotieren...</p>
              <p className="text-xs text-[#686E6A]">Finde dein perfektes Überraschungsgericht</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {selectedRecipe && !isSpinning && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/recipes/${selectedRecipe.id}`);
                }}
                className="w-full h-12 min-h-[48px] rounded-xl bg-[#4A7856] hover:bg-[#3D6447] text-white font-bold text-base flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
              >
                <span>Rezept jetzt kochen</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={isSpinning}
                onClick={handleSpin}
                className="flex-1 h-12 min-h-[48px] rounded-xl bg-[#FAF9F6] hover:bg-[#F1F5F2] border border-[#ECEBE8] hover:border-[#4A7856]/40 text-[#2D3E40] font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Dices className={`w-5 h-5 text-[#4A7856] ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'Dreht...' : 'Nochmal drehen 🎲'}</span>
              </button>

              {selectedRecipe && (
                <button
                  type="button"
                  onClick={() => toggleFavorite(selectedRecipe.id)}
                  className={`h-12 min-h-[48px] px-4 rounded-xl border flex items-center justify-center gap-1.5 text-sm font-semibold transition-all cursor-pointer ${
                    favorites.includes(selectedRecipe.id)
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-white border-[#ECEBE8] text-[#686E6A] hover:text-rose-500'
                  }`}
                  title="Merken"
                >
                  <Heart className={`w-4 h-4 ${favorites.includes(selectedRecipe.id) ? 'fill-current text-rose-600' : ''}`} />
                  <span className="hidden sm:inline">Merken</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
