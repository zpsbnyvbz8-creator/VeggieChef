import React, { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { CloseButton } from '../ui/CloseButton';
import { RecipeReview } from '../../types';
import { getUserAuthorName, saveReview } from '../../data/reviews';

export interface WriteReviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string;
  initialReview?: RecipeReview | null;
  onSuccess: (savedReview: RecipeReview) => void;
}

const STAR_LABELS: Record<number, string> = {
  1: 'Schlecht',
  2: 'Geht so',
  3: 'Gut',
  4: 'Sehr gut',
  5: 'Super!',
};

export const WriteReviewSheet: React.FC<WriteReviewSheetProps> = ({
  isOpen,
  onClose,
  recipeId,
  initialReview,
  onSuccess,
}) => {
  const [rating, setRating] = useState<number>(initialReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [text, setText] = useState<string>(initialReview?.text || '');
  const [authorName, setAuthorName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialReview) {
        setRating(initialReview.rating);
        setText(initialReview.text || '');
        setAuthorName(initialReview.authorName);
      } else {
        setRating(0);
        setText('');
        setAuthorName(getUserAuthorName());
      }
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, initialReview]);

  if (!isOpen) return null;

  const trimmedText = text.trim();
  const trimmedName = authorName.trim();
  const isTextTooShort = trimmedText.length > 0 && trimmedText.length < 10;
  const isSubmitDisabled = rating === 0 || !trimmedName || isTextTooShort || isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Simulate short network delay for seamless UX feedback
      await new Promise((resolve) => setTimeout(resolve, 200));

      const saved = saveReview({
        id: initialReview?.id,
        recipeId,
        rating,
        text: trimmedText || undefined,
        authorName: trimmedName,
      });

      onSuccess(saved);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDisplayRating = hoverRating || rating;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-review-title"
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl p-5 sm:p-6 flex flex-col gap-5 max-h-[90dvh] overflow-y-auto animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header mit Titel & CloseButton */}
        <div className="flex items-center justify-between border-b border-border pb-3.5 shrink-0">
          <h2 id="write-review-title" className="text-xl font-extrabold text-text-main">
            {initialReview ? 'Bewertung bearbeiten' : 'Bewertung schreiben'}
          </h2>
          <CloseButton onClick={onClose} ariaLabel="Schließen" size="md" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Sterne-Auswahl (Große 44px Buttons, Radiogroup) */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-semibold text-text-muted">Deine Gesamtbewertung</span>
            <div
              role="radiogroup"
              aria-label="Bewertung in Sternen"
              className="flex items-center justify-center gap-2"
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= currentDisplayRating;
                return (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={`${star} Stern${star > 1 ? 'e' : ''}: ${STAR_LABELS[star]}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                        setRating(Math.min(5, star + 1));
                      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                        setRating(Math.max(1, star - 1));
                      }
                    }}
                    className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-border hover:bg-surface transition-all cursor-pointer touch-manipulation active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-accent"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        isFilled
                          ? 'fill-[#E67E22] text-[#E67E22]'
                          : 'fill-transparent text-border'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-sm font-bold text-accent min-h-[1.25rem]">
              {currentDisplayRating > 0 ? STAR_LABELS[currentDisplayRating] : 'Tippe, um zu bewerten'}
            </span>
          </div>

          {/* Name Eingabefeld */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="review-author-name" className="text-xs sm:text-sm font-bold text-text-main">
              Dein Name
            </label>
            <input
              id="review-author-name"
              type="text"
              required
              maxLength={40}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="z. B. Sophie M."
              className="w-full h-11 min-h-[44px] px-3.5 rounded-xl border border-border bg-surface text-text-main placeholder:text-text-muted text-base focus:bg-card focus:outline-hidden focus:border-accent transition-colors"
            />
          </div>

          {/* Optionaler Text mit Zeichenzähler */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="review-text" className="text-xs sm:text-sm font-bold text-text-main">
                Deine Erfahrung <span className="font-normal text-text-muted">(optional)</span>
              </label>
              <span
                className={`text-xs ${
                  text.length > 480 ? 'text-favorite font-bold' : 'text-text-muted'
                }`}
              >
                {text.length} / 500
              </span>
            </div>
            <textarea
              id="review-text"
              rows={4}
              maxLength={500}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Was hat dir besonders geschmeckt? Hast du Zutaten variiert?"
              className="w-full p-3 rounded-xl border border-border bg-surface text-text-main placeholder:text-text-muted text-sm sm:text-base focus:bg-card focus:outline-hidden focus:border-accent transition-colors resize-none"
            />
            {isTextTooShort && (
              <p className="text-xs text-favorite font-medium">
                Wenn du einen Text schreibst, bitte mindestens 10 Zeichen eingeben.
              </p>
            )}
          </div>

          {/* Fehlermeldung */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-favorite/10 border border-favorite/25 text-favorite text-xs sm:text-sm font-medium">
              {errorMessage}
            </div>
          )}

          {/* Submit-Button */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full h-12 min-h-[48px] rounded-xl bg-accent hover:bg-accent-hover text-on-accent font-bold text-base flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Wird gespeichert...</span>
              </>
            ) : (
              <span>{initialReview ? 'Änderungen speichern' : 'Veröffentlichen'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
