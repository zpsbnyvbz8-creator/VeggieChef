import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Plus, ThumbsUp, MessageSquare } from 'lucide-react';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';
import { RecipeReview } from '../types';
import {
  getReviewsForRecipe,
  toggleReviewHelpful,
  deleteReview,
  getHelpfulReviewsSet,
} from '../data/reviews';
import { ReviewCard } from '../components/reviews/ReviewCard';
import { WriteReviewSheet } from '../components/reviews/WriteReviewSheet';

const PAGE_SIZE = 10;

export const AllReviewsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes } = useRecipes();
  const { showToast } = useToast();

  const recipe = useMemo(() => recipes.find((r) => r.id === id), [recipes, id]);

  const [reviews, setReviews] = useState<RecipeReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'helpful'>('newest');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [helpfulSet, setHelpfulSet] = useState<Set<string>>(new Set());

  // Sheet state
  const [isWriteSheetOpen, setIsWriteSheetOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<RecipeReview | null>(null);

  // Load reviews on mount
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    const timer = setTimeout(() => {
      const loaded = getReviewsForRecipe(id);
      setReviews(loaded);
      setHelpfulSet(getHelpfulReviewsSet());
      setIsLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [id]);

  // Average & count calculation
  const { avgRating, totalCount } = useMemo(() => {
    if (reviews.length === 0) {
      return {
        avgRating: recipe?.rating || 0,
        totalCount: recipe?.reviewCount || 0,
      };
    }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      avgRating: sum / reviews.length,
      totalCount: Math.max(reviews.length, recipe?.reviewCount || reviews.length),
    };
  }, [reviews, recipe]);

  // Sorted reviews
  const sortedReviews = useMemo(() => {
    const list = [...reviews];
    if (sortBy === 'newest') {
      list.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      list.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0) || b.createdAt - a.createdAt);
    }
    return list;
  }, [reviews, sortBy]);

  const displayedReviews = useMemo(() => {
    return sortedReviews.slice(0, visibleCount);
  }, [sortedReviews, visibleCount]);

  const handleToggleHelpful = (reviewId: string) => {
    const res = toggleReviewHelpful(reviewId);
    setHelpfulSet((prev) => {
      const next = new Set(prev);
      if (res.isHelpful) next.add(reviewId);
      else next.delete(reviewId);
      return next;
    });
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, helpfulCount: res.helpfulCount } : r))
    );
  };

  const handleDeleteReview = (reviewId: string) => {
    deleteReview(reviewId);
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    showToast('Bewertung gelöscht');
  };

  const handleEditReview = (rev: RecipeReview) => {
    setEditingReview(rev);
    setIsWriteSheetOpen(true);
  };

  const handleReviewSuccess = (saved: RecipeReview) => {
    if (editingReview) {
      setReviews((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      showToast('Bewertung aktualisiert');
    } else {
      setReviews((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
      showToast('Bewertung veröffentlicht');
    }
    setEditingReview(null);
  };

  const handleBack = () => {
    if (id) {
      navigate(`/recipes/${id}`);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col pb-16">
      {/* Sticky Header mit Zurück-Button & Titel */}
      <header className="sticky top-0 z-40 bg-[var(--bg-page)]/90 backdrop-blur-md border-b border-border pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Zurück zum Rezept"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-border bg-card text-text-main hover:bg-surface flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold text-text-main truncate">
                {recipe?.title || 'Rezept'}
              </h1>
              <p className="text-xs text-text-muted">Alle Bewertungen</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingReview(null);
              setIsWriteSheetOpen(true);
            }}
            className="h-11 min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Bewertung schreiben</span>
            <span className="xs:hidden">Schreiben</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl w-full mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* Zusammenfassungskarte */}
        <section className="p-5 sm:p-6 rounded-3xl bg-card border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl sm:text-5xl font-black text-text-main tracking-tight">
              {avgRating.toFixed(1).replace('.', ',')}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1" aria-label={`${avgRating.toFixed(1)} von 5 Sternen`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(avgRating)
                        ? 'fill-[#E67E22] text-[#E67E22]'
                        : 'fill-border text-border'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs sm:text-sm text-text-muted font-medium">
                Basierend auf {totalCount} {totalCount === 1 ? 'Bewertung' : 'Bewertungen'}
              </span>
            </div>
          </div>

          {/* Sortierung Tabs */}
          <div className="flex items-center bg-surface p-1 rounded-xl border border-border shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSortBy('newest')}
              className={`h-10 min-h-[40px] px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                sortBy === 'newest'
                  ? 'bg-card text-text-main shadow-2xs'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Neueste
            </button>
            <button
              type="button"
              onClick={() => setSortBy('helpful')}
              className={`h-10 min-h-[40px] px-3.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                sortBy === 'helpful'
                  ? 'bg-card text-text-main shadow-2xs'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              Hilfreichste
            </button>
          </div>
        </section>

        {/* Bewertungen Liste */}
        {isLoading ? (
          /* Skeleton Loader */
          <div className="space-y-3" aria-busy="true" aria-label="Bewertungen laden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-card border border-border animate-pulse space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-28 bg-surface rounded-md" />
                    <div className="h-3 w-16 bg-surface rounded-md" />
                  </div>
                </div>
                <div className="h-4 w-24 bg-surface rounded-md" />
                <div className="h-12 w-full bg-surface rounded-md" />
              </div>
            ))}
          </div>
        ) : sortedReviews.length === 0 ? (
          /* Leerzustand */
          <div className="text-center py-16 px-4 space-y-4 rounded-3xl bg-card border border-border">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-tint text-accent flex items-center justify-center">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-lg font-bold text-text-main">Noch keine Bewertungen</h3>
              <p className="text-sm text-text-muted">
                Sei die erste Person, die dieses Rezept kocht und bewertet!
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingReview(null);
                setIsWriteSheetOpen(true);
              }}
              className="h-12 px-5 rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-bold text-sm inline-flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Jetzt bewerten
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                isHelpful={helpfulSet.has(review.id)}
                onToggleHelpful={handleToggleHelpful}
                onEdit={handleEditReview}
                onDelete={handleDeleteReview}
              />
            ))}

            {/* Mehr laden Button */}
            {visibleCount < sortedReviews.length && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="h-12 px-6 rounded-xl border border-border bg-card hover:bg-surface text-text-main font-bold text-sm transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  Mehr laden ({sortedReviews.length - visibleCount} weitere)
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bewertung schreiben Sheet */}
      {id && (
        <WriteReviewSheet
          isOpen={isWriteSheetOpen}
          onClose={() => {
            setIsWriteSheetOpen(false);
            setEditingReview(null);
          }}
          recipeId={id}
          initialReview={editingReview}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
};

export default AllReviewsPage;
