import React, { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { RecipeReview } from '../../types';
import { formatRelativeDate, getAvatarColor, getInitials } from '../../data/reviews';

export interface ReviewCardProps {
  review: RecipeReview;
  isHelpful?: boolean;
  isUnhelpful?: boolean;
  onToggleHelpful?: (reviewId: string) => void;
  onToggleUnhelpful?: (reviewId: string) => void;
  onEdit?: (review: RecipeReview) => void;
  onDelete?: (reviewId: string) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  isHelpful = false,
  isUnhelpful = false,
  onToggleHelpful,
  onToggleUnhelpful,
  onEdit,
  onDelete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const avatarColor = getAvatarColor(review.authorName);
  const initials = getInitials(review.authorName);
  const relativeDate = formatRelativeDate(review.createdAt);

  const textLength = review.text?.length || 0;
  const isLongText = textLength > 200;

  return (
    <article className="px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-2xl bg-card border border-border shadow-2xs flex flex-col gap-2 relative transition-colors">
      {/* Header: Avatar, Name, Sterne, Datum, Label & Menü */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${avatarColor}`}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-text-main text-sm sm:text-base leading-tight truncate">
                {review.authorName}
              </span>
              {/* Sterne kompakt direkt neben dem Namen */}
              <div className="flex items-center gap-0.5 shrink-0" aria-label={`${review.rating} von 5 Sternen`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= review.rating
                        ? 'fill-[#E67E22] text-[#E67E22]'
                        : 'fill-border text-border'
                    }`}
                  />
                ))}
              </div>
              {review.isOwn && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-tint text-accent border border-accent/25">
                  Deine Bewertung
                </span>
              )}
            </div>
            <time className="text-xs text-text-muted mt-0.5 block">{relativeDate}</time>
          </div>
        </div>

        {/* Eigene Bewertung Aktionen */}
        {review.isOwn && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              aria-label="Bewertungsoptionen"
              aria-expanded={showMenu}
              className="w-12 h-12 min-w-[48px] min-h-[48px] -mr-1 -mt-1 rounded-xl flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface transition-colors cursor-pointer"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-12 z-20 w-36 rounded-xl bg-card border border-border shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(review);
                    }}
                    className="w-full px-3 py-2 text-left text-xs sm:text-sm font-medium text-text-main hover:bg-surface flex items-center gap-2 cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 text-accent" /> Bearbeiten
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full px-3 py-2 text-left text-xs sm:text-sm font-medium text-favorite hover:bg-surface flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-favorite" /> Löschen
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Text (16px Fließtext gemäß Vorgabe, max. 4 Zeilen) */}
      {review.text && (
        <div className="text-base text-text-main leading-relaxed">
          <p className={!isExpanded && isLongText ? 'line-clamp-4' : ''}>
            {review.text}
          </p>
          {isLongText && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="mt-1 text-xs font-semibold text-accent hover:underline cursor-pointer"
            >
              {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
            </button>
          )}
        </div>
      )}

      {/* Footer: Daumen nach oben & Daumen nach unten (nur Symbole ohne Boxen, kompakt) */}
      <div className="flex items-center gap-1 pt-1 border-t border-border/50 -mb-1">
        <button
          type="button"
          onClick={() => onToggleHelpful?.(review.id)}
          aria-pressed={isHelpful}
          aria-label={`${review.helpfulCount || 0} Daumen nach oben`}
          className={`min-h-[44px] sm:min-h-[48px] px-2 py-1.5 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer touch-manipulation active:scale-95 ${
            isHelpful
              ? 'text-accent font-bold'
              : 'text-text-muted hover:text-text-main hover:bg-surface/50'
          }`}
        >
          <ThumbsUp className={`w-4 h-4 transition-transform ${isHelpful ? 'fill-current stroke-accent scale-110' : ''}`} />
          <span className="tabular-nums">({review.helpfulCount || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleUnhelpful?.(review.id)}
          aria-pressed={isUnhelpful}
          aria-label={`${review.unhelpfulCount || 0} Daumen nach unten`}
          className={`min-h-[44px] sm:min-h-[48px] px-2 py-1.5 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer touch-manipulation active:scale-95 ${
            isUnhelpful
              ? 'text-[#C0392B] font-bold'
              : 'text-text-muted hover:text-text-main hover:bg-surface/50'
          }`}
        >
          <ThumbsDown className={`w-4 h-4 transition-transform ${isUnhelpful ? 'fill-current stroke-[#C0392B] scale-110' : ''}`} />
          <span className="tabular-nums">({review.unhelpfulCount || 0})</span>
        </button>
      </div>

      {/* Inline-Löschbestätigung */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-card/95 backdrop-blur-xs rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3 z-30 animate-in fade-in duration-150">
          <p className="text-sm font-bold text-text-main">
            Bewertung wirklich löschen?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete?.(review.id);
              }}
              className="h-11 min-h-[44px] px-4 rounded-xl bg-favorite text-white text-xs sm:text-sm font-bold shadow-xs hover:bg-favorite/90 transition-colors cursor-pointer"
            >
              Ja, löschen
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="h-11 min-h-[44px] px-4 rounded-xl bg-surface border border-border text-text-main text-xs sm:text-sm font-semibold hover:bg-card transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </article>
  );
};
