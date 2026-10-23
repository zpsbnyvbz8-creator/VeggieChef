import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star, ChefHat, ArrowRight, Calendar } from 'lucide-react';
import { RecipeImage } from './RecipeImage';
import { HeartButton } from './ui/HeartButton';
import { useRecipes } from '../context/RecipeContext';
import { usePlanner } from '../context/PlannerContext';
import { getRecipeDiet } from '../utils/discover';

const DIFFICULTY_LABEL: Record<string, string> = {
  Einfach: 'Einfach',
  Mittel: 'Mittel',
  Anspruchsvoll: 'Aufwendig',
};

/**
 * Dynamischer Hero-Slot:
 * - Ist für heute ein Gericht im Wochenplaner eingetragen, zeigt der Slot das geplante Gericht mit dem weißen Badge „Heute geplant“.
 * - Andernfalls zeigt er das reguläre „Tagesrezept“.
 * - Der primäre Button ist stets „Rezept ansehen (Pfeil)“.
 * - Kein Vegan-Badge.
 */
const DishOfTheDayComponent: React.FC = () => {
  const {
    dishOfTheDay: fallbackRecipe,
    recipes,
    favorites,
    toggleFavorite,
  } = useRecipes();

  const { activeWeek } = usePlanner();

  // Prüfen, ob für den heutigen Tag ein Rezept im aktiven Wochenplan eingeplant ist
  const todayPlannedInfo = useMemo(() => {
    if (!activeWeek?.days || activeWeek.days.length === 0) return null;

    const today = new Date();
    const jsDay = today.getDay(); // 0 = Sonntag, 1 = Montag, ...
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // 0 = Mo, ..., 6 = So
    const DAY_IDS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const todayId = DAY_IDS[dayIndex];

    const dayNumber = today.getDate().toString().padStart(2, '0');
    const monthNumber = (today.getMonth() + 1).toString().padStart(2, '0');
    const formattedDateStr = `${dayNumber}.${monthNumber}.`;

    // Passenden Tag per Datum ("23.10.") oder per Wochentag-ID ("thu") finden
    const todayDayPlan =
      activeWeek.days.find((d) => d.dateStr === formattedDateStr) ||
      activeWeek.days.find((d) => d.dayId === todayId);

    if (!todayDayPlan) return null;

    // Mittagessen oder Abendessen basierend auf der aktuellen Uhrzeit wählen
    const currentHour = today.getHours();
    let slot = null;
    let mealLabel = '';

    if (currentHour < 14 && todayDayPlan.lunch) {
      slot = todayDayPlan.lunch;
      mealLabel = 'Mittagessen';
    } else if (todayDayPlan.dinner) {
      slot = todayDayPlan.dinner;
      mealLabel = 'Abendessen';
    } else if (todayDayPlan.lunch) {
      slot = todayDayPlan.lunch;
      mealLabel = 'Mittagessen';
    }

    if (!slot) return null;

    // Vollständiges Rezeptobjekt ermitteln
    const plannedRecipe =
      recipes.find((r) => r.id === slot.recipeId) ||
      recipes.find((r) => r.title.toLowerCase() === slot.recipeTitle.toLowerCase());

    if (!plannedRecipe) return null;

    return {
      recipe: plannedRecipe,
      mealLabel,
    };
  }, [activeWeek, recipes]);

  const isPlannedToday = Boolean(todayPlannedInfo);
  const recipe = todayPlannedInfo?.recipe || fallbackRecipe;

  if (!recipe) return null;

  const isFavorite = favorites.includes(recipe.id);
  const detailPath = `/recipes/${recipe.id}`;
  const hasRating = recipe.rating > 0 && recipe.reviewCount > 0;
  const diet = getRecipeDiet(recipe);

  return (
    <section aria-labelledby="dish-of-the-day-title" id="dish-of-the-day-card">
      <article className="group relative isolate overflow-hidden rounded-3xl bg-text-main min-h-[320px] sm:min-h-[380px] lg:min-h-[420px] flex flex-col justify-end shadow-sm">
        {/* Photo */}
        <div className="absolute inset-0 -z-10">
          <RecipeImage
            recipe={recipe}
            size="hero"
            imgClassName="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            alt=""
          />
        </div>
        {/* Strong, bottom-weighted dark gradient for reliable white-text contrast */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />

        {/* Whole-hero click target (decorative duplicate of the CTA link) */}
        <Link to={detailPath} tabIndex={-1} aria-hidden="true" className="absolute inset-0 z-10" />

        {/* Top row: badge + favorite */}
        <div className="absolute top-3 sm:top-4 inset-x-3 sm:inset-x-4 z-20 flex items-start justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Weißer Badge (wie Tagesrezept): Entweder "Heute geplant" oder "Tagesrezept" */}
            {isPlannedToday ? (
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-card/95 backdrop-blur-xs text-text-main text-xs font-bold shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                <span>Heute geplant</span>
                {todayPlannedInfo?.mealLabel && (
                  <span className="opacity-70 font-normal hidden min-[400px]:inline">
                    • {todayPlannedInfo.mealLabel}
                  </span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center h-8 px-3 rounded-full bg-card/95 backdrop-blur-xs text-text-main text-xs font-bold shadow-xs">
                Tagesrezept
              </span>
            )}

            {/* Nur Vegetarisch-Badge anzeigen, kein Vegan-Badge */}
            {diet === 'vegetarisch' && (
              <span className="inline-flex items-center h-8 px-3 rounded-full bg-card/95 backdrop-blur-xs text-text-main text-xs font-bold shadow-xs">
                Vegetarisch
              </span>
            )}
          </div>
          <HeartButton
            id="dish-of-the-day-fav-btn"
            variant="on-image"
            isFavorite={isFavorite}
            onToggle={() => toggleFavorite(recipe.id)}
            ariaLabel={
              isFavorite
                ? `${recipe.title} aus Favoriten entfernen`
                : `${recipe.title} zu Favoriten hinzufügen`
            }
            className="pointer-events-auto"
          />
        </div>

        {/* Content */}
        <div className="relative z-20 p-4 sm:p-8 lg:p-10 max-w-2xl">
          <h2
            id="dish-of-the-day-title"
            className="text-[clamp(1.5rem,1vw+1.25rem,2.5rem)] font-extrabold tracking-tight text-on-accent leading-tight text-balance line-clamp-2"
          >
            {recipe.title}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-on-accent/95">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-on-accent/80" aria-hidden="true" />
              {recipe.totalTimeMinutes} Min.
            </span>
            {hasRating && (
              <span className="inline-flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-[#E67E22] text-[#E67E22]" aria-hidden="true" />
                {recipe.rating.toFixed(1).replace('.', ',')} ({recipe.reviewCount})
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-on-accent/80" aria-hidden="true" />
              {DIFFICULTY_LABEL[recipe.difficulty] ?? recipe.difficulty}
            </span>
          </div>

          {/* Primärer Button: Stets „Rezept ansehen“ mit Pfeil */}
          <Link
            id="dish-of-the-day-view-btn"
            to={detailPath}
            className="pointer-events-auto mt-5 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-bold text-base shadow-md transition-all active:scale-95 w-full sm:w-auto min-h-[48px]"
          >
            Rezept ansehen
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </section>
  );
};

export const DishOfTheDay = React.memo(DishOfTheDayComponent);
