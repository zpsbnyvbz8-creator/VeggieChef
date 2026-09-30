import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Sparkles, 
  Heart,
  Flame,
  Dumbbell
} from 'lucide-react';
import { Recipe } from '../types';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';

interface SeasonHighlightsProps {
  onSelectRecipe?: (recipe: Recipe) => void;
}

export const SeasonHighlights: React.FC<SeasonHighlightsProps> = () => {
  const navigate = useNavigate();
  const { recipes, favorites, toggleFavorite } = useRecipes();
  const { showToast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Autumn ingredients & season filters
  const autumnRecipes = React.useMemo(() => {
    return recipes.filter((r) => {
      if (r.season === 'Herbst') return true;
      const titleLower = r.title.toLowerCase();
      const subLower = (r.subtitle || '').toLowerCase();
      const tagsStr = (r.tags || []).join(' ').toLowerCase();
      const ingsStr = (r.ingredients || []).map((i) => i.name).join(' ').toLowerCase();
      const combined = `${titleLower} ${subLower} ${tagsStr} ${ingsStr}`;
      
      return (
        combined.includes('kürbis') ||
        combined.includes('pilz') ||
        combined.includes('apfel') ||
        combined.includes('marone') ||
        combined.includes('steinpilz') ||
        combined.includes('champignon') ||
        combined.includes('shiitake') ||
        combined.includes('walnuss') ||
        combined.includes('rote bete') ||
        combined.includes('wirsing')
      );
    });
  }, [recipes]);

  if (autumnRecipes.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const cardWidth = 320;
    const scrollAmount = direction === 'left' ? -cardWidth * 1.5 : cardWidth * 1.5;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const getSeasonalBadge = (recipe: Recipe): { icon: string; text: string } => {
    const text = `${recipe.title} ${recipe.subtitle || ''} ${(recipe.tags || []).join(' ')}`.toLowerCase();
    if (text.includes('kürbis')) return { icon: '🎃', text: 'Kürbis-Saison' };
    if (text.includes('pilz') || text.includes('steinpilz')) return { icon: '🍄', text: 'Waldpilze' };
    if (text.includes('apfel')) return { icon: '🍏', text: 'Herbstapfel' };
    if (text.includes('marone') || text.includes('walnuss')) return { icon: '🌰', text: 'Nuss & Marone' };
    return { icon: '🍂', text: 'Herbst-Liebling' };
  };

  return (
    <section className="bg-gradient-to-br from-[#FFF9F3] via-[#FAF6EE] to-[#F5EFE6] border border-[#EADBCE] rounded-3xl p-4 sm:p-6 shadow-xs relative overflow-hidden">
      {/* Decorative leaf motifs */}
      <div className="absolute -top-6 -right-6 text-6xl opacity-10 pointer-events-none select-none">
        🍂
      </div>
      <div className="absolute -bottom-6 -left-6 text-5xl opacity-10 pointer-events-none select-none">
        🎃
      </div>

      {/* Header with Title and Scroll Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#E07A5F]/15 text-[#C86D3B] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#E07A5F]/30">
              <Sparkles className="w-3.5 h-3.5 text-[#C86D3B]" />
              Saison-Highlight • Goldener Herbst
            </span>
            <span className="text-xs font-semibold text-[#8C7A6B]">
              {autumnRecipes.length} Rezepte
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2D3E40] tracking-tight mt-1 leading-snug">
            Erntefrisch: Kürbis, Waldpilze & Äpfel
          </h2>
          <p className="text-sm sm:text-base text-[#686E6A] leading-relaxed mt-0.5">
            Wärmende Wohlfühlgerichte mit saisonalen Zutaten – jetzt im Spätsommer & Herbst mit bestem Geschmack.
          </p>
        </div>

        {/* Carousel Scroll Buttons */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="w-11 h-11 min-h-[44px] rounded-xl bg-white hover:bg-[#F2ECE4] border border-[#EADBCE] text-[#2D3E40] flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="Vorherige Saison-Rezepte"
            title="Zurück"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="w-11 h-11 min-h-[44px] rounded-xl bg-white hover:bg-[#F2ECE4] border border-[#EADBCE] text-[#2D3E40] flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="Nächste Saison-Rezepte"
            title="Weiter"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel Track with snap scrolling */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none overscroll-x-contain"
        tabIndex={0}
        aria-label="Saison-Rezepte Karussell"
      >
        {autumnRecipes.map((recipe) => {
          const isFav = favorites.includes(recipe.id);
          const badge = getSeasonalBadge(recipe);

          return (
            <div
              key={`season-${recipe.id}`}
              onClick={() => navigate(`/recipes/${recipe.id}`)}
              className="group relative flex-none w-[280px] sm:w-[320px] bg-white rounded-2xl border border-[#EADBCE] hover:border-[#C86D3B]/50 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer snap-start flex flex-col"
            >
              {/* Image & Badges */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#FAF9F6]">
                <img
                  src={recipe.image}
                  alt={recipe.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                {/* Seasonal Badge */}
                <div className="absolute top-2.5 left-2.5">
                  <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[#C86D3B] text-xs font-bold shadow-xs border border-[#C86D3B]/30 flex items-center gap-1">
                    <span>{badge.icon}</span>
                    <span>{badge.text}</span>
                  </span>
                </div>

                {/* Favorite Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(recipe.id);
                  }}
                  className={`absolute top-2.5 right-2.5 w-10 h-10 min-h-[40px] rounded-xl flex items-center justify-center transition-all backdrop-blur-xs shadow-xs cursor-pointer active:scale-90 ${
                    isFav
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-white/90 text-[#686E6A] hover:text-rose-500 hover:bg-white'
                  }`}
                  aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                  title={isFav ? 'Favorit' : 'Merken'}
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-current text-rose-600' : ''}`} />
                </button>

                {/* Quick Info bar over image bottom */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs font-medium drop-shadow-sm">
                  <span className="px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-xs">
                    {recipe.isVegan ? '🌱 Vegan' : '🧀 Vegetarisch'}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    <span>{recipe.totalTimeMinutes} Min.</span>
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#2D3E40] group-hover:text-[#C86D3B] transition-colors line-clamp-1 leading-snug">
                    {recipe.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#686E6A] line-clamp-2 mt-1 leading-relaxed">
                    {recipe.subtitle}
                  </p>
                </div>

                {/* Nutrients & Link footer */}
                <div className="pt-3 mt-3 border-t border-[#ECEBE8] flex items-center justify-between text-xs text-[#686E6A]">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1 text-[#E67E22] font-semibold">
                      <Flame className="w-3.5 h-3.5" />
                      {recipe.nutrients.calories} kcal
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#4A7856] font-semibold">
                      <Dumbbell className="w-3.5 h-3.5" />
                      {recipe.nutrients.protein}g Protein
                    </span>
                  </div>
                  <span className="text-[#C86D3B] font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Rezept ansehen →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
