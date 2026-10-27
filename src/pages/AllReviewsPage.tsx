import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Plus, ThumbsUp, MessageSquare, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRecipes } from '../context/RecipeContext';
import { useToast } from '../context/ToastContext';
import { RecipeReview } from '../types';
import {
  getReviewsForRecipe,
  toggleReviewHelpful,
  toggleReviewUnhelpful,
  deleteReview,
  getHelpfulReviewsSet,
  getUnhelpfulReviewsSet,
  getUserStarRating,
  removeUserStarRating,
  calculateRecipeRatingAndCount,
  FEATURE_COMMENTS_AND_REVIEWS_ENABLED,
} from '../data/reviews';
import { ReviewCard } from '../components/reviews/ReviewCard';
import { WriteReviewSheet } from '../components/reviews/WriteReviewSheet';
import { PrivateNoteCard } from '../components/reviews/PrivateNoteCard';
import { forceUnlockBodyScroll } from '../utils/useLockBodyScroll';

const PAGE_SIZE = 10;

export const AllReviewsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { recipes, updateRecipe } = useRecipes();
  const { showToast } = useToast();

  const recipe = useMemo(() => recipes.find((r) => r.id === id), [recipes, id]);

  const [reviews, setReviews] = useState<RecipeReview[]>([]);
  const [userStarRating, setUserStarRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'helpful'>('newest');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [helpfulSet, setHelpfulSet] = useState<Set<string>>(new Set());
  const [unhelpfulSet, setUnhelpfulSet] = useState<Set<string>>(new Set());

  // Private note state
  const [userNote, setUserNote] = useState<string>(recipe?.userNotes || '');
  const [noteUpdatedAt, setNoteUpdatedAt] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<string>(recipe?.userNotes || '');
  const [isEditingNote, setIsEditingNote] = useState(false);

  // Sheet state
  const [isWriteSheetOpen, setIsWriteSheetOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<RecipeReview | null>(null);

  // Safety unlock: Ensure page navigation or unmount leaves body scroll completely free
  useEffect(() => {
    return () => {
      forceUnlockBodyScroll();
    };
  }, []);

  // Load reviews & note on mount
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    const timer = setTimeout(() => {
      const loaded = getReviewsForRecipe(id);
      setReviews(loaded);
      setUserStarRating(getUserStarRating(id));
      setHelpfulSet(getHelpfulReviewsSet());
      setUnhelpfulSet(getUnhelpfulReviewsSet());

      try {
        const stored = localStorage.getItem(`veggiechef_note_${id}`);
        const storedDate = localStorage.getItem(`veggiechef_note_date_${id}`);
        if (stored !== null) {
          setUserNote(stored);
          setDraftNote(stored);
        } else if (recipe?.userNotes) {
          setUserNote(recipe.userNotes);
          setDraftNote(recipe.userNotes);
        }
        if (storedDate) {
          setNoteUpdatedAt(storedDate);
        }
      } catch {}

      setIsLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [id, recipe?.userNotes]);

  // Average & count calculation (single source of truth)
  const { avgRating, totalCount } = useMemo(() => {
    return calculateRecipeRatingAndCount(recipe, reviews, userStarRating);
  }, [recipe, reviews, userStarRating]);

  const syncRecipeRating = (newReviews: RecipeReview[], newStarRating: number | null) => {
    if (!recipe) return;
    const { avgRating: newAvg, totalCount: newCount } = calculateRecipeRatingAndCount(
      recipe,
      newReviews,
      newStarRating
    );
    const baseCount = recipe.baseReviewCount ?? recipe.reviewCount ?? 0;
    const baseRating = recipe.baseRating ?? recipe.rating ?? 5.0;
    updateRecipe({
      ...recipe,
      baseReviewCount: baseCount,
      baseRating: baseRating,
      rating: newAvg,
      reviewCount: newCount,
    });
  };

  // Only reviews with text count as public comments
  const textReviews = useMemo(() => {
    return reviews.filter((r) => r.text && r.text.trim().length > 0);
  }, [reviews]);

  // Sorted reviews
  const sortedReviews = useMemo(() => {
    const list = [...textReviews];
    if (sortBy === 'newest') {
      list.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      list.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0) || b.createdAt - a.createdAt);
    }
    return list;
  }, [textReviews, sortBy]);

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
    setUnhelpfulSet((prev) => {
      const next = new Set(prev);
      if (res.isUnhelpful) next.add(reviewId);
      else next.delete(reviewId);
      return next;
    });
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, helpfulCount: res.helpfulCount, unhelpfulCount: res.unhelpfulCount }
          : r
      )
    );
  };

  const handleToggleUnhelpful = (reviewId: string) => {
    const res = toggleReviewUnhelpful(reviewId);
    setHelpfulSet((prev) => {
      const next = new Set(prev);
      if (res.isHelpful) next.add(reviewId);
      else next.delete(reviewId);
      return next;
    });
    setUnhelpfulSet((prev) => {
      const next = new Set(prev);
      if (res.isUnhelpful) next.add(reviewId);
      else next.delete(reviewId);
      return next;
    });
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, helpfulCount: res.helpfulCount, unhelpfulCount: res.unhelpfulCount }
          : r
      )
    );
  };

  const handleDeleteReview = (reviewId: string) => {
    deleteReview(reviewId);
    const updated = reviews.filter((r) => r.id !== reviewId);
    setReviews(updated);
    syncRecipeRating(updated, userStarRating);
    showToast('Bewertung gelöscht');
  };

  const handleEditReview = (rev: RecipeReview) => {
    setEditingReview(rev);
    setIsWriteSheetOpen(true);
  };

  const handleReviewSuccess = (saved?: RecipeReview, isStarOnly?: boolean, ratingGiven?: number) => {
    if (isStarOnly) {
      const star = ratingGiven || 5;
      setUserStarRating(star);
      syncRecipeRating(reviews, star);
      showToast('Bewertung gespeichert!');
    } else if (saved) {
      setUserStarRating(null);
      let updated: RecipeReview[];
      if (editingReview) {
        updated = reviews.map((r) => (r.id === saved.id ? saved : r));
        showToast('Bewertung aktualisiert');
      } else {
        updated = [saved, ...reviews.filter((r) => r.id !== saved.id)];
        showToast('Bewertung veröffentlicht');
      }
      setReviews(updated);
      syncRecipeRating(updated, null);
    }
    setEditingReview(null);
  };

  const handleUndoStarRating = () => {
    if (!id || !recipe) return;
    removeUserStarRating(id);
    setUserStarRating(null);
    syncRecipeRating(reviews, null);
    showToast('Bewertung rückgängig gemacht');
  };

  const handleSaveNote = () => {
    if (!recipe || !id) return;
    const trimmed = draftNote.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    try {
      localStorage.setItem(`veggiechef_note_${id}`, trimmed);
      localStorage.setItem(`veggiechef_note_date_${id}`, now);
    } catch {}
    updateRecipe({
      ...recipe,
      userNotes: trimmed,
    });
    setUserNote(trimmed);
    setNoteUpdatedAt(now);
    setIsEditingNote(false);
    showToast('Notiz gespeichert!');
  };

  const handleDeleteNote = () => {
    if (!recipe || !id) return;
    try {
      localStorage.removeItem(`veggiechef_note_${id}`);
      localStorage.removeItem(`veggiechef_note_date_${id}`);
    } catch {}
    updateRecipe({
      ...recipe,
      userNotes: '',
    });
    setUserNote('');
    setDraftNote('');
    setNoteUpdatedAt(null);
    setIsEditingNote(false);
    showToast('Notiz gelöscht');
  };

  const handleBack = () => {
    if (id) {
      navigate(`/recipes/${id}`, { replace: true });
    } else {
      navigate('/');
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
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl border border-border bg-card text-text-main hover:bg-surface flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95 shrink-0"
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
            disabled={!FEATURE_COMMENTS_AND_REVIEWS_ENABLED}
            onClick={() => {
              if (!FEATURE_COMMENTS_AND_REVIEWS_ENABLED) return;
              setEditingReview(null);
              setIsWriteSheetOpen(true);
            }}
            className={`h-12 min-h-[48px] px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition-all shrink-0 ${
              !FEATURE_COMMENTS_AND_REVIEWS_ENABLED
                ? 'bg-surface border border-border text-text-muted opacity-40 cursor-not-allowed pointer-events-none'
                : 'bg-accent hover:bg-accent-hover text-on-accent active:scale-95 cursor-pointer'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Bewertung schreiben</span>
            <span className="xs:hidden">Schreiben</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={`max-w-3xl w-full mx-auto px-4 sm:px-6 pt-5 space-y-6 ${
        !FEATURE_COMMENTS_AND_REVIEWS_ENABLED ? 'opacity-40 grayscale-[70%] pointer-events-none select-none' : ''
      }`}>
        {!FEATURE_COMMENTS_AND_REVIEWS_ENABLED && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-border text-text-muted text-xs sm:text-sm font-medium">
            <span>Kommentare & Bewertungen</span>
            <span className="bg-card px-2.5 py-1 rounded-full border border-border">Derzeit nicht verfügbar</span>
          </div>
        )}
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

        {/* Angeheftete private Notiz: Immer ganz oben über allen Bewertungen */}
        {userNote.trim().length > 0 && (
          <div className="mb-4">
            <AnimatePresence mode="wait" initial={false}>
              {isEditingNote ? (
                <motion.div
                  key="note-edit-box"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-text-main">Meine Notiz bearbeiten</span>
                  </div>
                  <textarea
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    placeholder="Deine privaten Koch-Notizen..."
                    className="w-full bg-surface border border-border focus:border-accent text-base text-text-main rounded-xl p-3.5 min-h-[100px] placeholder:text-text-muted resize-y focus:outline-hidden transition-colors"
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <motion.button
                      layout
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={handleSaveNote}
                      disabled={!draftNote.trim() || draftNote.trim() === userNote.trim()}
                      className={`h-11 min-h-[44px] px-5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 ${
                        draftNote.trim() && draftNote.trim() !== userNote.trim()
                          ? 'bg-accent hover:bg-accent-hover text-on-accent active:scale-95 cursor-pointer shadow-xs'
                          : 'bg-surface border border-border text-text-muted opacity-40 cursor-not-allowed pointer-events-none'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Notiz</span>
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="note-card-view"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <PrivateNoteCard
                    note={userNote}
                    updatedAt={noteUpdatedAt}
                    isPinnedInReviews={true}
                    onEdit={() => {
                      setDraftNote(userNote);
                      setIsEditingNote(true);
                    }}
                    onDelete={handleDeleteNote}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Eigene reine Sterne-Bewertung (ohne Textkommentar) mit Rückgängig-Button */}
        {userStarRating !== null && !textReviews.some((r) => r.isOwn) && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-accent/30 bg-accent-tint/30 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-accent text-on-accent flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 fill-current" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-bold text-text-main">
                    Deine Bewertung: {userStarRating} von 5 Sternen
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0" aria-label={`${userStarRating} von 5 Sternen`}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= userStarRating
                            ? 'fill-[#E67E22] text-[#E67E22]'
                            : 'fill-border text-border'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Einfluss in die Gesamtwertung erfasst (ohne Kommentar).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUndoStarRating}
              aria-label="Bewertung rückgängig machen"
              className="h-11 min-h-[44px] px-3.5 sm:px-4 rounded-xl border border-border bg-surface hover:bg-card text-text-main font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer touch-manipulation shrink-0 shadow-2xs"
            >
              <RotateCcw className="w-4 h-4 text-[#C0392B]" />
              <span>Rückgängig machen</span>
            </button>
          </div>
        )}

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
              <h3 className="text-lg font-bold text-text-main">
                {userStarRating !== null ? 'Noch keine schriftlichen Kommentare' : 'Noch keine Bewertungen'}
              </h3>
              <p className="text-sm text-text-muted">
                {userStarRating !== null
                  ? 'Deine Sterne-Bewertung ist oben erfasst. Du kannst jederzeit noch einen schriftlichen Kommentar hinzufügen!'
                  : 'Sei die erste Person, die dieses Rezept kocht und bewertet!'}
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
                isUnhelpful={unhelpfulSet.has(review.id)}
                onToggleHelpful={handleToggleHelpful}
                onToggleUnhelpful={handleToggleUnhelpful}
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
